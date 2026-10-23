package com.threedworld.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String jwtSecret,
        int sessionDays,
        boolean cookieSecure,
        int signupBonusCredits,
        boolean demoTopupEnabled,
        String frontendDist,
        Storage storage,
        Meshy meshy
) {
    public record Storage(String cloudinaryUrl, String folder, String localDir) {}

    public record Meshy(String apiKey, String baseUrl, String webhookSecret) {
        /** Có API key thật → gọi Meshy; ngược lại chạy chế độ MOCK. */
        public boolean enabled() {
            return apiKey != null && !apiKey.isBlank() && !"mock".equalsIgnoreCase(apiKey.trim());
        }
    }
}
