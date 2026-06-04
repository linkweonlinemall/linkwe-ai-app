import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

import {
  formatEventDateLong,
  formatEventTime,
} from "@/lib/events/format-datetime";

const NAVY = "#0D3B6E";
const SCARLET = "#D4450A";
const DARK = "#1C1C1A";
const MID = "#52525B";
const LIGHT = "#A1A1AA";
const FAINT = "#F4F4F5";
const WHITE = "#FFFFFF";
const BORDER = "#E4E4E7";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: DARK,
    backgroundColor: WHITE,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },

  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: 50,
    paddingVertical: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heroLeft: {
    flexDirection: "column",
    gap: 8,
  },

  logoImage: {
    width: 120,
    height: 44,
    objectFit: "contain",
  },

  brandTagline: {
    fontSize: 8,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  heroRight: {
    alignItems: "flex-end",
  },

  ticketTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  ticketSubtitle: {
    fontSize: 8,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 4,
  },

  body: {
    paddingHorizontal: 50,
    paddingTop: 32,
    paddingBottom: 40,
  },

  eventTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 8,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },

  metaLabel: {
    fontSize: 8,
    color: LIGHT,
    letterSpacing: 1,
    textTransform: "uppercase",
    width: 52,
  },

  metaValue: {
    fontSize: 10,
    color: MID,
  },

  typeBadge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 12,
    marginBottom: 20,
  },

  typeBadgeText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 20,
  },

  detailGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  detailBox: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 8,
    color: LIGHT,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },

  detailSub: {
    fontSize: 9,
    color: MID,
    marginTop: 2,
  },

  qrSection: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: FAINT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },

  qrImage: {
    width: 180,
    height: 180,
  },

  qrLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: SCARLET,
    marginTop: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  qrHint: {
    fontSize: 8,
    color: MID,
    marginTop: 4,
    textAlign: "center",
  },

  footerNote: {
    fontSize: 8,
    color: LIGHT,
    textAlign: "center",
    lineHeight: 1.5,
  },

  scarletLine: {
    height: 4,
    backgroundColor: SCARLET,
    marginBottom: 0,
  },
});

function formatMinor(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

export type TicketDocumentData = {
  ticketNumber: string;
  holderName: string;
  status: string;
  event: {
    title: string;
    startDate: Date;
    venueName: string | null;
    isOnline: boolean;
  };
  ticketType: {
    name: string;
    color: string | null;
  };
  ticketOrder: {
    reference: string;
    total: number;
  } | null;
};

type Props = {
  ticket: TicketDocumentData;
  qrCodeDataUrl: string;
  logoDataUrl: string | null;
};

export function TicketDocument({ ticket, qrCodeDataUrl, logoDataUrl }: Props) {
  const accentColor = ticket.ticketType.color ?? SCARLET;
  const venueLabel = ticket.event.isOnline
    ? "Online"
    : ticket.event.venueName ?? "Venue TBA";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.scarletLine} />

        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            {logoDataUrl ? (
              <Image style={styles.logoImage} src={logoDataUrl} />
            ) : (
              <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: WHITE }}>
                LinkWe
              </Text>
            )}
            <Text style={styles.brandTagline}>Trinidad & Tobago Marketplace</Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.ticketTitle}>EVENT TICKET</Text>
            <Text style={styles.ticketSubtitle}>Present at check-in</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.eventTitle}>{ticket.event.title}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>
              {formatEventDateLong(ticket.event.startDate)} · {formatEventTime(ticket.event.startDate)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Venue</Text>
            <Text style={styles.metaValue}>{venueLabel}</Text>
          </View>

          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: `${accentColor}1a`,
                borderWidth: 1,
                borderColor: accentColor,
              },
            ]}
          >
            <Text style={[styles.typeBadgeText, { color: accentColor }]}>
              {ticket.ticketType.name}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailGrid}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Ticket holder</Text>
              <Text style={styles.detailValue}>{ticket.holderName}</Text>
            </View>
            <View style={[styles.detailBox, { alignItems: "flex-end" }]}>
              <Text style={styles.detailLabel}>Ticket no.</Text>
              <Text style={styles.detailValue}>#{ticket.ticketNumber}</Text>
              <Text style={styles.detailSub}>Status: {ticket.status}</Text>
            </View>
          </View>

          {ticket.ticketOrder ? (
            <View style={[styles.metaRow, { marginBottom: 24 }]}>
              <Text style={styles.metaLabel}>Order</Text>
              <Text style={styles.metaValue}>
                #{ticket.ticketOrder.reference} · {formatMinor(ticket.ticketOrder.total)}
              </Text>
            </View>
          ) : null}

          <View style={styles.qrSection}>
            <Image style={styles.qrImage} src={qrCodeDataUrl} />
            <Text style={styles.qrLabel}>Scan at entry</Text>
            <Text style={styles.qrHint}>
              Show this QR code at the venue door for check-in
            </Text>
          </View>

          <Text style={styles.footerNote}>
            This ticket is valid for one entry. Questions? Contact admin@linkwemall.com with ticket #
            {ticket.ticketNumber}.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
