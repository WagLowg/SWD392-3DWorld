package com.threedworld.web;

import com.threedworld.ai.provider.ProviderRegistry;
import com.threedworld.storage.StorageService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {
    private final ProviderRegistry providers;
    private final StorageService storage;

    public HealthController(ProviderRegistry providers, StorageService storage) {
        this.providers = providers;
        this.storage = storage;
    }

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of("ok", true, "provider", providers.currentName(), "storage", storage.mode());
    }
}
