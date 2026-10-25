import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, MapPin, PackageCheck, ShieldCheck, } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Metric, PageHero, Panel, StateBlock, StatusPill } from '../components/PodUi'
import { screenById } from '../screens'
import { podService } from '../services/pod.service'
import type { PodAddress } from '../types'

export function ProfilePage() {
  const query = useQuery({ queryKey: ['pod', 'profile'], queryFn: ({ signal }) => podService.getProfile(signal) })
  const [form, setForm] = useState({ fullName: '', phone: '', dateOfBirth: '' })
  useEffect(() => { if (query.data) setForm({ fullName: query.data.fullName ?? '', phone: query.data.phone ?? '', dateOfBirth: query.data.dateOfBirth ?? '' }) }, [query.data])
  const client = useQueryClient()
  const mutation = useMutation({ mutationFn: () => podService.updateProfile(form), onSuccess: () => client.invalidateQueries({ queryKey: ['pod', 'profile'] }) })
  return <div className="pod-page"><PageHero screen={screenById(10)} />
    {query.isLoading && <StateBlock state="loading" title="Đang tải hồ sơ" body="Kết nối tài khoản 3DWorld dùng chung." />}
    {query.isError && <StateBlock state="error" title="Chưa tải được hồ sơ" body={query.error.message} />}
    {query.data && <><div className="pod-metrics"><Metric value={query.data.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'} label="Email" note={query.data.email} /><Metric value="Customer" label="Quyền in POD" note="Không cần hồ sơ seller" /><Metric value="AES-256" label="Bảo vệ dữ liệu" note="Hồ sơ dùng chung" /></div><div className="pod-content-grid"><Panel title="Thông tin cá nhân"><form className="pod-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate() }}><label><span>Họ và tên</span><input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label><label><span>Email</span><input disabled value={query.data.email} /></label><div className="pod-form-row"><label><span>Số điện thoại</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label><span>Ngày sinh</span><input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></label></div>{mutation.isError && <StateBlock state="error" title="Không lưu được hồ sơ" body={mutation.error.message} />}{mutation.isSuccess && <StateBlock state="success" title="Đã lưu hồ sơ" body="Thông tin tài khoản đã được cập nhật." />}<button type="submit" className="pod-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button></form></Panel><aside className="pod-side-stack"><Panel title="Quyền in độc lập"><div className="pod-protection"><ShieldCheck /><strong>Customer POD</strong><p>Bạn có thể tạo yêu cầu in mà không cần xác minh người bán.</p></div></Panel><Panel title="Hoạt động"><div className="pod-mini-stats"><span><b>04</b> Yêu cầu</span><span><b>01</b> Đang in</span><span><b>06</b> Tệp hợp lệ</span></div></Panel></aside></div></>}
  </div>
}

const emptyAddress: Omit<PodAddress, 'id' | 'addressId' | 'isDefault'> = { recipientName: '', phone: '', addressLine: '', city: '', province: '', district: '', ward: '' }

export function AddressesPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['pod', 'addresses'], queryFn: ({ signal }) => podService.listAddresses(signal) })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyAddress)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['pod', 'addresses'] })
  const create = useMutation({ mutationFn: () => podService.createAddress(form), onSuccess: async () => { await refresh(); setForm(emptyAddress); setOpen(false) } })
  const makeDefault = useMutation({ mutationFn: (id: number) => podService.setDefaultAddress(id), onSuccess: refresh })
  return <div className="pod-page"><PageHero screen={screenById(12)} action={<button type="button" className="pod-primary" onClick={() => setOpen((value) => !value)}>+ Thêm địa chỉ mới</button>} />
    <div className="pod-policy"><PackageCheck /><div><strong>Snapshot giao nhận</strong><p>Đơn đã khóa giữ nguyên địa chỉ tại thời điểm xác nhận; thay đổi chỉ áp dụng cho đơn tương lai.</p></div></div>
    {query.isLoading && <StateBlock state="loading" title="Đang tải địa chỉ" body="Kết nối hồ sơ giao nhận..." />}{query.isError && <StateBlock state="error" title="Không tải được địa chỉ" body={query.error.message} />}
    {open && <Panel title="Địa chỉ giao hàng mới"><form className="pod-form" onSubmit={(event) => { event.preventDefault(); create.mutate() }}><div className="pod-form-row"><label><span>Người nhận</span><input required value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} /></label><label><span>Số điện thoại</span><input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label></div><label><span>Địa chỉ chi tiết</span><input required value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} /></label><div className="pod-form-row"><label><span>Tỉnh/Thành phố</span><input value={form.province ?? ''} onChange={(e) => setForm({ ...form, province: e.target.value })} /></label><label><span>Quận/Huyện</span><input value={form.district ?? ''} onChange={(e) => setForm({ ...form, district: e.target.value })} /></label></div>{create.isError && <StateBlock state="error" title="Không thêm được địa chỉ" body={create.error.message} />}<button type="submit" className="pod-primary" disabled={create.isPending}>Lưu địa chỉ</button></form></Panel>}
    <div className="pod-address-grid">{query.data?.map((address) => { const id = address.id ?? address.addressId; return <Panel key={id ?? `${address.addressLine}-${address.recipientName}-${address.phone ?? ''}`}><div className="pod-address-head"><span className="pod-record-icon"><MapPin /></span>{address.isDefault && <StatusPill tone="green"><CheckCircle2 size={13} /> Mặc định</StatusPill>}</div><h2>{address.recipientName}</h2><p>{address.phone}</p><p>{[address.addressLine, address.ward, address.district, address.province || address.city].filter(Boolean).join(', ')}</p>{!address.isDefault && id && <button type="button" className="pod-secondary" onClick={() => makeDefault.mutate(id)}>Đặt làm mặc định</button>}</Panel>})}</div>
    {!query.isLoading && !query.isError && !query.data?.length && <StateBlock state="empty" title="Chưa có địa chỉ" body="Thêm địa chỉ để dùng cho yêu cầu in trong tương lai." />}
  </div>
}
