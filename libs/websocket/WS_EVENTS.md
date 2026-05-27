# WebSocket Events - Rihla

## Connection

All 3 backend apps expose WebSocket on the same port as HTTP:
- Admin: `http://localhost:3000`
- Company: `http://localhost:3001`
- Customer: `http://localhost:3002`

Use `socket.io-client` to connect.

## Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join:room` | `string` (room name) | Join a room to receive targeted events |
| `leave:room` | `string` (room name) | Leave a room |
| `watch:seats` | `string` (tripId) | Start receiving seat updates for a trip |
| `unwatch:seats` | `string` (tripId) | Stop receiving seat updates |

## Room Names

| Room | Description |
|------|-------------|
| `admin` | All admin users |
| `company:{companyId}` | Specific company users |
| `customer:{customerId}` | Specific customer users |
| `public` | General public (unauthenticated) |
| `trip:{tripId}` | Trip seat watchers |

## Server → Client

### Booking Events
| Event | Payload | Target |
|-------|---------|--------|
| `booking:created` | `{ bookingId, status }` | Customer room |
| `booking:cancelled` | `{ bookingId, status }` | Customer room |
| `booking:confirmed` | `{ bookingId }` | Admin + customer rooms |

### Payment Events
| Event | Payload | Target |
|-------|---------|--------|
| `payment:created` | `{ bookingId, paymentId, status }` | Company room |
| `payment:pending` | `{ bookingId, paymentId }` | Admin room |
| `payment:confirmed` | `{ paymentId, bookingId }` | Admin + customer rooms |
| `payment:rejected` | `{ paymentId, bookingId }` | Admin + customer rooms |

### Seat Events
| Event | Payload | Target |
|-------|---------|--------|
| `seat:booked` | `{ tripId, seatNumbers }` | Public |
| `seat:held` | `{ tripId, seatNumbers }` | Public |
| `seat:released` | `{ tripId, seatNumbers }` | Public |
| `seat:updated` | `{ tripId, seatNumbers, action, bookingId? }` | Trip room + all |

### Trip Events
| Event | Payload | Target |
|-------|---------|--------|
| `trip:created` | Trip object | Company + admin + public |
| `trip:updated` | Trip object | Company + admin + public |
| `trip:deleted` | `{ id }` | Company + admin + public |
| `trip:status-changed` | `{ tripId, status }` | Public |
| `trip:seats:updated` | `{ tripId, seatNumbers }` | Trip room |

### Bus Events
| Event | Payload | Target |
|-------|---------|--------|
| `bus:created` | Bus object | Company + admin |
| `bus:updated` | Bus object | Company + admin |
| `bus:deleted` | `{ id }` | Company + admin |

### User Events
| Event | Payload | Target |
|-------|---------|--------|
| `user:toggled` | `{ id, name, isActive }` | Admin room |
| `user:deleted` | `{ id }` | Admin room |

### Platform Fee Events
| Event | Payload | Target |
|-------|---------|--------|
| `platform-fee:created` | Fee object | All clients |
| `platform-fee:updated` | Fee object | All clients |
| `platform-fee:activated` | Fee object | All clients |
| `platform-fee:deleted` | `{ id }` | Admin room |

### Payment Account Events
| Event | Payload | Target |
|-------|---------|--------|
| `account:created` | Account object | All clients |
| `account:updated` | Account object | All clients |
| `account:toggled` | Account object | All clients |
| `account:deleted` | `{ id }` | Admin room |

### Stats Events
| Event | Payload | Target |
|-------|---------|--------|
| `stats:updated` | `{}` | Public (trigger dashboard refresh) |

### Financial Events
| Event | Payload | Target |
|-------|---------|--------|
| `financial:updated` | `{ trigger }` | Admin room |

### Notification Events
| Event | Payload | Target |
|-------|---------|--------|
| `notification:new` | `{}` | Target room |
| `notification:read` | `{}` | Target room |
