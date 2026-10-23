package com.threedworld.ai;

import com.threedworld.common.ApiException;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Bảng giá credit nội bộ (BR-07). Giá tính tại server, có priceVersion.
 * Mức hiện tại bám theo bảng giá công khai của Meshy (1 credit 3DWorld ≈ 1 credit Meshy).
 */
@Service
public class PricingService {
    public static final String PRICE_VERSION = "pv-2026-10-22";

    public record Model(String label, int meshOnly, Map<String, Integer> tex, List<String> geo) {}

    public static final Map<String, Model> MODELS = new LinkedHashMap<>();
    public static final Map<String, Map<String, String>> PRESETS = new LinkedHashMap<>();
    private static final List<String> FORMATS = List.of("glb", "obj", "fbx", "stl", "usdz", "3mf");

    static {
        MODELS.put("latest", new Model("Meshy 7.1 · Mới nhất", 20, ordered("2k", 30, "4k", 30, "8k", 35), List.of("standard", "2k", "4k")));
        MODELS.put("meshy-6", new Model("Meshy 6", 20, ordered("2k", 30, "4k", 30, "8k", 35), List.of("standard")));
        MODELS.put("meshy-6-lite", new Model("Meshy 6 Lite · Nhanh", 5, ordered("2k", 15), List.of("standard")));
        PRESETS.put("fast", Map.of("aiModel", "meshy-6-lite", "textureResolution", "2k", "geometryResolution", "standard"));
        PRESETS.put("balanced", Map.of("aiModel", "latest", "textureResolution", "2k", "geometryResolution", "standard"));
        PRESETS.put("high", Map.of("aiModel", "latest", "textureResolution", "4k", "geometryResolution", "2k"));
    }

    private static Map<String, Integer> ordered(Object... kv) {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], (Integer) kv[i + 1]);
        return m;
    }

    private static String str(Map<String, Object> in, String k, String def) {
        Object v = in.get(k);
        return v == null ? def : v.toString();
    }

    /** Chuẩn hóa + validate cấu hình người dùng gửi lên. Chỉ giữ tham số adapter hỗ trợ (BR-06). */
    public Map<String, Object> normalizeConfig(Map<String, Object> input, String mode) {
        if (input == null) input = Map.of();
        String aiModel = MODELS.containsKey(str(input, "aiModel", "")) ? str(input, "aiModel", "") : "latest";
        Model m = MODELS.get(aiModel);
        boolean shouldTexture = !Boolean.FALSE.equals(input.get("shouldTexture"));
        String textureResolution = shouldTexture ? str(input, "textureResolution", "2k") : "2k";
        if (textureResolution.isBlank()) textureResolution = "2k";
        if (shouldTexture && !m.tex().containsKey(textureResolution)) {
            throw ApiException.bad("UNSUPPORTED_CONFIG", "Độ phân giải texture " + textureResolution + " không hỗ trợ với " + m.label() + ".");
        }
        String geometryResolution = str(input, "geometryResolution", "standard");
        if (geometryResolution.isBlank()) geometryResolution = "standard";
        if (!m.geo().contains(geometryResolution)) {
            throw ApiException.bad("UNSUPPORTED_CONFIG", "Độ phân giải hình học " + geometryResolution + " không hỗ trợ với " + m.label() + ".");
        }
        if ("multi".equals(mode) && "4k".equals(geometryResolution)) {
            throw ApiException.bad("UNSUPPORTED_CONFIG", "Multi-View không hỗ trợ hình học 4K.");
        }
        boolean shouldRemesh = Boolean.TRUE.equals(input.get("shouldRemesh"));
        long targetPolycount = 30000;
        Object tp = input.get("targetPolycount");
        if (tp instanceof Number n) targetPolycount = Math.round(n.doubleValue());
        else if (tp instanceof String s && !s.isBlank()) {
            try { targetPolycount = Math.round(Double.parseDouble(s)); } catch (NumberFormatException ignored) { targetPolycount = 0; }
        }
        if (targetPolycount == 0) targetPolycount = 30000;
        if (shouldRemesh && (targetPolycount < 100 || targetPolycount > 300000)) {
            throw ApiException.bad("UNSUPPORTED_CONFIG", "Số đa giác phải nằm trong khoảng 100 – 300.000.");
        }
        String topology = "quad".equals(input.get("topology")) ? "quad" : "triangle";
        String poseMode = List.of("a-pose", "t-pose").contains(str(input, "poseMode", "")) ? str(input, "poseMode", "") : "";
        String texturePrompt = str(input, "texturePrompt", "");
        if (texturePrompt.length() > 800) texturePrompt = texturePrompt.substring(0, 800);
        List<String> targetFormats = new ArrayList<>();
        if (input.get("targetFormats") instanceof List<?> l) {
            for (Object f : l) if (f != null && FORMATS.contains(f.toString()) && !targetFormats.contains(f.toString())) targetFormats.add(f.toString());
        }
        if (!targetFormats.contains("glb")) targetFormats.add(0, "glb"); // GLB bắt buộc cho viewer
        boolean lite = "meshy-6-lite".equals(aiModel);

        Map<String, Object> cfg = new LinkedHashMap<>();
        cfg.put("aiModel", aiModel);
        cfg.put("shouldTexture", shouldTexture);
        cfg.put("enablePbr", shouldTexture && Boolean.TRUE.equals(input.get("enablePbr")));
        cfg.put("textureResolution", textureResolution);
        cfg.put("texturePrompt", shouldTexture ? texturePrompt : "");
        cfg.put("geometryResolution", geometryResolution);
        cfg.put("shouldRemesh", shouldRemesh);
        cfg.put("topology", topology);
        cfg.put("targetPolycount", targetPolycount);
        cfg.put("poseMode", poseMode);
        cfg.put("imageEnhancement", !Boolean.FALSE.equals(input.get("imageEnhancement")) && !lite);
        cfg.put("removeLighting", !Boolean.FALSE.equals(input.get("removeLighting")) && !lite);
        cfg.put("moderation", Boolean.TRUE.equals(input.get("moderation")));
        cfg.put("targetFormats", targetFormats);
        return cfg;
    }

    public Map<String, Object> estimate(Map<String, Object> cfg, int variants) {
        Model m = MODELS.get((String) cfg.get("aiModel"));
        boolean tex = Boolean.TRUE.equals(cfg.get("shouldTexture"));
        String texRes = (String) cfg.get("textureResolution");
        String geoRes = (String) cfg.get("geometryResolution");
        int base = tex ? m.tex().get(texRes) : m.meshOnly();
        int geoSurcharge = "standard".equals(geoRes) ? 0 : 5;
        int perVariant = base + geoSurcharge;
        List<Map<String, Object>> breakdown = new ArrayList<>();
        breakdown.add(Map.of("label", tex ? m.label() + " · Mesh + Texture " + texRes.toUpperCase() : m.label() + " · Chỉ Mesh", "credits", base));
        if (geoSurcharge > 0) breakdown.add(Map.of("label", "Hình học " + geoRes.toUpperCase(), "credits", geoSurcharge));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("priceVersion", PRICE_VERSION);
        out.put("perVariant", perVariant);
        out.put("variants", variants);
        out.put("total", perVariant * variants);
        out.put("breakdown", breakdown);
        return out;
    }
}
