package com.threedworld.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> api(ApiException e) {
        Map<String, Object> err = new LinkedHashMap<>();
        err.put("code", e.code());
        err.put("message", e.getMessage());
        err.putAll(e.extra());
        return ResponseEntity.status(e.status()).body(Map.of("error", err));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> tooLarge(MaxUploadSizeExceededException e) {
        return api(ApiException.bad("FILE_TOO_LARGE", "Tệp vượt quá dung lượng cho phép."));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestPartException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<Map<String, Object>> badRequest(Exception e) {
        return api(ApiException.bad("BAD_REQUEST", "Dữ liệu gửi lên không hợp lệ."));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> noResource(Exception e) {
        return api(new ApiException(404, "NOT_FOUND", "API không tồn tại."));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> method(Exception e) {
        return api(new ApiException(405, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> other(Exception e) {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        log.error("[error {}]", traceId, e);
        return api(new ApiException(500, "INTERNAL", "Lỗi máy chủ. Vui lòng thử lại.", Map.of("traceId", traceId)));
    }
}
