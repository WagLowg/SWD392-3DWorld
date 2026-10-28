import { ArrowRight, Boxes, FileCheck2, Hammer, Lock, Receipt, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Btn, FilterTabs, Hero, MockNotice, RuleBox, Section } from '../../../shared/ui/kit'
import { useDesignStatus } from '../hooks/useDesign'

const STEPS = [
  { icon: Sparkles, t: 'Khởi tạo yêu cầu', b: 'Mô tả ý tưởng, tải ảnh phác thảo và kích thước mong muốn.' },
  { icon: Receipt, t: 'Báo giá & kỹ thuật', b: 'Kỹ sư thẩm định brief và gửi báo giá cố định trong 24h.' },
  { icon: Hammer, t: 'Chế tác & hiệu chỉnh', b: 'Dựng hình, gửi bản thảo, 2 vòng chỉnh sửa miễn phí.' },
  { icon: FileCheck2, t: 'Nghiệm thu & Vault', b: 'Tải tệp STL/GLB/STEP, lưu vào thư viện riêng tư.' },
]

const PORTFOLIO = [
  { t: 'Tượng Robot Chibi Art Toy', tag: 'Art toys', tone: 'from-violet-soft to-peach' },
  { t: 'Vỏ Case Bàn Phím Cơ Khí', tag: 'Kỹ thuật & vỏ máy', tone: 'from-teal-soft to-mint' },
  { t: 'Mascot Thương Hiệu Poly', tag: 'Mascot PBR', tone: 'from-butter to-peach' },
  { t: 'Gấu Phi Hành Gia Nam Châm', tag: 'Art toys', tone: 'from-peach to-violet-soft' },
]

/** DS-001 · Trang Chủ Dịch Vụ Thiết Kế 3D */
export function DesignHomePage() {
  const status = useDesignStatus()
  const [tab, setTab] = useState('')
  useEffect(() => {
    document.title = 'Dịch vụ thiết kế 3D · 3DWorld'
  }, [])
  const open = status.data?.accepting !== false

  return (
    <>
      <MockNotice api="/api/design-requests" />
      <Hero
        code="DS-001"
        eyebrow="Dịch vụ thiết kế 3D nội bộ"
        title="Biến Ý Tưởng & Bản Phác Thảo"
        accent="Thành Mô Hình 3D Chuyên Nghiệp."
        description="Đội kỹ sư dựng hình 3DWorld điêu khắc, tối ưu lưới in và bàn giao tệp gốc thuộc quyền sở hữu của bạn."
        actions={
          <>
            <Btn to={open ? '/design/new' : '/design/unavailable'} variant="primary" icon={ArrowRight}>
              Tạo yêu cầu thiết kế
            </Btn>
            <Btn to="/design/requests" variant="white">
              Yêu cầu của tôi
            </Btn>
          </>
        }
      />
      <Section title="Quy trình yêu cầu – báo giá – bàn giao 4 bước" className="mt-8">
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map(({ icon: Icon, t, b }, i) => (
            <li key={t} className="rounded-[1.75rem] bg-surface-low p-5">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-violet text-white">
                <Icon size={18} />
              </span>
              <p className="mt-3 font-display font-bold">
                {i + 1}. {t}
              </p>
              <p className="text-sm text-ink-soft">{b}</p>
            </li>
          ))}
        </ol>
      </Section>
      <div className="mt-6">
        <FilterTabs
          value={tab}
          onChange={setTab}
          dark
          options={[
            { value: '', label: 'Tất cả dự án' },
            { value: 'Art toys', label: 'Art Toys' },
            { value: 'Kỹ thuật & vỏ máy', label: 'Kỹ thuật & vỏ máy' },
            { value: 'Mascot PBR', label: 'Mascot PBR' },
          ]}
        />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PORTFOLIO.filter((p) => !tab || p.tag === tab).map((p) => (
          <article key={p.t} className="rounded-[2rem] bg-white/95 p-3 shadow-soft">
            <div className={`grid aspect-square place-items-center rounded-[1.6rem] bg-gradient-to-br ${p.tone}`}>
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/85 text-violet">
                <Boxes size={28} />
              </span>
            </div>
            <p className="px-2 pt-3 font-display font-bold">{p.t}</p>
            <p className="px-2 pb-2 text-xs text-ink-soft">{p.tag}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { icon: ShieldCheck, t: '100% quyền sở hữu khách hàng', b: 'Tệp gốc và quyền thương mại thuộc về bạn sau nghiệm thu.' },
          { icon: Lock, t: 'Lưu trữ Private Creator Vault', b: 'Tệp bàn giao lưu riêng tư trong Thư viện 3D của bạn.' },
          { icon: Receipt, t: 'Báo giá cố định, minh bạch', b: 'Đặt cọc 50%, phần còn lại khi nghiệm thu.' },
        ].map(({ icon: Icon, t, b }) => (
          <div key={t} className="rounded-[1.75rem] bg-white/90 p-5 shadow-soft">
            <Icon size={20} className="text-violet" />
            <p className="mt-3 font-display font-bold">{t}</p>
            <p className="text-sm text-ink-soft">{b}</p>
          </div>
        ))}
      </div>
      <RuleBox
        title="Quy chuẩn bản quyền & phạm vi V1"
        rules={['Không nhận thiết kế sao chép nhân vật có bản quyền khi không có giấy phép.', 'Phạm vi công việc khoá theo báo giá; thay đổi lớn cần báo giá phụ lục.', 'Mỗi dự án gồm 2 vòng chỉnh sửa miễn phí.', 'Tệp bàn giao kiểm tra in (watertight) trước khi giao.']}
      />
    </>
  )
}
