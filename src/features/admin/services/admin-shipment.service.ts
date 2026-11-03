import { useQuery } from '@tanstack/react-query'
import { listOperationalShipments } from '../../staff/services/staff.service'

const adminShipmentQueryKey = ['admin', 'shipments'] as const

export function useAdminShipments() {
  const query = useQuery({
    queryKey: adminShipmentQueryKey,
    // Backend currently exposes the system-wide operational feed under /staff,
    // but explicitly authorizes both PRINT_STAFF and ADMIN.
    queryFn: ({ signal }) => listOperationalShipments('/api/staff/shipments', signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  return {
    shipments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
