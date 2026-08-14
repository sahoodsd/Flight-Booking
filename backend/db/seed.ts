import pool from './pool';

const airlines = ['Emirates', 'Etihad', 'Qatar Airways', 'flydubai'];
const routes: [string, string][] = [
  ['DXB', 'LHR'], ['DXB', 'JFK'], ['DXB', 'BOM'], ['DXB', 'CAI'], ['AUH', 'LHR'],
];

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function seed() {
  await pool.query('TRUNCATE flights RESTART IDENTITY CASCADE');

  const flights = [];
  for (let i = 0; i < 20; i++) {
    const [origin, destination] = routes[i % routes.length];
    const seats = i === 0 ? 1 : 5 + (i % 4) * 5; // keep flight #1 at 1 seat for concurrency testing
    flights.push({
      airline: airlines[i % airlines.length],
      origin,
      destination,
      departure_date: daysFromNow(3 + i),
      fare_cents: 30000 + i * 1500,
      seats_total: seats,
      seats_available: seats,
    });
  }

  for (const f of flights) {
    await pool.query(
      `INSERT INTO flights (airline, origin, destination, departure_date, fare_cents, seats_total, seats_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [f.airline, f.origin, f.destination, f.departure_date, f.fare_cents, f.seats_total, f.seats_available]
    );
  }

  console.log(`seeded ${flights.length} flights`);
  await pool.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});