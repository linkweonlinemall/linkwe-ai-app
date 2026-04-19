import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const NAVY = "#0D3B6E";
const NAVY_MID = "#1A5A9E";
const SCARLET = "#D4450A";
const DARK = "#18181B";
const MID = "#52525B";
const LIGHT = "#A1A1AA";
const FAINT = "#F4F4F5";
const WHITE = "#FFFFFF";
const BORDER = "#E4E4E7";
const EMERALD_BG = "#ECFDF5";
const EMERALD_TEXT = "#065F46";

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
    height: 160,
    position: "relative",
  },

  waveOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: 160,
  },

  heroContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 50,
    paddingVertical: 28,
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

  invoiceTitle: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    letterSpacing: 4,
    textTransform: "uppercase",
  },

  invoiceNoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },

  invoiceNoLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  invoiceNoValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },

  invoiceDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },

  invoiceDateLabel: {
    fontSize: 8,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  invoiceDateValue: {
    fontSize: 9,
    color: WHITE,
  },

  paidBadge: {
    backgroundColor: EMERALD_BG,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
    alignSelf: "flex-end",
  },

  paidBadgeText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: EMERALD_TEXT,
    letterSpacing: 1.5,
  },

  body: {
    paddingHorizontal: 50,
    paddingTop: 32,
    paddingBottom: 40,
  },

  billingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  billingBox: {
    flex: 1,
  },

  billingBoxRight: {
    flex: 1,
    alignItems: "flex-end",
  },

  billingLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 6,
  },

  billingName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 3,
  },

  billingDetail: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.6,
  },

  dateRow: {
    marginBottom: 20,
  },

  dateText: {
    fontSize: 10,
    color: DARK,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 20,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  tableHeaderText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    textAlign: "center",
  },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },

  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: FAINT,
  },

  colItem: { flex: 5 },
  colQty: { flex: 1, textAlign: "center" },
  colUnit: { flex: 2, textAlign: "right" },
  colTotal: { flex: 2, textAlign: "right" },

  itemName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },

  itemStore: {
    fontSize: 8,
    color: LIGHT,
    marginTop: 2,
  },

  rowText: {
    fontSize: 10,
    color: DARK,
  },

  totalsWrapper: {
    marginTop: 4,
    alignItems: "flex-end",
  },

  totalsBox: {
    width: 240,
  },

  subTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: NAVY,
  },

  subTotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },

  subTotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },

  shippingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },

  shippingLabel: {
    fontSize: 9,
    color: MID,
  },

  shippingValue: {
    fontSize: 9,
    color: DARK,
    fontFamily: "Helvetica-Bold",
  },

  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#0A4D68",
  },

  grandTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },

  grandTotalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },

  noteSection: {
    marginTop: 28,
  },

  noteLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },

  noteLine: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 6,
    paddingBottom: 2,
  },

  noteText: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.6,
  },

  bottomSection: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  paymentInfo: {
    flex: 1,
  },

  paymentInfoLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 6,
  },

  paymentInfoRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 3,
  },

  paymentInfoKey: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    width: 60,
  },

  paymentInfoValue: {
    fontSize: 9,
    color: MID,
  },

  qrBlock: {
    alignItems: "center",
    marginLeft: 20,
  },

  qrImage: {
    width: 65,
    height: 65,
  },

  qrLabel: {
    fontSize: 7,
    color: LIGHT,
    marginTop: 4,
    textAlign: "center",
  },

  thankYouBlock: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },

  thankYouText: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },

  footerRef: {
    fontSize: 8,
    color: SCARLET,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
  },
});

