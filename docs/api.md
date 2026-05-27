# API Documentation

## Overview

Rihla provides three RESTful APIs for different user roles:

- **Admin API** (Port 3000): Platform management
- **Company API** (Port 3001): Bus operations
- **Customer API** (Port 3002): Ticket booking

## Authentication

All endpoints require JWT authentication (except login):

```bash
Authorization: Bearer <jwt_token>
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGc...",
  "expiresIn": 86400,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

## Admin API (Port 3000)

### Users Management

#### List Users

```http
GET /api/users?page=1&limit=20&role=customer
Authorization: Bearer <token>
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)
- `role`: Filter by role (customer, company, admin)
- `search`: Search by email or name

Response:
```json
{
  "data": [
    {
      "id": "user-1",
      "email": "customer@example.com",
      "role": "customer",
      "isActive": true,
      "createdAt": "2026-05-25T10:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

#### Get User

```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### Update User

```http
PATCH /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "isActive": true,
  "role": "customer"
}
```

### Platform Statistics

```http
GET /api/statistics/overview
Authorization: Bearer <token>
```

Response:
```json
{
  "totalUsers": 5000,
  "totalBookings": 15000,
  "revenue": 500000,
  "activeTrips": 250,
  "completedTrips": 3000
}
```

## Company API (Port 3001)

### Buses

#### List Buses

```http
GET /api/buses
Authorization: Bearer <token>
```

Response:
```json
{
  "data": [
    {
      "id": "bus-1",
      "registrationNumber": "ABC-1234",
      "name": "Express Bus 1",
      "capacity": 50,
      "licensePlate": "ABC1234",
      "isActive": true,
      "createdAt": "2026-05-25T10:00:00Z"
    }
  ]
}
```

#### Create Bus

```http
POST /api/buses
Authorization: Bearer <token>
Content-Type: application/json

{
  "registrationNumber": "ABC-1234",
  "name": "Express Bus 1",
  "capacity": 50,
  "licensePlate": "ABC1234"
}
```

#### Update Bus

```http
PATCH /api/buses/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Express Bus 1 - Updated",
  "isActive": true
}
```

### Trips

#### Create Trip

```http
POST /api/trips
Authorization: Bearer <token>
Content-Type: application/json

{
  "busId": "bus-1",
  "routeId": "route-1",
  "departureTime": "2026-06-01T08:00:00Z",
  "price": 50,
  "availableSeats": 50
}
```

#### List Trips

```http
GET /api/trips?status=active&date=2026-06-01
Authorization: Bearer <token>
```

#### Get Trip Details

```http
GET /api/trips/:id
Authorization: Bearer <token>
```

Response:
```json
{
  "id": "trip-1",
  "bus": {
    "id": "bus-1",
    "name": "Express Bus 1",
    "capacity": 50
  },
  "route": {
    "id": "route-1",
    "from": "City A",
    "to": "City B",
    "distance": 500
  },
  "departureTime": "2026-06-01T08:00:00Z",
  "arrivalTime": "2026-06-01T16:00:00Z",
  "price": 50,
  "availableSeats": 25,
  "totalBookings": 25,
  "status": "active"
}
```

## Customer API (Port 3002)

### Trip Search

```http
GET /api/trips/search?from=CityA&to=CityB&date=2026-06-01&passengers=2
Authorization: Bearer <token>
```

Query Parameters:
- `from`: Departure city
- `to`: Arrival city
- `date`: Travel date (YYYY-MM-DD)
- `passengers`: Number of passengers
- `maxPrice`: Maximum price (optional)
- `sort`: Sort by (date, price, duration)

Response:
```json
{
  "data": [
    {
      "id": "trip-1",
      "busName": "Express Bus 1",
      "from": "City A",
      "to": "City B",
      "departureTime": "2026-06-01T08:00:00Z",
      "arrivalTime": "2026-06-01T16:00:00Z",
      "duration": "8h",
      "price": 50,
      "availableSeats": 25,
      "rating": 4.5
    }
  ],
  "meta": {
    "total": 10,
    "filters": {
      "priceMin": 30,
      "priceMax": 100
    }
  }
}
```

### Booking

#### Create Booking

```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "tripId": "trip-1",
  "seatNumbers": [1, 2],
  "passengers": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "idNumber": "123456789"
    }
  ]
}
```

Response:
```json
{
  "id": "booking-1",
  "tripId": "trip-1",
  "customerId": "customer-1",
  "seatNumbers": [1, 2],
  "totalPrice": 100,
  "status": "confirmed",
  "bookingDate": "2026-05-25T10:00:00Z",
  "departureDate": "2026-06-01T08:00:00Z",
  "ticketNumber": "TICKET-001234",
  "passengers": [
    {
      "name": "John Doe",
      "seat": 1
    }
  ]
}
```

#### List Bookings

```http
GET /api/bookings?status=confirmed&sort=-departureDate
Authorization: Bearer <token>
```

#### Get Booking Details

```http
GET /api/bookings/:id
Authorization: Bearer <token>
```

#### Cancel Booking

```http
DELETE /api/bookings/:id
Authorization: Bearer <token>

{
  "reason": "Change of plans"
}
```

Response:
```json
{
  "id": "booking-1",
  "status": "cancelled",
  "refundAmount": 100,
  "refundStatus": "processing"
}
```

### Notifications

#### Get Notifications

```http
GET /api/notifications?unread=true
Authorization: Bearer <token>
```

Response:
```json
{
  "data": [
    {
      "id": "notif-1",
      "type": "booking_confirmed",
      "title": "Booking Confirmed",
      "message": "Your booking for trip ABC-123 is confirmed",
      "read": false,
      "createdAt": "2026-05-25T10:00:00Z"
    }
  ]
}
```

#### Mark as Read

```http
PATCH /api/notifications/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "read": true
}
```

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "requestId": "req-12345"
}
```

## Rate Limiting

API endpoints are rate limited:

- Authentication: 5 requests per minute
- Search: 100 requests per minute
- General: 1000 requests per minute

Headers in response:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1624598400
```

## WebSocket Events

Real-time updates via Socket.IO:

### Connect

```javascript
const socket = io('http://localhost:3001');
socket.emit('authenticate', { token: 'jwt_token' });
```

### Company Events

```javascript
// New booking received
socket.on('booking:created', (data) => {
  console.log('New booking:', data);
});

// Trip updated
socket.on('trip:updated', (data) => {
  console.log('Trip updated:', data);
});
```

## Pagination

All list endpoints support pagination:

```http
GET /api/resources?page=2&limit=50
```

Response includes metadata:
```json
{
  "data": [...],
  "meta": {
    "total": 500,
    "page": 2,
    "limit": 50,
    "pages": 10
  }
}
```

## Swagger UI

Interactive API documentation available at:
- Admin: http://localhost:3000/api/docs
- Company: http://localhost:3001/api/docs
- Customer: http://localhost:3002/api/docs
