package com.threedworld.ai.provider;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Adapter MOCK: mô phỏng vòng đời task Meshy (PENDING → IN_PROGRESS → SUCCEEDED) mà không gọi mạng.
 * Trạng thái suy ra từ thời điểm tạo ghi trong id nên vẫn đúng sau khi restart server.
 * Kết quả là URL "mock://glb/{id}" → TaskService sinh mô hình thủ tục (Procedural).
 */
public class MockAdapter implements ProviderAdapter {
    private static final long QUEUE_MS = 3000;
    private static final long RUN_MS = 15000;
    private static final SecureRandom RND = new SecureRandom();
    private final Set<String> cancelled = ConcurrentHashMap.newKeySet();

    @Override
    public String name() {
        return "mock";
    }

    private static long startedAt(String id) {
        try {
            return Long.parseLong(id.split("-")[2]);
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public String create(String mode, List<String> uris, Map<String, Object> cfg) {
        byte[] b = new byte[4];
        RND.nextBytes(b);
        return "mock-" + mode + "-" + System.currentTimeMillis() + "-" + HexFormat.of().formatHex(b);
    }

    @Override
    public ProviderTask get(String mode, String id) {
        long t0 = startedAt(id);
        if (t0 == 0) throw new ProviderException("PROVIDER_NOT_FOUND", "Không tìm thấy tác vụ.");
        if (cancelled.contains(id)) return new ProviderTask("CANCELED", 0, Map.of(), null, List.of(), null);
        long el = System.currentTimeMillis() - t0;
        if (el < QUEUE_MS) return new ProviderTask("PENDING", 0, Map.of(), null, List.of(), null);
        if (el < QUEUE_MS + RUN_MS) {
            int p = (int) Math.min(99, Math.round((el - QUEUE_MS) * 100.0 / RUN_MS));
            return new ProviderTask("IN_PROGRESS", p, Map.of(), null, List.of(), null);
        }
        return new ProviderTask("SUCCEEDED", 100, Map.of("glb", "mock://glb/" + id, "stl", "mock://stl/" + id), null, List.of(), null);
    }

    @Override
    public void cancel(String mode, String id) {
        if (System.currentTimeMillis() - startedAt(id) >= QUEUE_MS) {
            throw new ProviderException("PROVIDER_CONFLICT", "Tác vụ đang xử lý, không thể hủy.", 409, false, false);
        }
        cancelled.add(id);
    }
}
