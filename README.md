# Hotel Room Booking System
Express.js + SQLite + HTML/CSS/JavaScript (Fetch API)

## Run
    npm install
    npm start          # http://localhost:3000
    npm test           # 16 edge-case tests (overlap, duplicates, bad dates, ...)

## REST API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/rooms | List all rooms (+ today's status) |
| GET | /api/rooms/search?type=&check_in=&check_out= | Search available rooms |
| POST | /api/rooms | Add room `{room_no,type,price}` |
| PUT | /api/rooms/:id | Update type/price |
| DELETE | /api/rooms/:id | Delete room (cascades bookings) |
| GET | /api/bookings | List bookings |
| POST | /api/bookings | Book `{room_id,guest_name,check_in,check_out}` |
| DELETE | /api/bookings/:id | Cancel booking |

## Schema
rooms(id, room_no UNIQUE, type, price)  1 --- *  bookings(id, room_id FK, guest_name, check_in, check_out, created_at)

Double-booking rule: a new stay [in, out) is rejected if any existing booking has
`existing.check_in < new.out AND existing.check_out > new.in`. The check and insert run in one transaction.
