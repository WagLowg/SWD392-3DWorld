package com.threedworld.common;

import java.util.Map;

/** Lỗi nghiệp vụ trả về client dạng { error: { code, message, ...extra } }. */
public class ApiException extends RuntimeException {
    private final int status;
    private final String code;
    private final Map<String, Object> extra;

    public ApiException(int status, String code, String message) {
        this(status, code, message, Map.of());
    }

    public ApiException(int status, String code, String message, Map<String, Object> extra) {
        super(message);
        this.status = status;
        this.code = code;
        this.extra = extra == null ? Map.of() : extra;
    }

    public int status() { return status; }
    public String code() { return code; }
    public Map<String, Object> extra() { return extra; }

    public static ApiException bad(String code, String message) {
        return new ApiException(400, code, message);
    }

    public static ApiException notFound(String what) {
        return new ApiException(404, "NOT_FOUND", what + " không tồn tại hoặc bạn không có quyền truy cập.");
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(409, code, message);
    }
}
