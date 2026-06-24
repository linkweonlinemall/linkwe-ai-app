import {
  SELF_DELIVERY_ZONES,
  SELF_DELIVERY_ZONE_LABELS,
  SELF_DELIVERY_REGION_COVERAGE,
  getDefaultRatesForHomeZone,
} from "../lib/shipping/self-delivery-zones";

console.log("=== 16 zones + labels ===");
for (const z of SELF_DELIVERY_ZONES) {
  console.log(`${z}: ${SELF_DELIVERY_ZONE_LABELS[z]}`);
}

console.log("\n=== Coverage gap report ===");
console.log("Dropdown count:", SELF_DELIVERY_REGION_COVERAGE.dropdownRegionCount);
console.log("Default fallback:", SELF_DELIVERY_REGION_COVERAGE.defaultZone);
console.log("GAPS (dropdown without zone):", SELF_DELIVERY_REGION_COVERAGE.dropdownRegionsWithoutZone);
console.log(
  "Info (zone aliases not in dropdown):",
  SELF_DELIVERY_REGION_COVERAGE.zoneCommunitiesNotInDropdown,
);

const home = "EAST_TUNAPUNA_ARIMA";
const rates = getDefaultRatesForHomeZone(home);
console.log(`\n=== Default rates for home zone ${home} (TTD major) ===`);
for (const z of SELF_DELIVERY_ZONES) {
  console.log(`${z.padEnd(32)} ${rates[z]}`);
}
