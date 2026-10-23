package com.threedworld.ai.provider;

import com.threedworld.common.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ProviderRegistry {
    private static final Logger log = LoggerFactory.getLogger(ProviderRegistry.class);
    private final MockAdapter mock = new MockAdapter();
    private final MeshyAdapter meshy;

    public ProviderRegistry(AppProperties props) {
        this.meshy = props.meshy().enabled() ? new MeshyAdapter(props.meshy()) : null;
        log.info(meshy != null ? "AI provider: Meshy API (thật – sẽ tiêu credit Meshy)" : "AI provider: MOCK (chưa có MESHY_API_KEY – không gọi Meshy)");
    }

    /** Adapter cho task mới, theo cấu hình hiện tại. */
    public ProviderAdapter current() {
        return meshy != null ? meshy : mock;
    }

    public String currentName() {
        return current().name();
    }

    /** Adapter của task đã tạo (giữ provider ban đầu kể cả khi đổi cấu hình). */
    public ProviderAdapter forName(String name) {
        if ("meshy".equals(name) && meshy != null) return meshy;
        return mock;
    }
}
