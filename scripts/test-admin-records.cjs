// Integration checks exercise real transactions on a loopback-only database.
// Session and cache adapters are replaced in this process; the application is unchanged.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ path: ".env", quiet: true });
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(process.env.DATABASE_URL || "").hostname,
  )
)
  throw new Error("Tests require a loopback database.");
process.env.NODE_ENV = "test";
const root = process.cwd();
let session = null;
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@/lib/auth/session")
    return { getSession: async () => session };
  if (request === "next/cache") return { revalidatePath: () => {} };
  if (request === "next/navigation")
    return {
      redirect: () => {
        throw new Error("Unauthorized redirect");
      },
    };
  if (request === "server-only") return {};
  if (request.startsWith("@/")) request = path.join(root, request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
require.extensions[".ts"] = function (mod, file) {
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    file,
  );
};
const { prisma } = require("../lib/prisma.ts");
const records = require("../app/actions/admin-records.ts");
const { searchAdminRecords } = require("../app/actions/admin-search.ts");
const { getAdminOrders } = require("../app/actions/admin-orders.ts");
const {
  validateRecordValues,
  validateRecordState,
} = require("../lib/admin/record-validation.ts");
const {
  rowStatus,
  statusWhere,
} = require("../app/actions/admin-products-helpers.ts");
const made = { user: [], store: [], product: [], listing: [] };
const onboardingNames = [];
const {
  importAdminOnboardingRows,
} = require("../app/actions/admin-onboarding.ts");
let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log("PASS " + name);
}
async function test(name, fn) {
  await fn();
  checks++;
  console.log("PASS " + name);
}
async function create(kind, overrides) {
  const workspace = await records.getAdminRecordWorkspace(kind, "new");
  const values = Object.fromEntries(
    workspace.fields.map((f) => [f.name, f.value]),
  );
  const result = await records.saveAdminEditableRecord(kind, "new", {
    ...values,
    ...overrides,
  });
  assert.ok(result.ok, JSON.stringify(result));
  made[kind === "service" ? "product" : kind].push(result.id);
  return result.id;
}
async function run() {
  await test("reject unauthenticated reads", async () =>
    assert.rejects(
      () => records.getAdminRecordWorkspace("user", "new"),
      /Administrator/,
    ));
  session = { userId: "not-admin", role: "CUSTOMER", fullName: "Test" };
  await test("reject non-admin writes", async () =>
    assert.rejects(
      () => records.saveAdminEditableRecord("store", "new", {}),
      /Administrator/,
    ));
  const actor = await prisma.user.findUniqueOrThrow({
    where: { email: "admin-preview@linkwe.test" },
  });
  session = { userId: actor.id, role: "ADMIN", fullName: actor.fullName };
  const stamp = Date.now();
  let user, store, product, service, listing;
  await test("create a complete vendor account", async () => {
    user = await create("user", {
      fullName: "Admin integration vendor",
      email: `admin-integration-${stamp}@linkwe.test`,
      password: "LocalTest!12345",
      role: "VENDOR",
    });
    assert.equal(
      (await prisma.user.findUniqueOrThrow({ where: { id: user } })).role,
      "VENDOR",
    );
  });
  await test("create store with gallery, hours and customer questions atomically", async () => {
    store = await create("store", {
      ownerId: user,
      name: "Integration store",
      slug: `admin-integration-${stamp}`,
      categoryId: "other",
      region: "San Fernando",
      storeGallery: ["/images/home/live/store-handcrafted868.webp"],
      openingHours: {
        monday: {
          closed: false,
          allDay: false,
          slots: [{ from: "09:00", to: "17:00" }],
        },
      },
      checkoutFields: [
        {
          id: "gift-note",
          label: "Gift message",
          type: "text",
          required: false,
          options: [],
        },
      ],
    });
    const row = await prisma.store.findUniqueOrThrow({
      where: { id: store },
      include: { images: true },
    });
    assert.equal(row.images.length, 1);
    assert.equal(row.status, "DRAFT");
    assert.equal(row.checkoutFields[0].id, "gift-note");
  });
  await test("partial store save preserves untouched JSON and media", async () => {
    const w = await records.getAdminRecordWorkspace("store", store);
    const result = await records.saveAdminEditableRecord(
      "store",
      store,
      { tagline: "Updated safely" },
      w.version,
    );
    assert.ok(result.ok, JSON.stringify(result));
    const row = await prisma.store.findUniqueOrThrow({
      where: { id: store },
      include: { images: true },
    });
    assert.equal(row.images.length, 1);
    assert.equal(row.openingHours.monday.slots[0].from, "09:00");
    assert.equal(row.checkoutFields[0].id, "gift-note");
    assert.equal(row.tagline, "Updated safely");
    const stale = await records.saveAdminEditableRecord(
      "store",
      store,
      { tagline: "Stale edit" },
      w.version,
    );
    assert.match(stale.error, /updated this record/);
  });
  await test("reject duplicate-owner store without changing account role", async () => {
    const w = await records.getAdminRecordWorkspace("store", "new");
    const result = await records.saveAdminEditableRecord("store", "new", {
      ...Object.fromEntries(w.fields.map((f) => [f.name, f.value])),
      ownerId: user,
      name: "Duplicate",
      slug: `duplicate-${stamp}`,
      categoryId: "other",
      region: "Port of Spain",
    });
    assert.ok(result.fieldErrors.ownerId);
    assert.equal(await prisma.store.count({ where: { ownerId: user } }), 1);
  });
  await test("create product with independent variation price and stock", async () => {
    product = await create("product", {
      storeId: store,
      name: "Integration product",
      slug: `admin-product-${stamp}`,
      price: 120,
      stock: 4,
      hasVariants: true,
      variants: [
        {
          name: "Small / teal",
          sku: "TEST-S",
          price: 125,
          stock: 3,
          images: [],
          attributes: { size: "Small", colour: "Teal" },
        },
      ],
    });
    const row = await prisma.product.findUniqueOrThrow({
      where: { id: product },
      include: { variants: true },
    });
    assert.equal(row.variants[0].stock, 3);
    assert.equal(row.variants[0].attributes.colour, "Teal");
  });
  await test("variation identity cannot be deleted or borrowed from another product", async () => {
    const w = await records.getAdminRecordWorkspace("product", product);
    const result = await records.saveAdminEditableRecord(
      "product",
      product,
      { hasVariants: false, variants: [] },
      w.version,
    );
    assert.match(result.error, /Existing variations/);
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: product } }))
        .hasVariants,
      true,
    );
  });
  await test("create a bookable service with custom hours", async () => {
    service = await create("service", {
      storeId: store,
      name: "Integration service",
      slug: `admin-service-${stamp}`,
      serviceType: "BOOKABLE",
      price: 200,
      requiresDeposit: true,
      depositAmount: 50,
      useStoreHours: false,
      availableDays: ["monday", "tuesday"],
      availableFrom: "09:00",
      availableTo: "17:00",
    });
    const row = await prisma.product.findUniqueOrThrow({
      where: { id: service },
    });
    assert.equal(row.isBookable, true);
    assert.equal(row.depositAmount, 50);
    assert.equal(row.bookingPaymentMode, "ONLINE_ONLY");
  });
  await test("payment policy matches vendor plan and virtual service rules", async () => {
    await prisma.store.update({
      where: { id: store },
      data: { subscriptionPlan: "PRO", subscriptionStatus: "ACTIVE" },
    });
    let w = await records.getAdminRecordWorkspace("service", service);
    let result = await records.saveAdminEditableRecord(
      "service",
      service,
      { bookingPaymentMode: "ON_ARRIVAL_ONLY" },
      w.version,
    );
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: service } }))
        .bookingPaymentMode,
      "ON_ARRIVAL_ONLY",
    );
    w = await records.getAdminRecordWorkspace("service", service);
    result = await records.saveAdminEditableRecord(
      "service",
      service,
      { serviceType: "VIRTUAL", bookingPaymentMode: "ON_ARRIVAL_ONLY" },
      w.version,
    );
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: service } }))
        .bookingPaymentMode,
      "ONLINE_ONLY",
    );
  });
  await test("validate deposit against existing price on partial save", async () => {
    const w = await records.getAdminRecordWorkspace("service", service);
    const result = await records.saveAdminEditableRecord(
      "service",
      service,
      { price: 25 },
      w.version,
    );
    assert.ok(result.fieldErrors.depositAmount);
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: service } }))
        .price,
      200,
    );
  });
  await test("product and service editors cannot address the wrong record type", async () => {
    assert.equal(
      await records.getAdminRecordWorkspace("product", service),
      null,
    );
    assert.equal(
      await records.getAdminRecordWorkspace("service", product),
      null,
    );
  });
  await test("create a vehicle listing and its specifications together", async () => {
    listing = await create("listing", {
      storeId: store,
      title: "Integration vehicle",
      slug: `admin-listing-${stamp}`,
      type: "VEHICLE",
      priceMinor: 5500000,
      currency: "TTD",
      listingDetails: {
        make: "Toyota",
        model: "Corolla",
        year: 2022,
        mileage: 25000,
      },
    });
    const row = await prisma.listing.findUniqueOrThrow({
      where: { id: listing },
      include: { vehicle: true },
    });
    assert.equal(row.vehicle.make, "Toyota");
    assert.equal(row.priceMinor, 5500000);
  });
  await test("vendor bank editor saves the actual payout profile", async () => {
    const w = await records.getAdminRecordWorkspace("user", user);
    const result = await records.saveAdminEditableRecord(
      "user",
      user,
      {
        bankDetails: {
          bankName: "TEST BANK",
          accountName: "TEST ONLY",
          accountNumber: "000000",
          accountType: "SAVINGS",
        },
      },
      w.version,
    );
    assert.ok(result.ok, JSON.stringify(result));
    assert.equal(
      (
        await prisma.vendorBankDetails.findUniqueOrThrow({
          where: { userId: user },
        })
      ).accountType,
      "SAVINGS",
    );
  });
  await test("prevent administrator self-lockout", async () => {
    const w = await records.getAdminRecordWorkspace("user", actor.id);
    const result = await records.saveAdminEditableRecord(
      "user",
      actor.id,
      { isActive: false },
      w.version,
    );
    assert.match(result.error, /Another administrator/);
  });
  await test("search finds records by store and older account email", async () => {
    const found = await searchAdminRecords("Integration store", "service");
    assert.ok(found.some((r) => r.id === service));
    const people = await searchAdminRecords(
      `admin-integration-${stamp}`,
      "user",
    );
    assert.equal(people[0].id, user);
  });
  await test("orders support pages and searches beyond the first page", async () => {
    const first = await getAdminOrders({
      limit: 25,
      offset: 0,
      search: "ADMIN-PREVIEW",
    });
    const next = await getAdminOrders({
      limit: 25,
      offset: 25,
      search: "ADMIN-PREVIEW",
    });
    assert.equal(first.length, 25);
    assert.equal(next.length, 2);
    assert.ok(!first.some((row) => row.id === next[0].id));
    const found = await getAdminOrders({ search: "ADMIN-PREVIEW-027" });
    assert.equal(found[0].referenceNumber, "ADMIN-PREVIEW-027");
  });
  check("archive labels and filters preserve visibility distinction", () => {
    assert.equal(
      rowStatus({ isPublished: false, isArchived: true }),
      "archived",
    );
    assert.deepEqual(statusWhere("draft"), {
      isPublished: false,
      isArchived: false,
    });
  });
  check("reject malformed hours and negative inventory", () => {
    assert.throws(
      () =>
        validateRecordValues(
          [
            {
              name: "openingHours",
              type: "Json",
              required: false,
              list: false,
              value: null,
            },
          ],
          {
            openingHours: {
              monday: {
                closed: false,
                allDay: false,
                slots: [{ from: "17:00", to: "09:00" }],
              },
            },
          },
        ),
      /closing times/,
    );
    assert.throws(
      () =>
        validateRecordValues(
          [
            {
              name: "stock",
              type: "Int",
              required: false,
              list: false,
              value: null,
            },
          ],
          { stock: -2 },
        ),
      /positive/,
    );
  });
  check(
    "subscriptions require supported interval and valid trial settings",
    () => {
      assert.throws(
        () =>
          validateRecordState(
            "service",
            {
              serviceType: "SUBSCRIPTION",
              subscriptionInterval: "yearly",
              price: 100,
            },
            ["serviceType"],
          ),
        /interval/,
      );
      assert.throws(
        () =>
          validateRecordState(
            "service",
            {
              serviceType: "SUBSCRIPTION",
              subscriptionInterval: "monthly",
              price: 100,
              subscriptionTrialPrice: 120,
              subscriptionTrialPeriod: 7,
            },
            ["subscriptionTrialPrice"],
          ),
        /Trial price/,
      );
    },
  );
  await test("reject unknown writable fields", async () => {
    const w = await records.getAdminRecordWorkspace("user", user);
    const result = await records.saveAdminEditableRecord(
      "user",
      user,
      { passwordHash: "not-allowed" },
      w.version,
    );
    assert.ok(result.fieldErrors.passwordHash);
  });
  await test("guided vendor setup creates a draft business and supports safe CSV retry", async () => {
    const storeName = `Admin wizard test ${stamp}`;
    const email = `admin-wizard-${stamp}@linkwe.test`;
    onboardingNames.push(storeName);
    const row = {
      fullName: "Wizard test vendor",
      email,
      storeName,
      region: "San Fernando",
      itemType: "product",
      itemName: "Wizard test product",
      price: "30",
      stock: "4",
    };
    const result = await importAdminOnboardingRows([
      row,
      {
        ...row,
        itemType: "service",
        itemName: "Wizard test service",
        price: "0",
        stock: "",
      },
    ]);
    for (const account of result.accounts) {
      made.user.push(account.userId);
      made.store.push(account.storeId);
      const products = await prisma.product.findMany({
        where: { storeId: account.storeId },
        select: { id: true },
      });
      made.product.push(...products.map((p) => p.id));
    }
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.createdUsers, 1);
    assert.equal(result.createdStores, 1);
    assert.equal(result.createdItems, 2);
    assert.equal(
      (await prisma.user.findUniqueOrThrow({ where: { email } })).emailVerified,
      null,
    );
    assert.equal(
      (
        await prisma.store.findUniqueOrThrow({
          where: { id: result.accounts[0].storeId },
        })
      ).status,
      "DRAFT",
    );
    const retry = await importAdminOnboardingRows([row]);
    assert.equal(retry.ok, true);
    assert.equal(retry.createdUsers, 0);
    assert.equal(retry.createdStores, 0);
    assert.equal(retry.createdItems, 0);
  });
  await test("invalid first offering rolls back the whole vendor setup", async () => {
    const email = `admin-wizard-bad-${stamp}@linkwe.test`;
    const result = await importAdminOnboardingRows([
      {
        fullName: "Invalid setup",
        email,
        storeName: `Invalid ${stamp}`,
        itemType: "product",
        itemName: "Bad stock",
        price: 30,
        stock: -1,
      },
    ]);
    assert.equal(result.ok, false);
    assert.equal(await prisma.user.findUnique({ where: { email } }), null);
  });
  console.log(`Admin checks passed: ${checks}`);
}
run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.productVariant.deleteMany({
      where: { productId: { in: made.product } },
    });
    await prisma.product.deleteMany({ where: { id: { in: made.product } } });
    await prisma.listing.deleteMany({ where: { id: { in: made.listing } } });
    await prisma.storeImage.deleteMany({
      where: { storeId: { in: made.store } },
    });
    await prisma.store.deleteMany({ where: { id: { in: made.store } } });
    await prisma.user.deleteMany({ where: { id: { in: made.user } } });
    if (onboardingNames.length)
      await prisma.notification.deleteMany({
        where: {
          title: "Vendor onboarded",
          OR: onboardingNames.map((name) => ({ body: { contains: name } })),
        },
      });
    const ids = Object.values(made).flat();
    if (ids.length)
      await prisma.notification.deleteMany({
        where: { OR: ids.map((id) => ({ linkUrl: { endsWith: `/${id}` } })) },
      });
    await prisma.$disconnect();
  });
