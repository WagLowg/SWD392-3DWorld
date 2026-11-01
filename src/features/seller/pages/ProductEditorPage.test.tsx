import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { ProductEditorPage } from './ProductEditorPage'

vi.mock('../hooks/useSeller', () => ({
  useSellerProduct: () => ({ data: undefined }),
  useSaveProduct: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveProductMedia: () => ({ mutate: vi.fn(), isPending: false }),
  useUploadProductMedia: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

afterEach(cleanup)

it('updates actual SKU inputs every time the user changes title, material, color or size', async () => {
  render(<MemoryRouter><ProductEditorPage /></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Tên tác phẩm *'), { target: { value: 'Huggy' } })
  fireEvent.change(screen.getByLabelText('Chất liệu biến thể 1'), { target: { value: 'Resin SLA' } })
  fireEvent.change(screen.getByLabelText('Màu sắc biến thể 1'), { target: { value: 'Đen' } })
  fireEvent.change(screen.getByLabelText('Kích cỡ biến thể 1'), { target: { value: 'S' } })
  const first = screen.getByLabelText('SKU biến thể 1') as HTMLInputElement
  await waitFor(() => expect(first.value).toMatch(/^HUGGY-RESIN-BLACK-S-[A-Z0-9]{6}$/))
  const code = first.value.split('-').at(-1)

  fireEvent.change(screen.getByLabelText('Chất liệu biến thể 1'), { target: { value: 'FDM PLA' } })
  fireEvent.change(screen.getByLabelText('Màu sắc biến thể 1'), { target: { value: 'Đỏ' } })
  await waitFor(() => expect(first).toHaveValue(`HUGGY-FDM-RED-S-${code}`))

  fireEvent.click(screen.getByRole('button', { name: 'Thêm biến thể' }))
  fireEvent.change(screen.getByLabelText('Màu sắc biến thể 2'), { target: { value: 'Trắng' } })
  fireEvent.change(screen.getByLabelText('Kích cỡ biến thể 2'), { target: { value: 'S' } })
  const second = screen.getByLabelText('SKU biến thể 2')
  await waitFor(() => expect(second).toHaveValue(`HUGGY-RESIN-WHITE-S-${code}`))
  expect(first).toHaveValue(`HUGGY-FDM-RED-S-${code}`)

  fireEvent.change(screen.getByLabelText('Tên tác phẩm *'), { target: { value: 'Bunny' } })
  fireEvent.change(screen.getByLabelText('Kích cỡ biến thể 1'), { target: { value: 'L' } })
  await waitFor(() => expect(first).toHaveValue(`BUNNY-FDM-RED-L-${code}`))
  expect(second).toHaveValue(`BUNNY-RESIN-WHITE-S-${code}`)
})
