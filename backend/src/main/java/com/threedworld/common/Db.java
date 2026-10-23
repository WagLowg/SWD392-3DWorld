package com.threedworld.common;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Truy cập DB mỏng trên JdbcTemplate (SQL thuần, chạy được trên Supabase Postgres và H2 chế độ PostgreSQL).
 * Mỗi hàng trả về là Map tên cột (chữ thường) → giá trị.
 */
@Component
public class Db {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;

    public Db(JdbcTemplate jdbc, TransactionTemplate tx) {
        this.jdbc = jdbc;
        this.tx = tx;
    }

    public Map<String, Object> one(String sql, Object... args) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, args);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<Map<String, Object>> all(String sql, Object... args) {
        return jdbc.queryForList(sql, args);
    }

    public int run(String sql, Object... args) {
        return jdbc.update(sql, args);
    }

    public long count(String sql, Object... args) {
        Number n = jdbc.queryForObject(sql, Number.class, args);
        return n == null ? 0 : n.longValue();
    }

    /** Chạy fn trong một transaction (atomic). */
    public <T> T tx(Supplier<T> fn) {
        return tx.execute(status -> fn.get());
    }

    public void txRun(Runnable fn) {
        tx.executeWithoutResult(status -> fn.run());
    }

    public void audit(String actorId, String action, String targetId, Object detail) {
        run("INSERT INTO audit_log (id, actor_id, action, target_id, detail_json, created_at) VALUES (?,?,?,?,?,?)",
                Ids.id("aud"), actorId, action, targetId, detail == null ? null : Json.write(detail), Ids.now());
    }

    // ---- đọc giá trị từ hàng ----
    public static String str(Map<String, Object> r, String k) {
        Object v = r.get(k);
        return v == null ? null : v.toString();
    }

    public static long lng(Map<String, Object> r, String k) {
        Object v = r.get(k);
        return v == null ? 0 : ((Number) v).longValue();
    }

    public static Long lngOrNull(Map<String, Object> r, String k) {
        Object v = r.get(k);
        return v == null ? null : ((Number) v).longValue();
    }

    public static int integer(Map<String, Object> r, String k) {
        Object v = r.get(k);
        return v == null ? 0 : ((Number) v).intValue();
    }

    public static boolean bool(Map<String, Object> r, String k) {
        Object v = r.get(k);
        if (v instanceof Boolean b) return b;
        if (v instanceof Number n) return n.intValue() != 0;
        return false;
    }
}
