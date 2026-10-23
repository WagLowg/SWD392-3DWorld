package com.threedworld.storage;

import com.threedworld.common.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StorageConfig {
    private static final Logger log = LoggerFactory.getLogger(StorageConfig.class);

    @Bean
    public StorageService storageService(AppProperties props) {
        AppProperties.Storage s = props.storage();
        if (s.cloudinaryUrl() != null && s.cloudinaryUrl().startsWith("cloudinary://")) {
            log.info("Storage: Cloudinary (folder {})", s.folder());
            return new CloudinaryStorageService(s.cloudinaryUrl(), s.folder());
        }
        log.warn("Storage: LOCAL ({}) — chưa cấu hình CLOUDINARY_URL", s.localDir());
        return new LocalStorageService(s.localDir());
    }
}
