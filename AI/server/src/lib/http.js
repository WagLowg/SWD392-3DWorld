export class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const notFound = (what = 'Tài nguyên') =>
  new HttpError(404, 'NOT_FOUND', `${what} không tồn tại hoặc bạn không có quyền truy cập.`);
export const bad = (code, message, extra) => new HttpError(400, code, message, extra);

/** Bọc handler async để lỗi được chuyển tới errorHandler. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: { code: 'FILE_TOO_LARGE', message: 'Ảnh vượt quá 20 MB.' } });
  }
  const traceId = Math.random().toString(36).slice(2, 10);
  console.error(`[error ${traceId}]`, err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Lỗi máy chủ. Vui lòng thử lại.', traceId } });
}
