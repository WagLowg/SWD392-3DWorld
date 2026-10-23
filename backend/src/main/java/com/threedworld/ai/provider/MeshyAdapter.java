package com.threedworld.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.threedworld.common.AppProperties;
import com.threedworld.common.Json;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

/** Meshy Open API (https://docs.meshy.ai): image-to-3d, multi-image-to-3d, balance. */
public class MeshyAdapter implements ProviderAdapter {
    private static final Map<String, String> PATHS = Map.of("single", "/openapi/v1/image-to-3d", "multi", "/openapi/v1/multi-image-to-3d");
    private static final Set<String> STATUSES = Set.of("PENDING", "IN_PROGRESS", "SUCCEEDED", "FAILED", "CANCELED");
    private final String baseUrl;
    private final String apiKey;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();

    public MeshyAdapter(AppProperties.Meshy cfg) {
        this.baseUrl = cfg.baseUrl();
        this.apiKey = cfg.apiKey().trim();
    }

    @Override
    public String name() {
        return "meshy";
    }

    private JsonNode call(String method, String path, Object body, Duration timeout) {
        HttpResponse<String> res;
        try {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(baseUrl + path)).timeout(timeout)
                    .header("Authorization", "Bearer " + apiKey).header("Content-Type", "application/json");
            b = switch (method) {
                case "POST" -> b.POST(HttpRequest.BodyPublishers.ofString(Json.write(body)));
                case "DELETE" -> b.DELETE();
                default -> b.GET();
            };
            res = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ProviderException("PROVIDER_UNREACHABLE", "Không kết nối được tới Meshy.", 0, true, true);
        } catch (Exception e) {
            throw new ProviderException("PROVIDER_UNREACHABLE", "Không kết nối được tới Meshy.", 0, true, true);
        }
        JsonNode data;
        try {
            data = res.body() == null || res.body().isBlank() ? Json.MAPPER.createObjectNode() : Json.MAPPER.readTree(res.body());
        } catch (Exception e) {
            data = Json.MAPPER.createObjectNode().put("message", res.body());
        }
        int s = res.statusCode();
        if (s >= 200 && s < 300) return data;
        String msg = data.path("message").asText("Meshy trả lỗi HTTP " + s);
        if (s == 401 || s == 403) throw new ProviderException("PROVIDER_AUTH", "API key Meshy không hợp lệ hoặc bị chặn.", s, false, false);
        if (s == 402) throw new ProviderException("PROVIDER_NO_CREDITS", "Tài khoản Meshy hết credit hoặc chưa có gói trả phí.", s, false, false);
        if (s == 404) throw new ProviderException("PROVIDER_NOT_FOUND", "Không tìm thấy tác vụ phía Meshy.", s, false, false);
        if (s == 409) throw new ProviderException("PROVIDER_CONFLICT", msg, s, false, false);
        if (s == 429) throw new ProviderException("PROVIDER_RATE_LIMIT", "Meshy đang giới hạn tần suất, sẽ thử lại.", s, true, false);
        if (s >= 500) throw new ProviderException("PROVIDER_UNAVAILABLE", "Meshy tạm thời gặp sự cố.", s, true, true);
        throw new ProviderException("PROVIDER_REJECTED", msg, s, false, false);
    }

    /** Map cấu hình nội bộ → body Meshy. Chỉ gửi tham số được hỗ trợ. */
    private static Map<String, Object> toMeshyBody(String mode, List<String> uris, Map<String, Object> cfg) {
        Map<String, Object> body = new LinkedHashMap<>();
        boolean tex = Boolean.TRUE.equals(cfg.get("shouldTexture"));
        boolean remesh = Boolean.TRUE.equals(cfg.get("shouldRemesh"));
        body.put("ai_model", cfg.get("aiModel"));
        body.put("should_texture", tex);
        body.put("enable_pbr", cfg.get("enablePbr"));
        body.put("should_remesh", remesh);
        body.put("target_formats", cfg.get("targetFormats"));
        body.put("moderation", cfg.get("moderation"));
        body.put("pose_mode", cfg.get("poseMode"));
        if (!"standard".equals(cfg.get("geometryResolution"))) body.put("geometry_resolution", cfg.get("geometryResolution"));
        if (tex) body.put("texture_resolution", cfg.get("textureResolution"));
        if (tex && cfg.get("texturePrompt") instanceof String p && !p.isBlank()) body.put("texture_prompt", p);
        if (remesh) {
            body.put("topology", cfg.get("topology"));
            body.put("target_polycount", cfg.get("targetPolycount"));
        }
        if (!"meshy-6-lite".equals(cfg.get("aiModel"))) {
            body.put("image_enhancement", cfg.get("imageEnhancement"));
            body.put("remove_lighting", cfg.get("removeLighting"));
        }
        if ("multi".equals(mode)) body.put("image_urls", uris);
        else body.put("image_url", uris.get(0));
        return body;
    }

    @Override
    public String create(String mode, List<String> uris, Map<String, Object> cfg) {
        // tạo task có thể lâu do upload data URI lớn
        JsonNode data = call("POST", PATHS.get(mode), toMeshyBody(mode, uris, cfg), Duration.ofMinutes(2));
        String id = data.path("result").asText("");
        if (id.isBlank()) throw new ProviderException("PROVIDER_BAD_RESPONSE", "Meshy không trả về mã tác vụ.", 0, false, true);
        return id;
    }

    @Override
    public ProviderTask get(String mode, String providerTaskId) {
        JsonNode t = call("GET", PATHS.get(mode) + "/" + URLEncoder.encode(providerTaskId, StandardCharsets.UTF_8), null, Duration.ofSeconds(30));
        String st = t.path("status").asText("PENDING");
        Map<String, String> models = new LinkedHashMap<>();
        t.path("model_urls").fields().forEachRemaining(e -> {
            if (e.getValue().isTextual() && !e.getValue().asText().isBlank()) models.put(e.getKey(), e.getValue().asText());
        });
        List<Map<String, String>> textures = new ArrayList<>();
        for (JsonNode set : t.path("texture_urls")) {
            Map<String, String> m = new LinkedHashMap<>();
            set.fields().forEachRemaining(e -> { if (e.getValue().isTextual()) m.put(e.getKey(), e.getValue().asText()); });
            textures.add(m);
        }
        String err = t.path("task_error").path("message").asText(null);
        return new ProviderTask(STATUSES.contains(st) ? st : "PENDING", t.path("progress").asInt(0), models,
                t.hasNonNull("thumbnail_url") ? t.get("thumbnail_url").asText() : null, textures, err == null || err.isBlank() ? null : err);
    }

    @Override
    public void cancel(String mode, String providerTaskId) {
        call("DELETE", PATHS.get(mode) + "/" + URLEncoder.encode(providerTaskId, StandardCharsets.UTF_8), null, Duration.ofSeconds(30));
    }
}
