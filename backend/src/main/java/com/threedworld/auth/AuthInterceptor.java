package com.threedworld.auth;

import com.threedworld.common.Db;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

/** Gắn CurrentUser vào request nếu token hợp lệ. Việc bắt buộc đăng nhập do CurrentUserResolver làm. */
@Component
public class AuthInterceptor implements HandlerInterceptor {
    private final JwtService jwt;
    private final Db db;

    public AuthInterceptor(JwtService jwt, Db db) {
        this.jwt = jwt;
        this.db = db;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        String uid = jwt.verify(jwt.readToken(req));
        if (uid != null) {
            Map<String, Object> u = db.one("SELECT id, email, name, role FROM users WHERE id = ?", uid);
            if (u != null) {
                req.setAttribute(CurrentUser.ATTR, new CurrentUser(Db.str(u, "id"), Db.str(u, "email"), Db.str(u, "name"), Db.str(u, "role")));
            }
        }
        return true;
    }
}
