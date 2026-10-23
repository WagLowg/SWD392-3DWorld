package com.threedworld.auth;

import com.threedworld.common.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;

/**
 * JWT ký HS256, gửi qua cookie httpOnly "sid" (frontend không đọc được token → chống XSS lấy phiên).
 * Cũng chấp nhận header Authorization: Bearer cho Postman / app khác.
 */
@Service
public class JwtService {
    public static final String COOKIE = "sid";
    private final SecretKey key;
    private final Duration ttl;
    private final boolean secure;

    public JwtService(AppProperties props) {
        byte[] raw = props.jwtSecret().getBytes(StandardCharsets.UTF_8);
        if (raw.length < 32) throw new IllegalStateException("JWT_SECRET phải dài tối thiểu 32 ký tự");
        this.key = Keys.hmacShaKeyFor(raw);
        this.ttl = Duration.ofDays(Math.max(1, props.sessionDays()));
        this.secure = props.cookieSecure();
    }

    public String issue(String userId) {
        long now = System.currentTimeMillis();
        return Jwts.builder().subject(userId).issuedAt(new Date(now)).expiration(new Date(now + ttl.toMillis())).signWith(key).compact();
    }

    /** userId nếu token hợp lệ và chưa hết hạn, ngược lại null. */
    public String verify(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return c.getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    public String readToken(HttpServletRequest req) {
        String h = req.getHeader(HttpHeaders.AUTHORIZATION);
        if (h != null && h.startsWith("Bearer ")) return h.substring(7).trim();
        if (req.getCookies() == null) return null;
        for (Cookie c : req.getCookies()) if (COOKIE.equals(c.getName())) return c.getValue();
        return null;
    }

    public void setCookie(HttpServletResponse res, String userId) {
        ResponseCookie c = ResponseCookie.from(COOKIE, issue(userId))
                .httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(ttl).build();
        res.addHeader(HttpHeaders.SET_COOKIE, c.toString());
    }

    public void clearCookie(HttpServletResponse res) {
        ResponseCookie c = ResponseCookie.from(COOKIE, "").httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(0).build();
        res.addHeader(HttpHeaders.SET_COOKIE, c.toString());
    }
}
