package com.threedworld.studio;

import com.threedworld.auth.CurrentUser;
import com.threedworld.common.ApiException;
import com.threedworld.common.Db;
import com.threedworld.common.Json;
import com.threedworld.storage.StorageService;
import com.threedworld.studio.StudioService.CurrentUserId;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.Map;
import java.util.regex.Pattern;

/** API 3D Studio – /api/studio/** (mọi endpoint yêu cầu đăng nhập, kiểm tra chủ sở hữu). */
@RestController
@RequestMapping("/api/studio")
public class StudioController {
    private static final Pattern IDEM = Pattern.compile("^[\\w-]{8,80}$");
    private final StudioService studio;
    private final StorageService storage;

    public StudioController(StudioService studio, StorageService storage) {
        this.studio = studio;
        this.storage = storage;
    }

    private static CurrentUserId uid(CurrentUser u) {
        return new CurrentUserId(u.id());
    }

    private static Map<String, Object> body(Map<String, Object> b) {
        return b == null ? Map.of() : b;
    }

    @GetMapping("/projects")
    public Map<String, Object> list(CurrentUser u) {
        return Map.of("projects", studio.list(uid(u)));
    }

    @PostMapping("/projects")
    public ResponseEntity<?> create(CurrentUser u, @RequestBody(required = false) Map<String, Object> b) {
        return ResponseEntity.status(201).body(Map.of("project", studio.create(uid(u), body(b))));
    }

    @GetMapping("/projects/{id}")
    public Map<String, Object> get(CurrentUser u, @PathVariable String id) {
        return studio.get(uid(u), id);
    }

    @PutMapping("/projects/{id}/content")
    public Map<String, Object> save(CurrentUser u, @PathVariable String id, @RequestBody(required = false) Map<String, Object> b) {
        return studio.saveContent(uid(u), id, body(b));
    }

    @PatchMapping("/projects/{id}")
    public Map<String, Object> rename(CurrentUser u, @PathVariable String id, @RequestBody(required = false) Map<String, Object> b) {
        return Map.of("project", studio.rename(uid(u), id, body(b)));
    }

    @PostMapping("/projects/{id}/duplicate")
    public ResponseEntity<?> duplicate(CurrentUser u, @PathVariable String id) {
        return ResponseEntity.status(201).body(Map.of("project", studio.duplicate(uid(u), id)));
    }

    @DeleteMapping("/projects/{id}")
    public Map<String, Object> delete(CurrentUser u, @PathVariable String id) {
        studio.delete(uid(u), id);
        return Map.of("ok", true);
    }

    /** Thumbnail khi chạy storage local (Cloudinary thì frontend dùng thẳng URL CDN). */
    @GetMapping("/projects/{id}/thumbnail")
    public ResponseEntity<InputStreamResource> thumbnail(CurrentUser u, @PathVariable String id) {
        Map<String, Object> p = studio.thumbnailRow(uid(u), id);
        String key = Db.str(p, "thumbnail_key");
        MediaType type = key != null && key.endsWith(".jpeg") ? MediaType.IMAGE_JPEG : key != null && key.endsWith(".webp") ? MediaType.parseMediaType("image/webp") : MediaType.IMAGE_PNG;
        return ResponseEntity.ok().contentType(type).cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePrivate())
                .body(new InputStreamResource(storage.open(Db.str(p, "thumbnail_url"))));
    }

    // ---------- snapshot ----------
    @GetMapping("/projects/{id}/snapshots")
    public Map<String, Object> snapshots(CurrentUser u, @PathVariable String id) {
        return studio.snapshots(uid(u), id);
    }

    @PostMapping("/projects/{id}/snapshots")
    public ResponseEntity<?> uploadSnapshot(CurrentUser u, @PathVariable String id,
                                            @RequestPart("meta") MultipartFile meta, @RequestPart("file") MultipartFile file) throws Exception {
        Map<String, Object> m = Json.map(new String(meta.getBytes(), java.nio.charset.StandardCharsets.UTF_8));
        return ResponseEntity.status(201).body(Map.of("snapshot", studio.uploadSnapshot(uid(u), id, m, file.getBytes())));
    }

    @PatchMapping("/projects/{id}/snapshots/{code}")
    public Map<String, Object> patchSnapshot(CurrentUser u, @PathVariable String id, @PathVariable String code, @RequestBody(required = false) Map<String, Object> b) {
        return Map.of("snapshot", studio.patchSnapshot(uid(u), id, code, body(b)));
    }

    // ---------- yêu cầu in ----------
    @PostMapping("/print-requests")
    public ResponseEntity<?> createPrintRequest(CurrentUser u, @RequestHeader(value = "Idempotency-Key", required = false) String idem,
                                                @RequestBody(required = false) Map<String, Object> b) {
        String key = idem == null ? "" : idem.trim();
        if (!IDEM.matcher(key).matches()) throw ApiException.bad("IDEMPOTENCY_KEY_REQUIRED", "Thiếu Idempotency-Key hợp lệ.");
        return ResponseEntity.status(201).body(Map.of("request", studio.createPrintRequest(uid(u), key, body(b))));
    }

    @GetMapping("/print-requests/{code}")
    public Map<String, Object> getPrintRequest(CurrentUser u, @PathVariable String code) {
        return Map.of("request", studio.getPrintRequest(uid(u), code));
    }
}
