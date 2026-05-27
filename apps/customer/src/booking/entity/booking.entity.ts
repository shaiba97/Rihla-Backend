export class BookingEntity {
  id: string;
  customerId: string;
  tripId: string;
  seatNumber: number;
  passengerContact: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
  passenger: any;
}

export class PaymentEntity {
  id: string;
  bookingId: string;
  customerId: string;
  tripId: string;
  amount: number;
  paymentMethod: string;
  transactionRef: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: Date;
  updatedAt: Date;
}

export class TicketPDFEntity {
  id: string;
  bookingId: string;
  ticketUrl: string;
  generatedAt: Date;
}
