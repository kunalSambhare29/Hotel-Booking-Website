// Edge-case tests (run: npm test). Uses a temporary in-memory database.
process.env.DB_FILE = ':memory:';
const assert = require('assert');
const app = require('./app');

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const call = async (m, u, b) => {
    const r = await fetch(base + u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
    return { status: r.status, body: await r.json() };
  };
  const d = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  let ok = 0; const t = (name, cond) => { assert(cond, name); console.log('PASS', name); ok++; };

  const rooms = (await call('GET', '/api/rooms')).body;
  t('seeded rooms listed', rooms.length === 6);
  t('add room', (await call('POST', '/api/rooms', { room_no: '501', type: 'Suite', price: 9000 })).status === 201);
  t('duplicate room number rejected', (await call('POST', '/api/rooms', { room_no: '501', type: 'Suite', price: 9000 })).status === 409);
  t('negative price rejected', (await call('POST', '/api/rooms', { room_no: '502', type: 'Suite', price: -5 })).status === 400);

  const id = rooms[0].id;
  const b1 = await call('POST', '/api/bookings', { room_id: id, guest_name: 'Asha', check_in: d(5), check_out: d(8) });
  t('book room', b1.status === 201);
  t('overlap rejected', (await call('POST', '/api/bookings', { room_id: id, guest_name: 'Ravi', check_in: d(7), check_out: d(10) })).status === 409);
  t('enclosed range rejected', (await call('POST', '/api/bookings', { room_id: id, guest_name: 'Ravi', check_in: d(6), check_out: d(7) })).status === 409);
  t('back-to-back stay allowed', (await call('POST', '/api/bookings', { room_id: id, guest_name: 'Ravi', check_in: d(8), check_out: d(10) })).status === 201);
  t('checkout before checkin rejected', (await call('POST', '/api/bookings', { room_id: id, guest_name: 'X', check_in: d(9), check_out: d(9) })).status === 400);
  t('past check-in rejected', (await call('POST', '/api/bookings', { room_id: id, guest_name: 'X', check_in: d(-2), check_out: d(1) })).status === 400);
  t('missing guest rejected', (await call('POST', '/api/bookings', { room_id: id, guest_name: ' ', check_in: d(20), check_out: d(21) })).status === 400);
  t('unknown room rejected', (await call('POST', '/api/bookings', { room_id: 9999, guest_name: 'X', check_in: d(20), check_out: d(21) })).status === 404);

  const s = (await call('GET', `/api/rooms/search?type=Single&check_in=${d(5)}&check_out=${d(8)}`)).body;
  t('search excludes booked room', s.length === 1 && s[0].id !== id);
  t('cancel booking', (await call('DELETE', `/api/bookings/${b1.body.id}`)).status === 200);
  t('cancel non-existent booking -> 404', (await call('DELETE', '/api/bookings/9999')).status === 404);
  t('rebook after cancel', (await call('POST', '/api/bookings', { room_id: id, guest_name: 'Meera', check_in: d(5), check_out: d(8) })).status === 201);

  console.log(`\nAll ${ok} tests passed`);
  server.close();
});
