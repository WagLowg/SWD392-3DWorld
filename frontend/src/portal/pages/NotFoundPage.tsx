import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="empty-page">
      <span>404</span>
      <h1>Không tìm thấy màn hình</h1>
      <p>Route này chưa có trong skeleton nghiệp vụ Version 1.</p>
      <Link className="primary-link" to="/">
        Về tổng quan
      </Link>
    </div>
  )
}
