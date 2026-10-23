package com.threedworld;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 3DWorld backend: một server cho cả website.
 * <ul>
 *   <li>/api/auth/**       – đăng ký, đăng nhập (JWT trong cookie httpOnly)</li>
 *   <li>/api/ai-studio/**  – AI Studio: ảnh → mô hình 3D (Meshy)</li>
 *   <li>/api/studio/**     – 3D Studio: dự án editor, snapshot, yêu cầu in</li>
 *   <li>/api/marketplace/**, /api/pod/** – dành cho module làm sau</li>
 * </ul>
 * Metadata + URL lưu ở Supabase (PostgreSQL); file lưu ở Cloudinary.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class ThreeDWorldApplication {
    public static void main(String[] args) {
        SpringApplication.run(ThreeDWorldApplication.class, args);
    }
}
