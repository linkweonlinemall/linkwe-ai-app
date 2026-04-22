import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

import { calculateCommissionMinor, calculateVendorNetMinor } from "@/lib/platform/commission";

const NAVY = "#0D3B6E";
const SCARLET = "#D4450A";
const DARK = "#18181B";
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
    gap: 6,
    maxWidth: 240,
  },

  logoImage: {
    width: 120,
    height: 44,
    objectFit: "contain",
  },

  storeNameHero: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },

  brandTagline: {
    fontSize: 8,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1.2,
  },

  heroRight: {
    alignItems: "flex-end",
  },

  invoiceTitle: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  invoiceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },

  invoiceMetaLabel: {
    fontSize: 7,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  invoiceMetaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
  },

  body: {
    paddingHorizontal: 50,
    paddingTop: 28,
    paddingBottom: 36,
  },

  billingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  billingBox: {
    flex: 1,
    paddingRight: 16,
  },

  billingBoxRight: {
    flex: 1,
    alignItems: "flex-end",
    paddingLeft: 16,
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
    lineHeight: 1.55,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 18,
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

  rowText: {
    fontSize: 10,
    color: DARK,
  },

  totalsWrapper: {
    marginTop: 6,
    alignItems: "flex-end",
  },

  totalsBox: {
    width: 260,
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

  deductionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },

  deductionLabel: {
    fontSize: 9,
    color: MID,
  },

  deductionValue: {
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
    marginTop: 22,
  },

  noteLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },

  noteText: {
    fontSize: 9,
    color: MID,
    lineHeight: 1.55,
  },

  bottomSection: {
    marginTop: 22,
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
    width: 72,
  },

  paymentInfoValue: {
    fontSize: 9,
    color: MID,
    flex: 1,
  },

  qrBlock: {
    alignItems: "center",
    marginLeft: 16,
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

  footerPowered: {
    fontSize: 8,
    color: LIGHT,
    marginTop: 20,
    textAlign: "center",
  },

  footerStoreRef: {
    fontSize: 8,
    color: SCARLET,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
    textAlign: "center",
  },
});

export type SplitOrderItem = {
  id: string;
  titleSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
};

export type VendorSplitOrder = {
  id: string;
  mainOrderId: string;
  referenceNumber: string | null;
  subtotalMinor: number;
  createdAt: Date;
  store: {
    name: string;
    slug: string;
    tagline: string | null;
    logoUrl: string | null;
    region: string;
    address: string | null;
    owner: {
      fullName: string;
      email: string;
      bankDetails: { bankName: string; accountName: string } | null;
    };
  };
  items: SplitOrderItem[];
  mainOrder: {
    referenceNumber: string | null;
    region: string;
    createdAt: Date;
    buyer: { fullName: string; email: string };
  };
};

type Props = {
  splitOrder: VendorSplitOrder;
  qrCodeDataUrl: string;
};

