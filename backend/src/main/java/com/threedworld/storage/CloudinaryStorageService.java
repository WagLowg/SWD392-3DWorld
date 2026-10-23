package com.threedworld.storage;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Set;

/**
 * Cloudinary: ảnh (JPG/PNG/WEBP) lưu loại "image", mọi file khác (GLB, STL, OBJ, ZIP, JSON…) lưu loại "raw"
 * để Cloudinary giữ nguyên từng byte. public_id = {folder}/{key}, ngẫu nhiên theo id nên không đoán được.
 */
public class CloudinaryStorageService implements StorageService {
    private static final Logger log = LoggerFactory.getLogger(CloudinaryStorageService.class);
    private static final Set<String> IMAGE_TYPES = Set.of("image/png", "image/jpeg", "image/webp");
    private final Cloudinary cloudinary;
    private final String folder;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20)).followRedirects(HttpClient.Redirect.NORMAL).build();

    public CloudinaryStorageService(String cloudinaryUrl, String folder) {
        this.cloudinary = new Cloudinary(cloudinaryUrl);
        this.cloudinary.config.secure = true;
        this.folder = folder == null || folder.isBlank() ? "3dworld" : folder.replaceAll("/+$", "");
    }

    @Override
    public StoredFile put(String key, byte[] data, String contentType) {
        boolean image = contentType != null && IMAGE_TYPES.contains(contentType);
        String publicId = folder + "/" + (image ? stripExt(key) : key);
        try {
            Map<?, ?> r = cloudinary.uploader().upload(data, ObjectUtils.asMap(
                    "public_id", publicId,
                    "resource_type", image ? "image" : "raw",
                    "overwrite", true,
                    "invalidate", true));
            String url = String.valueOf(r.get("secure_url"));
            return new StoredFile(publicId, url, data.length, StorageService.sha256(data));
        } catch (Exception e) {
            throw new IllegalStateException("Upload Cloudinary thất bại: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] read(String url) {
        try (InputStream in = open(url)) {
            return in.readAllBytes();
        } catch (Exception e) {
            throw new IllegalStateException("Không đọc được file từ Cloudinary: " + e.getMessage(), e);
        }
    }

    @Override
    public InputStream open(String url) {
        try {
            HttpResponse<InputStream> res = http.send(
                    HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofMinutes(3)).GET().build(),
                    HttpResponse.BodyHandlers.ofInputStream());
            if (res.statusCode() >= 400) {
                res.body().close();
                throw new IllegalStateException("HTTP " + res.statusCode());
            }
            return res.body();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new ByteArrayInputStream(new byte[0]);
        } catch (Exception e) {
            throw new IllegalStateException("Không tải được " + url + ": " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String key, String url) {
        try {
            String type = url != null && url.contains("/image/upload/") ? "image" : "raw";
            cloudinary.uploader().destroy(key, ObjectUtils.asMap("resource_type", type, "invalidate", true));
        } catch (Exception e) {
            log.warn("Không xóa được {} trên Cloudinary: {}", key, e.getMessage());
        }
    }

    @Override
    public String mode() {
        return "cloudinary";
    }

    private static String stripExt(String key) {
        int slash = key.lastIndexOf('/');
        int dot = key.lastIndexOf('.');
        return dot > slash ? key.substring(0, dot) : key;
    }
}
