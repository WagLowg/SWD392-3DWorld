import type { SessionUser } from '../shared/auth';

/** Người dùng đăng nhập (được nạp một lần khi mở Studio, xem main.tsx). */
let current: SessionUser | null = null;
export const setSessionUser = (u: SessionUser | null) => { current = u; };
export const sessionUser = () => current;
