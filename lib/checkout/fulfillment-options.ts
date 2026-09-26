type FulfillmentItem = { product: { isDigital: boolean; allowDelivery: boolean; allowPickup: boolean } };
/** A single checkout method must be supported by every physical item. */
export function getFulfillmentOptions(items: FulfillmentItem[]) {
  const physical = items.filter(item => !item.product.isDigital);
  return { allDigital: physical.length === 0, delivery: physical.length > 0 && physical.every(item => item.product.allowDelivery), pickup: physical.length > 0 && physical.every(item => item.product.allowPickup) };
}
export function fulfillmentError(items: FulfillmentItem[], useDelivery: boolean): string | null {
  const options = getFulfillmentOptions(items);
  if (options.allDigital || (useDelivery ? options.delivery : options.pickup)) return null;
  return `Some products do not support ${useDelivery ? "delivery" : "pickup"}. Choose a supported method or separate these items into different orders.`;
}
