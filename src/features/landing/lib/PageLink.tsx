import type { AnchorHTMLAttributes, Ref } from 'react'

/**
 * Các CTA của landing dẫn sang module khác (/ai/, /studio/, …) — mỗi module là một trang riêng,
 * nên dùng <a> thường (tải trang mới) thay cho <Link> của react-router.
 */
export function Link({ to, ref, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; ref?: Ref<HTMLAnchorElement> }) {
  return <a ref={ref} href={to} {...rest} />
}
