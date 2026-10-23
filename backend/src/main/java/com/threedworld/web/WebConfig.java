package com.threedworld.web;

import com.threedworld.auth.AuthInterceptor;
import com.threedworld.auth.CurrentUserResolver;
import com.threedworld.common.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * - Gắn người dùng (JWT) cho mọi /api/**.
 * - Nếu có frontend/dist: phục vụ website, mỗi module có SPA fallback riêng
 *   (/ai/models → ai/index.html, /studio/... → studio/index.html, ...).
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    private static final Logger log = LoggerFactory.getLogger(WebConfig.class);
    /** Phải khớp MODULES trong frontend/vite.config.ts */
    private static final List<String> MODULES = List.of("ai", "studio", "marketplace", "pod", "login");

    private final AuthInterceptor authInterceptor;
    private final CurrentUserResolver currentUserResolver;
    private final AppProperties props;

    public WebConfig(AuthInterceptor authInterceptor, CurrentUserResolver currentUserResolver, AppProperties props) {
        this.authInterceptor = authInterceptor;
        this.currentUserResolver = currentUserResolver;
        this.props = props;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor).addPathPatterns("/api/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserResolver);
    }

    /** "/" không đi qua resource handler (đường dẫn rỗng) → forward sang index.html của Landing. */
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        if (distDir() != null) registry.addViewController("/").setViewName("forward:/index.html");
    }

    private Path distDir() {
        Path dist = Path.of(props.frontendDist() == null ? "" : props.frontendDist()).toAbsolutePath().normalize();
        return Files.isRegularFile(dist.resolve("index.html")) ? dist : null;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path dist = Path.of(props.frontendDist() == null ? "" : props.frontendDist()).toAbsolutePath().normalize();
        if (!Files.isRegularFile(dist.resolve("index.html"))) {
            log.info("Không thấy frontend build ở {} — chỉ chạy API (dev: dùng Vite ở cổng 5173).", dist);
            return;
        }
        log.info("Phục vụ frontend từ {}", dist);
        String location = dist.toUri().toString();
        registry.addResourceHandler("/**")
                .addResourceLocations(location)
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource loc) throws IOException {
                        if (resourcePath.startsWith("api/")) return null;
                        if (resourcePath.isEmpty() || resourcePath.equals("/")) return new FileSystemResource(dist.resolve("index.html"));
                        Resource r = super.getResource(resourcePath, loc);
                        if (r != null && r.isReadable()) return r;
                        // thư mục module: /ai/ → ai/index.html
                        Resource idx = super.getResource(stripSlash(resourcePath) + "/index.html", loc);
                        if (idx != null && idx.isReadable()) return idx;
                        // file tĩnh không tồn tại → 404 thật (không trả HTML)
                        if (resourcePath.matches(".*\\.[A-Za-z0-9]{1,8}$")) return null;
                        String first = resourcePath.contains("/") ? resourcePath.substring(0, resourcePath.indexOf('/')) : resourcePath;
                        if (MODULES.contains(first)) return new FileSystemResource(dist.resolve(first).resolve("index.html"));
                        return new FileSystemResource(dist.resolve("index.html"));
                    }
                });
    }

    private static String stripSlash(String p) {
        return p.endsWith("/") ? p.substring(0, p.length() - 1) : p;
    }
}
