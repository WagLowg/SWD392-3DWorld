package com.threedworld.auth;

import com.threedworld.ai.WalletService;
import com.threedworld.common.ApiException;
import com.threedworld.common.AppProperties;
import com.threedworld.common.Db;
import com.threedworld.common.Ids;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final Db db;
    private final JwtService jwt;
    private final WalletService wallet;
    private final AppProperties props;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(Db db, JwtService jwt, WalletService wallet, AppProperties props) {
        this.db = db;
        this.jwt = jwt;
        this.wallet = wallet;
        this.props = props;
    }

    private static String s(Map<String, Object> b, String k) {
        Object v = b == null ? null : b.get(k);
        return v == null ? "" : v.toString();
    }

    private static Map<String, Object> userDto(String id, String email, String name, String role) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("email", email);
        m.put("name", name);
        m.put("role", role);
        return m;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> body, HttpServletResponse res) {
        String email = s(body, "email").trim().toLowerCase();
        String name = s(body, "name").trim();
        if (name.length() > 80) name = name.substring(0, 80);
        String password = s(body, "password");
        if (!EMAIL.matcher(email).matches()) throw ApiException.bad("INVALID_EMAIL", "Email không hợp lệ.");
        if (name.length() < 2) throw ApiException.bad("INVALID_NAME", "Tên hiển thị tối thiểu 2 ký tự.");
        if (password.length() < 8) throw ApiException.bad("WEAK_PASSWORD", "Mật khẩu tối thiểu 8 ký tự.");
        if (password.length() > 72) throw ApiException.bad("WEAK_PASSWORD", "Mật khẩu tối đa 72 ký tự.");
        if (db.one("SELECT 1 AS x FROM users WHERE email = ?", email) != null) {
            throw new ApiException(409, "EMAIL_TAKEN", "Email đã được đăng ký.");
        }
        String uid = Ids.id("usr");
        String finalName = name;
        db.txRun(() -> {
            db.run("INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?,?,?,?,?,?)",
                    uid, email, finalName, encoder.encode(password), "customer", Ids.now());
            if (props.signupBonusCredits() > 0) wallet.addEntry(uid, props.signupBonusCredits(), "GRANT", null, "Credit chào mừng");
        });
        db.audit(uid, "user.register", uid, null);
        jwt.setCookie(res, uid);
        return ResponseEntity.status(201).body(Map.of("user", userDto(uid, email, finalName, "customer")));
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, Object> body, HttpServletResponse res) {
        String email = s(body, "email").trim().toLowerCase();
        Map<String, Object> u = db.one("SELECT * FROM users WHERE email = ?", email);
        if (u == null || !encoder.matches(s(body, "password"), Db.str(u, "password_hash"))) {
            throw new ApiException(401, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng.");
        }
        String uid = Db.str(u, "id");
        jwt.setCookie(res, uid);
        db.audit(uid, "user.login", uid, null);
        return Map.of("user", userDto(uid, Db.str(u, "email"), Db.str(u, "name"), Db.str(u, "role")));
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletResponse res) {
        jwt.clearCookie(res);
        return Map.of("ok", true);
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest req) {
        CurrentUser u = (CurrentUser) req.getAttribute(CurrentUser.ATTR);
        Map<String, Object> out = new HashMap<>();
        out.put("user", u == null ? null : userDto(u.id(), u.email(), u.name(), u.role()));
        return out;
    }
}
