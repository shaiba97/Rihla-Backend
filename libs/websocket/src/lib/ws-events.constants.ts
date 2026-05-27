export const WS_EVENTS = {
  // Booking events
  BOOKING_CREATED: 'booking:created',
  BOOKING_CANCELLED: 'booking:cancelled',
  BOOKING_CONFIRMED: 'booking:confirmed',

  // Payment events
  PAYMENT_CREATED: 'payment:created',
  PAYMENT_PENDING: 'payment:pending',
  PAYMENT_CONFIRMED: 'payment:confirmed',
  PAYMENT_REJECTED: 'payment:rejected',

  // Seat events
  SEAT_BOOKED: 'seat:booked',
  SEAT_HELD: 'seat:held',
  SEAT_RELEASED: 'seat:released',
  SEAT_UPDATED: 'seat:updated',

  // Trip events
  TRIP_CREATED: 'trip:created',
  TRIP_UPDATED: 'trip:updated',
  TRIP_DELETED: 'trip:deleted',
  TRIP_STATUS_CHANGED: 'trip:status-changed',
  TRIP_SEATS_UPDATED: 'trip:seats:updated',

  // Bus events
  BUS_CREATED: 'bus:created',
  BUS_UPDATED: 'bus:updated',
  BUS_DELETED: 'bus:deleted',

  // User events
  USER_TOGGLED: 'user:toggled',
  USER_DELETED: 'user:deleted',

  // Platform fee events
  PLATFORM_FEE_CREATED: 'platform-fee:created',
  PLATFORM_FEE_UPDATED: 'platform-fee:updated',
  PLATFORM_FEE_ACTIVATED: 'platform-fee:activated',
  PLATFORM_FEE_DELETED: 'platform-fee:deleted',

  // Payment account events
  ACCOUNT_CREATED: 'account:created',
  ACCOUNT_UPDATED: 'account:updated',
  ACCOUNT_TOGGLED: 'account:toggled',
  ACCOUNT_DELETED: 'account:deleted',

  // Stats events
  STATS_UPDATED: 'stats:updated',
  FINANCIAL_UPDATED: 'financial:updated',

  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_CLEAR: 'notification:clear',

  // Room events (client -> server)
  JOIN_ROOM: 'join:room',
  LEAVE_ROOM: 'leave:room',

  // Seat map watcher events
  WATCH_SEATS: 'watch:seats',
  UNWATCH_SEATS: 'unwatch:seats',
} as const;
