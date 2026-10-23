package com.threedworld.common;

import java.security.SecureRandom;
import java.util.Base64;

public final class Ids {
    private static final SecureRandom RND = new SecureRandom();
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private Ids() {}

    /** Id dạng prefix_xxxxxxxxxxxx (9 byte ngẫu nhiên, base64url). */
    public static String id(String prefix) {
        byte[] b = new byte[9];
        RND.nextBytes(b);
        return prefix + "_" + Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    /** Mã hiển thị ngắn (không có ký tự dễ nhầm 0/O, 1/I). */
    public static String code(int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(CODE_ALPHABET.charAt(RND.nextInt(CODE_ALPHABET.length())));
        return sb.toString();
    }

    public static long now() {
        return System.currentTimeMillis();
    }
}
