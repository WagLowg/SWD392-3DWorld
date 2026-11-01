import { useQuery } from '@tanstack/react-query'
import { useEffect, useId } from 'react'

type Region = { code: number; name: string }
export type AddressRegion = { province: string; ward: string; district: string }

// Province Open API v2: địa giới hai cấp sau tháng 7/2025.
async function load<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`https://provinces.open-api.vn/api/v2/${path}`, { signal, credentials: 'omit' })
  if (!response.ok) throw new Error('Không tải được danh sách địa chỉ.')
  return response.json()
}

export function AddressRegionFields({ value, onChange, onValidityChange }: {
  value: { province?: string | null; ward?: string | null }
  onChange: (value: AddressRegion) => void
  onValidityChange: (valid: boolean) => void
}) {
  const id = useId()
  const provinces = useQuery({ queryKey: ['address-regions', 'v2', 'provinces'], queryFn: ({ signal }) => load<Region[]>('p/', signal), staleTime: 86_400_000, retry: 1 })
  const province = provinces.data?.find((item) => item.name === value.province)
  const wards = useQuery({
    queryKey: ['address-regions', 'v2', 'wards', province?.code],
    queryFn: ({ signal }) => load<{ wards: Region[] }>(`p/${province!.code}?depth=2`, signal),
    enabled: !!province, staleTime: 86_400_000, retry: 1,
  })
  const valid = !!province && !!wards.data?.wards.some((item) => item.name === value.ward)
  useEffect(() => onValidityChange(valid), [valid, onValidityChange])
  const failed = provinces.isError || (!!province && wards.isError)
  const style = 'w-full rounded-xl border border-line bg-white px-3 py-3 text-sm text-ink disabled:opacity-50'
  return <div className="sm:col-span-2">
    <div className="grid gap-4 sm:grid-cols-2">
      <label htmlFor={`${id}-province`}><span className="mb-1.5 block text-sm">Tỉnh / Thành phố *</span>
        <select id={`${id}-province`} required className={style} value={province?.name ?? ''} disabled={!provinces.data}
          onChange={(event) => onChange({ province: event.target.value, ward: '', district: '' })}>
          <option value="">{provinces.isPending ? 'Đang tải tỉnh/thành phố…' : 'Chọn tỉnh/thành phố'}</option>
          {provinces.data?.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
        </select>
      </label>
      <label htmlFor={`${id}-ward`}><span className="mb-1.5 block text-sm">Phường / Xã *</span>
        <select id={`${id}-ward`} required className={style} value={valid ? value.ward ?? '' : ''} disabled={!province || !wards.data}
          onChange={(event) => onChange({ province: province!.name, ward: event.target.value, district: '' })}>
          <option value="">{province && wards.isPending ? 'Đang tải phường/xã…' : 'Chọn phường/xã'}</option>
          {wards.data?.wards.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
        </select>
      </label>
    </div>
    {!!value.province && !valid && !provinces.isPending && !wards.isFetching && !failed && <p className="mt-2 text-sm text-ink-soft">Vui lòng chọn tỉnh/thành phố và phường/xã trong danh sách hiện hành.</p>}
    {failed && <p role="alert" className="mt-2 text-sm text-danger">Không tải được danh sách địa chỉ. <button type="button" className="underline" onClick={() => { if (provinces.isError) void provinces.refetch(); if (wards.isError) void wards.refetch() }}>Thử lại</button></p>}
  </div>
}
