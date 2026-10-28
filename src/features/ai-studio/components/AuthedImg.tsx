import { type ImgHTMLAttributes, useEffect } from 'react';
import { useAuthedUrl } from '../lib/authed';

/** <img> cho tệp cần Bearer token (ảnh upload, thumbnail): tải qua fetch rồi hiển thị blob: URL. */
export function AuthedImg({ src, alt = '', onLoadError, ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined;
  /** Gọi khi tải tệp thất bại (vd. 404) để nơi dùng có thể ẩn ảnh. */
  onLoadError?: () => void;
}) {
  const { src: url, error } = useAuthedUrl(src);
  useEffect(() => { if (error) onLoadError?.(); }, [error]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!url) return <span className="ph" aria-hidden style={rest.style} />;
  return <img src={url} alt={alt} {...rest} />;
}
