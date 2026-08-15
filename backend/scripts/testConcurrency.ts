const BASE = 'http://localhost:4000';

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.accessToken;
}

function makePassenger(n: number) {
  return {
    full_name: `Test Passenger ${n}`,
    date_of_birth: '1990-01-01',
    nationality: 'AE',
    passport_number: `P${n}23456`,
    email: `passenger${n}@test.com`,
    contact_number: '+971500000000',
  };
}

async function bookFlight1(token: string, tag: string) {
  const res = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ flight_id: 1, passengers: [makePassenger(1)] }),
  });
  const data = await res.json();
  console.log(`[${tag}] status=${res.status}`, data);
}

async function main() {
  const token = await login('test@test.com', 'password123'); // use an existing test user
  await Promise.all([
    bookFlight1(token, 'request A'),
    bookFlight1(token, 'request B'),
  ]);
}

main();