function formatMinor(minor: number): string {
  return `TTD ${(minor / 100).toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-TT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRegion(region: string): string {
  return region.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export function VendorInvoiceDocument({ splitOrder, qrCodeDataUrl }: Props) {
  const splitRef = splitOrder.referenceNumber ?? `SP-${splitOrder.id.slice(-8).toUpperCase()}`;
  const mainRef =
    splitOrder.mainOrder.referenceNumber ?? `LW-${splitOrder.mainOrderId.slice(-8).toUpperCase()}`;
  const invoiceDate = splitOrder.mainOrder.createdAt;
  const subtotalMinor = splitOrder.subtotalMinor;
  const commissionMinor = calculateCommissionMinor(subtotalMinor);
  const netMinor = calculateVendorNetMinor(subtotalMinor);

  const fromLines: string[] = [splitOrder.store.name];
  const regionAddr = [formatRegion(splitOrder.store.region), splitOrder.store.address].filter(Boolean).join(" · ");
  if (regionAddr) fromLines.push(regionAddr);
  fromLines.push(splitOrder.store.owner.email);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <Image style={styles.waveOverlay} src="./public/wave.png" />
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              {splitOrder.store.logoUrl ? (
                <Image style={styles.logoImage} src={splitOrder.store.logoUrl} />
              ) : (
                <Text style={styles.storeNameHero}>{splitOrder.store.name}</Text>
              )}
              {splitOrder.store.tagline ? (
                <Text style={styles.brandTagline}>{splitOrder.store.tagline}</Text>
              ) : null}
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <View style={styles.invoiceMetaRow}>
                <Text style={styles.invoiceMetaLabel}>Split order:</Text>
                <Text style={styles.invoiceMetaValue}>{splitRef}</Text>
              </View>
              <View style={styles.invoiceMetaRow}>
                <Text style={styles.invoiceMetaLabel}>Main order:</Text>
                <Text style={styles.invoiceMetaValue}>{mainRef}</Text>
              </View>
              <View style={styles.invoiceMetaRow}>
                <Text style={styles.invoiceMetaLabel}>Date:</Text>
                <Text style={styles.invoiceMetaValue}>{formatDate(invoiceDate)}</Text>
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
          <View style={styles.billingRow}>
            <View style={styles.billingBox}>
              <Text style={styles.billingLabel}>Bill To:</Text>
              <Text style={styles.billingName}>{splitOrder.mainOrder.buyer.fullName}</Text>
              <Text style={styles.billingDetail}>{splitOrder.mainOrder.buyer.email}</Text>
              <Text style={styles.billingDetail}>Delivery: {formatRegion(splitOrder.mainOrder.region)}</Text>
            </View>
            <View style={styles.billingBoxRight}>
              <Text style={styles.billingLabel}>From:</Text>
              {fromLines.map((line, i) => (
                <Text key={i} style={i === 0 ? styles.billingName : styles.billingDetail}>
                  {line}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View
            style={{
              borderRadius: 6,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: BORDER,
            }}
          >
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colItem]}>Description</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colUnit]}>Price</Text>
              <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
            </View>

            {splitOrder.items.map((item, index) => (
              <View key={item.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <View style={styles.colItem}>
                  <Text style={styles.itemName}>{item.titleSnapshot}</Text>
                </View>
                <Text style={[styles.rowText, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.rowText, styles.colUnit]}>{formatMinor(item.unitPriceMinor)}</Text>
                <Text style={[styles.rowText, styles.colTotal]}>{formatMinor(item.lineTotalMinor)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsWrapper}>
            <View style={styles.totalsBox}>
              <View style={styles.subTotalRow}>
                <Text style={styles.subTotalLabel}>Subtotal</Text>
                <Text style={styles.subTotalValue}>{formatMinor(subtotalMinor)}</Text>
              </View>
              <View style={styles.deductionRow}>
                <Text style={styles.deductionLabel}>Platform commission (12%)</Text>
                <Text style={styles.deductionValue}>-{formatMinor(commissionMinor)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Net earnings</Text>
                <Text style={styles.grandTotalValue}>{formatMinor(netMinor)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>Note:</Text>
            <Text style={styles.noteText}>
              This invoice reflects your portion of the order. Net earnings are after the platform commission.
              Questions? Contact {splitOrder.store.owner.email}.
            </Text>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentInfoLabel}>Settlement details:</Text>
              {splitOrder.store.owner.bankDetails ? (
                <>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoKey}>Bank:</Text>
                    <Text style={styles.paymentInfoValue}>{splitOrder.store.owner.bankDetails.bankName}</Text>
                  </View>
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoKey}>Account:</Text>
                    <Text style={styles.paymentInfoValue}>{splitOrder.store.owner.bankDetails.accountName}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.noteText}>Payouts are processed according to your LinkWe vendor agreement.</Text>
              )}
            </View>

            <View style={styles.qrBlock}>
              <Image style={styles.qrImage} src={qrCodeDataUrl} />
              <Text style={styles.qrLabel}>Scan to track order</Text>
            </View>
          </View>

          <Text style={styles.footerPowered}>Powered by LinkWe</Text>
          <Text style={styles.footerStoreRef}>
            {splitOrder.store.name} · {splitRef}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
