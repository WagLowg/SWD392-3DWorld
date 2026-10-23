package com.threedworld.auth;

/** Người dùng của request hiện tại. Khai báo làm tham số controller để bắt buộc đăng nhập. */
public record CurrentUser(String id, String email, String name, String role) {
    public static final String ATTR = "threedworld.user";
}
