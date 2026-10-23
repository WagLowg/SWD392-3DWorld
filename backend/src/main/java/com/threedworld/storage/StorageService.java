package com.threedworld.storage;

import java.io.InputStream;
import java.security.MessageDigest;
import java.util.HexFormat;

/**
 * Lưu file (ảnh nguồn, GLB/STL/OBJ…, texture, thumbnail, scene JSON, STL snapshot).
 * DB (Supabase) chỉ lưu {@code key} + {@code url} trả về từ đây.
 */
public interface StorageService {

    /** @param key đường dẫn logic, vd "ai/usr_x/ver_y/model.glb" (không chứa folder gốc) */
    StoredFile put(String key, byte[] data, String contentType);

    byte[] read(String url);

    InputStream open(String url);

    void delete(String key, String url);

    /** "cloudinary" hoặc "local" */
    String mode();

    /** URL trình duyệt dùng trực tiếp được (Cloudinary) hoặc null (local → phải đi qua API). */
    default String browserUrl(String url) {
        return url != null && url.startsWith("http") ? url : null;
    }

    record StoredFile(String key, String url, long size, String checksum) {}

    static String sha256(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
