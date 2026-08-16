import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function MyBookingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get('/bookings/me').then((r) => r.data),
    refetchInterval: (query) =>
      // keep polling only while something's still pending payment confirmation
      query.state.data?.bookings?.some((b: any) => b.status === 'pending')
        ? 3000
        : false,
  });

  async function cancel(id: number) {
    try {
      await api.post(`/bookings/${id}/cancel`);
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Cancellation failed');
    }
  }

  if (isLoading) return <p>Loading...</p>;

  return (
    <ul>
      {data.bookings.map((b: any) => (
        <li key={b.id}>
          {b.airline} {b.origin} → {b.destination} — {b.status} — $
          {(b.total_amount_cents / 100).toFixed(2)}
          {b.status === 'confirmed' && (
            <button onClick={() => cancel(b.id)}>Cancel</button>
          )}
        </li>
      ))}
    </ul>
  );
}
