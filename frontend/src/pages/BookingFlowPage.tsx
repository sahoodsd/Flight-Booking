import { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { PaymentStep } from '../components/PaymentStep';

interface Passenger {
  full_name: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  email: string;
  contact_number: string;
}
const emptyPassenger: Passenger = {
  full_name: '',
  date_of_birth: '',
  nationality: '',
  passport_number: '',
  email: '',
  contact_number: '',
};

export default function BookingFlowPage() {
  const { flightId } = useParams();
  const location = useLocation();
  const passengerCount = (location.state as any)?.passengers || 1;

  const [passengers, setPassengers] = useState<Passenger[]>(
    Array.from({ length: passengerCount }, () => ({ ...emptyPassenger })),
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState('');

  function updatePassenger(
    index: number,
    field: keyof Passenger,
    value: string,
  ) {
    setPassengers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/bookings', {
        flight_id: Number(flightId),
        passengers,
      });
      setClientSecret(res.data.booking.client_secret);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Booking failed');
    }
  }

  if (clientSecret) return <PaymentStep clientSecret={clientSecret} />;

  return (
    <form onSubmit={handleSubmit}>
      <h1>Passenger Details</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {passengers.map((p, i) => (
        <fieldset key={i}>
          <legend>Passenger {i + 1}</legend>
          <input
            placeholder="Full name"
            value={p.full_name}
            onChange={(e) => updatePassenger(i, 'full_name', e.target.value)}
            required
          />
          <input
            type="date"
            value={p.date_of_birth}
            onChange={(e) =>
              updatePassenger(i, 'date_of_birth', e.target.value)
            }
            required
          />
          <input
            placeholder="Nationality"
            value={p.nationality}
            onChange={(e) => updatePassenger(i, 'nationality', e.target.value)}
            required
          />
          <input
            placeholder="Passport number"
            value={p.passport_number}
            onChange={(e) =>
              updatePassenger(i, 'passport_number', e.target.value)
            }
            required
          />
          <input
            placeholder="Email"
            type="email"
            value={p.email}
            onChange={(e) => updatePassenger(i, 'email', e.target.value)}
            required
          />
          <input
            placeholder="Contact number"
            value={p.contact_number}
            onChange={(e) =>
              updatePassenger(i, 'contact_number', e.target.value)
            }
            required
          />
        </fieldset>
      ))}
      <button type="submit">Continue to Payment</button>
    </form>
  );
}
