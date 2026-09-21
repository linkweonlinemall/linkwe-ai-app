import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

function load(file) {
  const source = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const scope = { exports: {}, require: specifier => load(path.resolve(path.dirname(file), `${specifier}.ts`)) };
  vm.runInNewContext(compiled, scope);
  return scope.exports;
}
const { servicePrice, serviceSpecifications, serviceMinutes, serviceTypeInfo } = load(fileURLToPath(new URL("../lib/services/display.ts", import.meta.url)));
const rows = service => Object.fromEntries(serviceSpecifications(service));

test("quote requests never describe an unpriced job as a free service", () => {
  assert.equal(servicePrice({ serviceType: "QUOTE", price: 0, quotePriceType: null }).label, "Request a quote");
  assert.equal(servicePrice({ serviceType: "QUOTE", price: 0, quotePriceType: "FREE_QUOTE" }).label, "Free quote");
  assert.equal(servicePrice({ serviceType: "QUOTE", price: 100, quotePriceType: "STARTING_FROM" }).label, "From TTD 100.00");
  assert.match(servicePrice({ serviceType: "QUOTE", price: 100, quotePriceType: "CALLOUT_FEE" }).note, /Call-out fee/);
});
test("booking details match the duration used by the booking calendar and retain payment restrictions", () => {
  const details = rows({ serviceType: "BOOKABLE", durationMinutes: 90, serviceDuration: 60, bookingPaymentMode: "ON_ARRIVAL_ONLY", requiresDeposit: true, depositAmount: 25, requiresApproval: true, advanceBookingDays: 14, cancellationHours: 24 });
  assert.equal(details["Session duration"], "1h 30m");
  assert.equal(details["Payment options"], "Pay on arrival");
  assert.equal(details["Booking deposit"], "TTD 25.00");
  assert.equal(details.Confirmation, "Provider approval required");
  assert.equal(details["Book ahead"], "Up to 14 days");
  assert.equal(details["Cancellation notice"], "24 hours");
  assert.equal(rows({ serviceType: "BOOKABLE", bookingPaymentMode: "ONLINE_ONLY" })["Payment options"], "Online payment");
});
test("subscription terms preserve zero-day cancellation and free trials", () => {
  const service = { serviceType: "SUBSCRIPTION", price: 300, subscriptionInterval: "fortnightly", sessionsIncluded: 2, subscriptionCancellationDays: 0, subscriptionTrialPeriod: 7, subscriptionTrialPrice: 0, subscriptionCanPause: true, subscriptionPauseMaxWeeks: 4 };
  const details = rows(service);
  assert.equal(servicePrice(service).note, "every 2 weeks");
  assert.equal(details["Sessions included"], "2 per billing cycle");
  assert.equal(details["Cancellation notice"], "Cancel anytime");
  assert.equal(details.Trial, "7 days · Free");
  assert.equal(details["Pause subscription"], "Up to 4 weeks");
});
test("on-demand details keep free travel and the minutes in response estimates", () => {
  const details = rows({ serviceType: "ON_DEMAND", travelFee: 0, estimatedResponseMins: 90, serviceRadius: 15 });
  assert.equal(details["Travel fee"], "Free");
  assert.equal(details["Estimated response"], "1h 30m");
  assert.equal(details["Service radius"], "15 km");
  assert.equal(serviceMinutes(null), null);
});
test("virtual sessions include platform, timezone and one-person sessions", () => {
  const details = rows({ serviceType: "VIRTUAL", durationMinutes: 45, virtualPlatform: "google_meet", maxGroupSize: 1 });
  assert.equal(details.Platform, "Google Meet");
  assert.equal(details["Group size"], "One-to-one session");
  assert.equal(details["Service location"], "Online");
  assert.equal(details["Time zone"], "Trinidad & Tobago (AST)");
});
test("each service type exposes its own next step and quote requirements", () => {
  assert.equal(serviceTypeInfo("BOOKABLE").action, "Choose a time");
  assert.equal(serviceTypeInfo("QUOTE").action, "Request a quote");
  assert.equal(serviceTypeInfo("SUBSCRIPTION").action, "View subscription");
  assert.equal(serviceTypeInfo("ON_DEMAND").action, "Request service");
  assert.equal(serviceTypeInfo("VIRTUAL").action, "Book a session");
  const details = rows({ serviceType: "QUOTE", minimumQuoteAmount: 0, siteVisitRequired: true, responseTime: "Within 48 hours" });
  assert.equal(details["Minimum job value"], "Free");
  assert.equal(details["Site visit"], "Required before the final quote");
  assert.equal(details["Typical response"], "Within 48 hours");
});
