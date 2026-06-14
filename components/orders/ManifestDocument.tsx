import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import {
  formatTtdMinor,
  type ManifestSplit,
} from "@/lib/orders/manifest-shared";
import {
  formatItemWithWeight,
  formatWeightLbs,
} from "@/lib/orders/split-weight";

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
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: SCARLET,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: MID,
    marginBottom: 2,
  },
  count: {
    fontSize: 9,
    color: SCARLET,
    fontFamily: "Helvetica-Bold",
  },
  block: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: FAINT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
  },
  refRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  ref: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  pickup: {
    fontSize: 9,
    color: MID,
  },
  sectionLabel: {
    fontSize: 8,
    color: LIGHT,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
    marginTop: 6,
  },
  customerName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
  },
  email: {
    fontSize: 9,
    color: MID,
    marginTop: 1,
  },
  address: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: DARK,
    marginTop: 2,
  },
  detail: {
    fontSize: 9,
    color: MID,
    marginTop: 2,
  },
  itemsList: {
    marginTop: 4,
    marginLeft: 4,
  },
  itemLine: {
    fontSize: 8,
    color: MID,
    marginBottom: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  weight: {
    fontSize: 9,
    color: DARK,
  },
  fee: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: SCARLET,
  },
});

type ManifestDocumentProps = {
  splits: ManifestSplit[];
  generatedAt: string;
};

export function ManifestDocument({ splits, generatedAt }: ManifestDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>LinkWe Delivery Manifest</Text>
          <Text style={styles.subtitle}>Generated {generatedAt}</Text>
          <Text style={styles.count}>
            {splits.length} {splits.length === 1 ? "delivery" : "deliveries"}
          </Text>
        </View>

        {splits.map((split, index) => (
          <View key={`${split.ref}-${index}`} style={styles.block} wrap={false}>
            <View style={styles.refRow}>
              <Text style={styles.ref}>{split.ref}</Text>
              <Text style={styles.pickup}>Pick up from: {split.storeName}</Text>
            </View>

            <Text style={styles.sectionLabel}>Deliver to</Text>
            <Text style={styles.customerName}>{split.customerName}</Text>
            <Text style={styles.email}>{split.customerEmail}</Text>

            {split.addressLine1 ? (
              <Text style={styles.address}>{split.addressLine1}</Text>
            ) : (
              <Text style={styles.detail}>Region: {split.region}</Text>
            )}

            {split.phone ? (
              <Text style={styles.detail}>Tel: {split.phone}</Text>
            ) : null}

            {split.latitude != null && split.longitude != null ? (
              <Text style={styles.detail}>
                Map: {String(split.latitude)},{String(split.longitude)}
              </Text>
            ) : null}

            <Text style={styles.sectionLabel}>Items</Text>
            <View style={styles.itemsList}>
              {split.itemLines.map((line, lineIdx) => (
                <Text key={`${line.titleSnapshot}-${lineIdx}`} style={styles.itemLine}>
                  {formatItemWithWeight(
                    line.quantity,
                    line.titleSnapshot,
                    line.unitWeightLbs,
                  )}
                </Text>
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.weight}>
                Total weight: {formatWeightLbs(split.totalWeightLbs)} lb
              </Text>
              <Text style={styles.fee}>
                LinkWe fee: {formatTtdMinor(split.shippingMinor)}
              </Text>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}
