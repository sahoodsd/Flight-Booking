import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function SearchPage() {
  const [filters, setFilters] = useState({
    origin: '',
    destination: '',
    date: '',
    passengers: 1,
    page: 1,
  });
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['flights', filters],
    queryFn: () =>
      api.get('/flights/search', { params: filters }).then((r) => r.data),
  });

  return (
    <div>
      <nav>
        <Link to="/my-bookings">My Bookings</Link>
        {user?.role === 'admin' && <Link to="/admin/dashboard">Admin</Link>}
        <button onClick={logout}>Logout</button>
      </nav>

      <input
        placeholder="Origin (DXB)"
        value={filters.origin}
        onChange={(e) =>
          setFilters({
            ...filters,
            origin: e.target.value.toUpperCase(),
            page: 1,
          })
        }
      />
      <input
        placeholder="Destination (LHR)"
        value={filters.destination}
        onChange={(e) =>
          setFilters({
            ...filters,
            destination: e.target.value.toUpperCase(),
            page: 1,
          })
        }
      />
      <input
        type="date"
        value={filters.date}
        onChange={(e) =>
          setFilters({ ...filters, date: e.target.value, page: 1 })
        }
      />
      <input
        type="number"
        min={1}
        value={filters.passengers}
        onChange={(e) =>
          setFilters({
            ...filters,
            passengers: Number(e.target.value),
            page: 1,
          })
        }
      />

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {data?.flights.map((f: any) => (
            <li key={f.id}>
              {f.airline} — {f.origin} → {f.destination} —{' '}
              {new Date(f.departure_date).toLocaleString()} — $
              {(f.fare_cents / 100).toFixed(2)} — {f.seats_available} seats left
              <button
                onClick={() =>
                  navigate(`/book/${f.id}`, {
                    state: { passengers: filters.passengers },
                  })
                }
              >
                Book
              </button>
            </li>
          ))}
        </ul>
      )}

      {data && (
        <div>
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            Prev
          </button>
          Page {data.pagination.page} of {data.pagination.totalPages}
          <button
            disabled={filters.page >= data.pagination.totalPages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
