package com.threedworld.auth;

import com.threedworld.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Tham số kiểu CurrentUser trong controller ⇒ endpoint bắt buộc đăng nhập (401 nếu chưa).
 * Dùng kiểu Optional-free: muốn endpoint không bắt buộc thì đọc request attribute trực tiếp.
 */
@Component
public class CurrentUserResolver implements HandlerMethodArgumentResolver {
    @Override
    public boolean supportsParameter(MethodParameter p) {
        return p.getParameterType() == CurrentUser.class;
    }

    @Override
    public Object resolveArgument(MethodParameter p, ModelAndViewContainer mav, NativeWebRequest req, WebDataBinderFactory bf) {
        HttpServletRequest http = req.getNativeRequest(HttpServletRequest.class);
        Object u = http == null ? null : http.getAttribute(CurrentUser.ATTR);
        if (u == null) throw new ApiException(401, "UNAUTHENTICATED", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return u;
    }
}
