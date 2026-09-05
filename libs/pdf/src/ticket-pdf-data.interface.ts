/**
 * Typed data contracts for the PDFMake-based ticket and passenger-list
 * documents. Values mirror the fields the existing PDF generation pipeline
 * already consumed so that the public `PDFService` API stays stable.
 */

export interface TicketPassenger {
  name?: string | null;
  age?: number | string | null;
  gender?: string | null;
}

export interface TicketPayment {
  platformFeeAmount?: number | null;
  companyAmount?: number | null;
  totalAmount?: number | null;
  price?: number | null;
  currency?: string | null;
  paymentMethod?: string | null;
}

export interface TicketBusPlate {
  numbers?: string | number | null;
  arabic?: string | null;
  english?: string | null;
}

export interface TicketData {
  bookingId: string;
  createdAt?: Date | string | null;
  customerName?: string | null;
  bus?: any;
  trip?: any;
  passengers?: TicketPassenger[];
  payment?: TicketPayment;
  seatNumbers?: number[];
  qrData?: string;
}
