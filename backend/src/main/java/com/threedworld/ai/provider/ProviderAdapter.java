package com.threedworld.ai.provider;

import java.util.List;
import java.util.Map;

/** Adapter nhà cung cấp Image-to-3D. Không bao giờ trả API key ra frontend. */
public interface ProviderAdapter {
    String name();

    /** @return provider task id */
    String create(String mode, List<String> imageDataUris, Map<String, Object> cfg);

    ProviderTask get(String mode, String providerTaskId);

    void cancel(String mode, String providerTaskId);

    /**
     * Trạng thái chuẩn hóa: PENDING | IN_PROGRESS | SUCCEEDED | FAILED | CANCELED.
     * modelUrls: định dạng → URL (glb, fbx, obj, mtl, usdz, stl, 3mf). textureUrls: mỗi phần tử là bộ map PBR.
     */
    record ProviderTask(String status, int progress, Map<String, String> modelUrls, String thumbnailUrl,
                        List<Map<String, String>> textureUrls, String errorMessage) {}
}
