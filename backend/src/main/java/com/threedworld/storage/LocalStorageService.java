package com.threedworld.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Lưu file trên đĩa (chỉ dùng khi chạy thử chưa có CLOUDINARY_URL). URL dạng "local:{key}". */
public class LocalStorageService implements StorageService {
    private static final String PREFIX = "local:";
    private final Path root;

    public LocalStorageService(String dir) {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Đường dẫn tuyệt đối của key; chặn path traversal. */
    private Path resolve(String key) {
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) throw new IllegalArgumentException("Invalid storage key");
        return p;
    }

    private Path fromUrl(String url) {
        if (url == null || !url.startsWith(PREFIX)) throw new IllegalArgumentException("Không phải URL local: " + url);
        return resolve(url.substring(PREFIX.length()));
    }

    @Override
    public StoredFile put(String key, byte[] data, String contentType) {
        try {
            Path p = resolve(key);
            Files.createDirectories(p.getParent());
            Files.write(p, data);
            return new StoredFile(key, PREFIX + key, data.length, StorageService.sha256(data));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public byte[] read(String url) {
        try {
            return Files.readAllBytes(fromUrl(url));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public InputStream open(String url) {
        try {
            return Files.newInputStream(fromUrl(url));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public void delete(String key, String url) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException ignored) {
            // best-effort
        }
    }

    @Override
    public String mode() {
        return "local";
    }
}
