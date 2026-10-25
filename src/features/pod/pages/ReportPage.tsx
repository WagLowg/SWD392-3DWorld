import { useMutation } from '@tanstack/react-query'
import { FileWarning, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { PageHero, Panel, StateBlock } from '../components/PodUi'
import { screenById } from '../screens'
import { podService } from '../services/pod.service'

export function ReportNewPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const mutation = useMutation({ mutationFn: () => podService.createGeneralReport(name, description) })
  return <div className="pod-page"><PageHero screen={screenById(31)} />
    <div className="pod-content-grid"><Panel title="Thông tin báo cáo" hint="API hiện nhận tên và mô tả báo cáo chung"><form className="pod-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}><label><span>Tiêu đề vụ việc</span><input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Nghi ngờ sao chép tệp mô hình" /></label><label><span>Mô tả chi tiết</span><textarea required minLength={20} maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Trình bày đối tượng, mốc thời gian và bằng chứng..." /></label><label><span>Bằng chứng kỹ thuật</span><div className="pod-dropzone compact"><FileWarning /><strong>Upload chưa được backend hỗ trợ</strong><span>Giao diện giữ chỗ cho evidence_key</span><input type="file" disabled /></div></label>{mutation.isError && <StateBlock state="error" title="Không gửi được báo cáo" body={mutation.error.message} />}{mutation.isSuccess && <StateBlock state="success" title="Đã gửi báo cáo" body="Hệ thống đã ghi nhận báo cáo chung. Bằng chứng chưa được tải lên vì thiếu API." />}<button type="submit" className="pod-primary" disabled={mutation.isPending}>Gửi báo cáo</button></form></Panel><Panel title="Quy chuẩn thẩm định"><div className="pod-protection"><ShieldCheck /><strong>SLA dự kiến 24–48 giờ</strong><p>Báo cáo vi phạm độc lập với quy trình hoàn tiền và khiếu nại kỹ thuật POD.</p></div></Panel></div>
  </div>
}
