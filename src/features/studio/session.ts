/**
 * [Giải thích] Giữ thông tin người dùng đăng nhập (nạp một lần ở main.tsx).
 */
import type { SessionUser } from '../../shared/session/session';

/** Người dùng đăng nhập (được nạp một lần khi mở Studio, xem main.tsx). */
let current: SessionUser | null = null;
export const setSessionUser = (u: SessionUser | null) => { current = u; };
export const sessionUser = () => current;
