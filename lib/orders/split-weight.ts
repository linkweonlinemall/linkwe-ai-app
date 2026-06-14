export type OrderItemWeightRow = {
  titleSnapshot: string;
  weightLbs: number;
  quantity: number;
};

export type SplitItemWeightRow = {
  titleSnapshot: string;
  quantity: number;
};

/** Match split line to main-order items by titleSnapshot (same as customer order page). */
export function unitWeightLbsForTitle(
  titleSnapshot: string,
  orderItems: OrderItemWeightRow[],
): number | null {
  const matches = orderItems.filter((i) => i.titleSnapshot === titleSnapshot);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].weightLbs;
  const totalQty = matches.reduce((sum, i) => sum + i.quantity, 0);
  if (totalQty <= 0) return matches[0].weightLbs;
  const weightedSum = matches.reduce((sum, i) => sum + i.weightLbs * i.quantity, 0);
  return weightedSum / totalQty;
}

/** Unit weight for display; 0 when no matching order line. */
export function resolveUnitWeightLbs(
  titleSnapshot: string,
  orderItems: OrderItemWeightRow[],
): number {
  return unitWeightLbsForTitle(titleSnapshot, orderItems) ?? 0;
}

export function splitItemLineWeightLbs(
  splitItem: SplitItemWeightRow,
  orderItems: OrderItemWeightRow[],
): number {
  const unit = unitWeightLbsForTitle(splitItem.titleSnapshot, orderItems) ?? 0;
  return unit * splitItem.quantity;
}

export function splitTotalWeightLbs(
  splitItems: SplitItemWeightRow[],
  orderItems: OrderItemWeightRow[],
): number {
  return splitItems.reduce(
    (sum, item) => sum + splitItemLineWeightLbs(item, orderItems),
    0,
  );
}

export function formatWeightLbs(lbs: number): string {
  return lbs.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export function formatItemWithWeight(
  quantity: number,
  titleSnapshot: string,
  unitWeightLbs: number | null,
): string {
  const title = `${quantity}× ${titleSnapshot}`;
  if (unitWeightLbs == null || unitWeightLbs <= 0) return title;
  return `${title} (${formatWeightLbs(unitWeightLbs)}lb)`;
}

export type SplitWeightLine = {
  titleSnapshot: string;
  quantity: number;
  unitWeightLbs: number | null;
  lineWeightLbs: number;
};

export function computeSplitWeightLbs(
  splitItems: SplitItemWeightRow[],
  orderItems: OrderItemWeightRow[],
): { totalLbs: number; lines: SplitWeightLine[] } {
  const lines = splitItems.map((item) => {
    const unitWeightLbs = unitWeightLbsForTitle(item.titleSnapshot, orderItems);
    return {
      titleSnapshot: item.titleSnapshot,
      quantity: item.quantity,
      unitWeightLbs,
      lineWeightLbs: splitItemLineWeightLbs(item, orderItems),
    };
  });
  return {
    totalLbs: lines.reduce((sum, line) => sum + line.lineWeightLbs, 0),
    lines,
  };
}

export function formatItemsWithWeight(lines: SplitWeightLine[]): string {
  return lines
    .map((line) =>
      formatItemWithWeight(line.quantity, line.titleSnapshot, line.unitWeightLbs),
    )
    .join(" | ");
}
