export type TicketPaidMinorInput = {
  pricePaidMinor: number;
  ticketType: { price: number };
  ticketOrder?: { total: number; couponSnapshot?: unknown } | null;
};

/** Per-ticket sale price in minor units; falls back to current tier price for pre-snapshot rows. */
export function ticketPaidMinor(ticket: TicketPaidMinorInput): number {
  // Zero is a real sale price for free orders and coupons covering a ticket in full.
  if (ticket.pricePaidMinor === 0 && (ticket.ticketOrder?.total === 0 || ticket.ticketOrder?.couponSnapshot)) return 0;
  return ticket.pricePaidMinor > 0
    ? ticket.pricePaidMinor
    : Math.round(ticket.ticketType.price * 100);
}
