// Database layer: SQLite schema with two related tables (Rooms 1---* Bookings)
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.DB_FILE || path.join(__dirname, 'hotel.db'));
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS rooms (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  room_no TEXT    NOT NULL UNIQUE,
  type    TEXT    NOT NULL CHECK (type IN ('Single','Double','Deluxe','Suite')),
  price   REAL    NOT NULL CHECK (price > 0)
);
CREATE TABLE IF NOT EXISTS bookings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id    INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  guest_name TEXT    NOT NULL,
  check_in   TEXT    NOT NULL,  -- YYYY-MM-DD
  check_out  TEXT    NOT NULL,  -- YYYY-MM-DD
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (check_out > check_in)
);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_id, check_in, check_out);
`);

// Seed a few rooms on first run
if (db.prepare('SELECT COUNT(*) c FROM rooms').get().c === 0) {
  const ins = db.prepare('INSERT INTO rooms (room_no, type, price) VALUES (?,?,?)');
  [['101','Single',1500],['102','Single',1500],['201','Double',2500],['202','Double',2600],
   ['301','Deluxe',3800],['401','Suite',6500]].forEach(r => ins.run(...r));
}

module.exports = db;