function formatMinor(minor: number): string {
  return `$ ${(minor / 100).toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type OrderItem = {
  id: string;
  titleSnapshot: string;
  priceMinor: number;
  quantity: number;
  product: {
    name: string;
    images: string[];
    store: { name: string };
  } | null;
};

type InvoiceOrder = {
  id: string;
  createdAt: Date;
  totalMinor: number;
  subtotalMinor: number;
  shippingMinor: number;
  region: string;
  buyer: { fullName: string; email: string };
  items: OrderItem[];
};

type Props = {
  order: InvoiceOrder;
  qrCodeDataUrl: string;
};

export function InvoiceDocument({ order, qrCodeDataUrl }: Props) {
  const invoiceNumber = `LW-${order.id.slice(-8).toUpperCase()}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Navy hero header */}
        <View style={styles.hero}>
          {/* Wave overlay image on top right */}
          <Image style={styles.waveOverlay} src="./public/wave.png" />
          {/* Content layer on top of wave */}
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <Image style={styles.logoImage} src="./public/logo.png" />
              <Text style={styles.brandTagline}>Trinidad & Tobago Marketplace</Text>
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <View style={styles.invoiceNoRow}>
                <Text style={styles.invoiceNoLabel}>NO:</Text>
                <Text style={styles.invoiceNoValue}>{invoiceNumber}</Text>
              </View>
              <View style={styles.invoiceDateRow}>
                <Text style={styles.invoiceDateLabel}>DATE:</Text>
                <Text style={styles.invoiceDateValue}>{formatDate(order.createdAt)}</Text>
              </View>
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>✓  PAID</Text>
              </View>
            </View>
          </View>
        </View>

        <View
          style={{
            height: 6,
            backgroundColor: "#E4E4E7",
            opacity: 0.5,
          }}
        />

        <View style={styles.body}>
          {/* Bill To / From */}
          <View style={styles.billingRow}>
            <View style={styles.billingBox}>
              <Text style={styles.billingLabel}>Bill To:</Text>
              <Text style={styles.billingName}>{order.buyer.fullName}</Text>
              <Text style={styles.billingDetail}>{order.buyer.email}</Text>
              <Text style={styles.billingDetail}>
                {order.region
                  ? `Delivery: ${order.region.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}`
                  : ""}
              </Text>
            </View>
            <View style={styles.billingBoxRight}>
              <Text style={styles.billingLabel}>From:</Text>
              <Text style={styles.billingName}>LinkWe</Text>
              <Text style={styles.billingDetail}>Trinidad & Tobago</Text>
              <Text style={styles.billingDetail}>support@linkwe.tt</Text>
            </View>
          </View>

          {/* Date row */}
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>Date: {formatDate(order.createdAt)}</Text>
          </View>

          <View style={styles.divider} />

          {/* Items table */}
          <View
            style={{
              borderRadius: 6,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#E4E4E7",
            }}
          >
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colItem]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colUnit]}>Price</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>

            {order.items.map((item, index) => (
              <View key={item.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <View style={styles.colItem}>
                  <Text style={styles.itemName}>{item.titleSnapshot}</Text>
                  {item.product?.store?.name ? (
                    <Text style={styles.itemStore}>Sold by {item.product.store.name}</Text>
                  ) : null}
                </View>
                <Text style={[styles.rowText, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.rowText, styles.colUnit]}>{formatMinor(item.priceMinor)}</Text>
                <Text style={[styles.rowText, styles.colTotal]}>
                  {formatMinor(item.priceMinor * item.quantity)}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsWrapper}>
            <View style={styles.totalsBox}>
              <View style={styles.shippingRow}>
                <Text style={styles.shippingLabel}>Shipping</Text>
                <Text style={styles.shippingValue}>{formatMinor(order.shippingMinor)}</Text>
              </View>
              <View style={styles.subTotalRow}>
                <Text style={styles.subTotalLabel}>Sub Total</Text>
                <Text style={styles.subTotalValue}>{formatMinor(order.subtotalMinor)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total Paid</Text>
                <Text style={styles.grandTotalValue}>{formatMinor(order.totalMinor)}</Text>
              </View>
            </View>
          </View>

          {/* Note */}
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>Note:</Text>
            <View style={styles.noteLine} />
            <View style={styles.noteLine} />
            <View style={styles.noteLine} />
            <Text style={[styles.noteText, { marginTop: 4 }]}>
              Questions? Contact support@linkwe.tt with reference {invoiceNumber}.
            </Text>
          </View>

          {/* Bottom — Payment info + QR + Thank You */}
          <View style={styles.bottomSection}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentInfoLabel}>Payment Information:</Text>
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoKey}>Method:</Text>
                <Text style={styles.paymentInfoValue}>Card via Stripe</Text>
              </View>
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoKey}>Reference:</Text>
                <Text style={styles.paymentInfoValue}>{invoiceNumber}</Text>
              </View>
              <View style={styles.paymentInfoRow}>
                <Text style={styles.paymentInfoKey}>Email:</Text>
                <Text style={styles.paymentInfoValue}>support@linkwe.tt</Text>
              </View>
            </View>

            <View style={styles.qrBlock}>
              <Image style={styles.qrImage} src={qrCodeDataUrl} />
              <Text style={styles.qrLabel}>Scan to track</Text>
            </View>

            <View style={styles.thankYouBlock}>
              <Text style={styles.thankYouText}>Thank You!</Text>
              <Text style={styles.footerRef}>{invoiceNumber}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
