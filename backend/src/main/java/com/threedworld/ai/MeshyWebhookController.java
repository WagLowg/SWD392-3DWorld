package com.threedworld.ai;

import com.threedworld.common.AppProperties;
import com.threedworld.common.Db;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Webhook Meshy: POST /api/webhooks/meshy?secret=...
 * Payload chỉ là tín hiệu: server luôn đọc lại trạng thái từ API Meshy (không tin body),
 * nên webhook giả / lặp / sai thứ tự không ghi đè được trạng thái (BR-09).
 */
@RestController
public class MeshyWebhookController {
    private final Db db;
    private final TaskService tasks;
    private final AppProperties props;

    public MeshyWebhookController(Db db, TaskService tasks, AppProperties props) {
        this.db = db;
        this.tasks = tasks;
        this.props = props;
    }

    @PostMapping("/api/webhooks/meshy")
    public ResponseEntity<Map<String, Object>> meshy(@RequestParam(required = false) String secret, @RequestBody(required = false) Map<String, Object> body) {
        String want = props.meshy().webhookSecret();
        if (want != null && !want.isBlank()) {
            byte[] got = (secret == null ? "" : secret).getBytes(StandardCharsets.UTF_8);
            if (!MessageDigest.isEqual(got, want.getBytes(StandardCharsets.UTF_8))) return ResponseEntity.status(401).body(Map.of("ok", false));
        }
        String providerTaskId = body == null || body.get("id") == null ? "" : String.valueOf(body.get("id"));
        Map<String, Object> task = providerTaskId.isEmpty() ? null : db.one("SELECT id FROM ai_tasks WHERE provider_task_id = ?", providerTaskId);
        if (task != null) CompletableFuture.runAsync(() -> tasks.sync(Db.str(task, "id")));
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
