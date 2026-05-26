/**
 * Canonical vendor dashboard sub-routes (standalone pages, not dashboard tabs).
 */
export const VENDOR_DASHBOARD_PATH = "/dashboard/vendor" as const;

export const VENDOR_VENDOR_ORDERS_PATH = `${VENDOR_DASHBOARD_PATH}/orders` as const;
export const VENDOR_VENDOR_FINANCE_PATH = `${VENDOR_DASHBOARD_PATH}/finance` as const;
export const VENDOR_VENDOR_MESSAGES_PATH = `${VENDOR_DASHBOARD_PATH}/messages` as const;
export const VENDOR_VENDOR_REVIEWS_PATH = `${VENDOR_DASHBOARD_PATH}/reviews` as const;

/** @deprecated Prefer {@link VENDOR_VENDOR_ORDERS_PATH}. Old query URLs redirect server-side from the dashboard page. */
export const VENDOR_DASHBOARD_ORDERS_TAB_HREF = VENDOR_VENDOR_ORDERS_PATH;

/** @deprecated Prefer {@link VENDOR_VENDOR_REVIEWS_PATH}. */
export const VENDOR_DASHBOARD_REVIEWS_TAB_HREF = VENDOR_VENDOR_REVIEWS_PATH;
