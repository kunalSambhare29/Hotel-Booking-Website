// Frontend logic: talks to the Express API with fetch (no page reloads)
const $ = id => document.getElementById(id);
let selectedRoom = null;

async function api(method, url, body) {
  const res = await fetch(url, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
function say(el, text, kind) { el.textContent = text; el.className = 'msg ' + (kind || ''); }
const money = n => '₹' + Number(n).toLocaleString('en-IN');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---- Rooms ----
function renderRooms(rooms) {
  const body = $('rooms');
  if (!rooms.length) { body.innerHTML = '<tr><td colspan="5" class="empty">No rooms match. Try other dates or a different type.</td></tr>'; return; }
  body.innerHTML = rooms.map(r => `
    <tr class="${selectedRoom && selectedRoom.id === r.id ? 'selected' : ''}">
      <td>${esc(r.room_no)}</td><td>${esc(r.type)}</td><td>${money(r.price)}</td>
      <td>${r.status ? `<span class="tag ${r.status}">${r.status}</span>` : '–'}</td>
      <td><button class="pick" data-id="${r.id}" data-no="${esc(r.room_no)}" data-type="${esc(r.type)}">Select</button>
          <button class="danger" data-del-room="${r.id}" aria-label="Delete room ${esc(r.room_no)}">Delete</button></td>
    </tr>`).join('');
}
async function loadRooms() {
  renderRooms(await api('GET', '/api/rooms'));
}
async function searchRooms() {
  const type = $('s-type').value, ci = $('s-in').value, co = $('s-out').value;
  const q = new URLSearchParams();
  if (type) q.set('type', type);
  if (ci || co) { q.set('check_in', ci); q.set('check_out', co); }
  try {
    const rooms = await api('GET', '/api/rooms/search?' + q);
    renderRooms(rooms);
    say($('s-msg'), `${rooms.length} room(s) found.`, 'ok');
    if (ci && co) { $('b-in').value = ci; $('b-out').value = co; }
  } catch (e) { say($('s-msg'), e.message, 'err'); }
}
$('s-btn').onclick = searchRooms;
$('s-clear').onclick = () => { $('s-type').value = $('s-in').value = $('s-out').value = ''; say($('s-msg'), ''); loadRooms(); };

$('rooms').addEventListener('click', async e => {
  const pick = e.target.closest('.pick'), del = e.target.closest('[data-del-room]');
  if (pick) {
    selectedRoom = { id: +pick.dataset.id, no: pick.dataset.no, type: pick.dataset.type };
    $('chosen').innerHTML = `Booking <b>Room ${esc(selectedRoom.no)}</b> (${esc(selectedRoom.type)}).`;
    document.querySelectorAll('#rooms tr').forEach(tr => tr.classList.remove('selected'));
    pick.closest('tr').classList.add('selected');
    $('b-guest').focus();
  }
  if (del && confirm('Delete this room and all of its bookings?')) {
    try {
      await api('DELETE', '/api/rooms/' + del.dataset.delRoom);
      if (selectedRoom && selectedRoom.id === +del.dataset.delRoom) selectedRoom = null;
      await Promise.all([loadRooms(), loadBookings()]);
    } catch (err) { say($('s-msg'), err.message, 'err'); }
  }
});

$('room-form').onsubmit = async e => {
  e.preventDefault();
  try {
    await api('POST', '/api/rooms', { room_no: $('r-no').value, type: $('r-type').value, price: $('r-price').value });
    say($('r-msg'), `Room ${$('r-no').value} added.`, 'ok');
    e.target.reset(); loadRooms();
  } catch (err) { say($('r-msg'), err.message, 'err'); }
};

// ---- Bookings ----
async function loadBookings() {
  const list = await api('GET', '/api/bookings');
  $('bookings').innerHTML = list.length ? list.map(b => `
    <tr><td>${esc(b.guest_name)}</td><td>${esc(b.room_no)} (${esc(b.type)})</td>
      <td>${b.check_in}</td><td>${b.check_out}</td><td>${b.nights}</td><td>${money(b.nights * b.price)}</td>
      <td><button class="danger" data-cancel="${b.id}">Cancel booking</button></td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">No bookings yet. Select a room above to make the first one.</td></tr>';
}
$('book-form').onsubmit = async e => {
  e.preventDefault();
  if (!selectedRoom) return say($('b-msg'), 'Select a room from the list first.', 'err');
  try {
    await api('POST', '/api/bookings', { room_id: selectedRoom.id, guest_name: $('b-guest').value,
      check_in: $('b-in').value, check_out: $('b-out').value });
    say($('b-msg'), `Room ${selectedRoom.no} booked for ${$('b-guest').value}.`, 'ok');
    $('b-guest').value = '';
    await Promise.all([loadRooms(), loadBookings()]);
  } catch (err) { say($('b-msg'), err.message, 'err'); }
};
$('bookings').addEventListener('click', async e => {
  const b = e.target.closest('[data-cancel]');
  if (!b || !confirm('Cancel this booking?')) return;
  try { await api('DELETE', '/api/bookings/' + b.dataset.cancel); await Promise.all([loadRooms(), loadBookings()]); }
  catch (err) { say($('b-msg'), err.message, 'err'); }
});

const t = new Date().toISOString().slice(0, 10);
['s-in', 's-out', 'b-in', 'b-out'].forEach(id => $(id).min = t);
loadRooms(); loadBookings();
