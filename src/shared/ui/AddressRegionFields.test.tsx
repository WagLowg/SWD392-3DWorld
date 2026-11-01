import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { AddressRegionFields, type AddressRegion } from './AddressRegionFields'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function Form() {
  const [value, setValue] = useState<AddressRegion>({ province: '', ward: '', district: '' })
  const [valid, setValid] = useState(false)
  return <><AddressRegionFields value={value} onChange={setValue} onValidityChange={setValid} /><button disabled={!valid}>Lưu</button></>
}
it('clears the ward when switching provinces and requires a valid selection', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('p/')
    ? [{ code: 1, name: 'Hà Nội' }, { code: 79, name: 'Hồ Chí Minh' }]
    : { wards: [{ code: 1, name: url.includes('/1?') ? 'Ba Đình' : 'Sài Gòn' }] } })))
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })}><Form /></QueryClientProvider>)
  expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled()
  await screen.findByRole('option', { name: 'Hà Nội' })
  fireEvent.change(screen.getByLabelText('Tỉnh / Thành phố *'), { target: { value: 'Hà Nội' } })
  await screen.findByRole('option', { name: 'Ba Đình' })
  fireEvent.change(screen.getByLabelText('Phường / Xã *'), { target: { value: 'Ba Đình' } })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu' })).toBeEnabled())
  fireEvent.change(screen.getByLabelText('Tỉnh / Thành phố *'), { target: { value: 'Hồ Chí Minh' } })
  expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled()
  expect(screen.getByLabelText('Phường / Xã *')).toHaveValue('')
  await screen.findByRole('option', { name: 'Sài Gòn' })
  expect(screen.queryByRole('option', { name: 'Ba Đình' })).not.toBeInTheDocument()
})
