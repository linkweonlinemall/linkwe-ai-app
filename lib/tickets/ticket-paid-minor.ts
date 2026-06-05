export type TicketPaidMinorInput = {
  pricePaidMinor: number;
  ticketType: { price: number };
};

/** Per-ticket sale price in minor units; falls back to current tier price for pre-snapshot rows. */
export function ticketPaidMinor(ticket: TicketPaidMinorInput): number {
  return ticket.pricePaidMinor > 0
    ? ticket.pricePaidMinor
    : Math.round(ticket.ticketType.price * 100);
}
