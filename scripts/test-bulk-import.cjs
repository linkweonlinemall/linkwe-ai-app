const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const ExcelJS = require("exceljs");
require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ path: ".env", quiet: true });
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL || "").hostname)) throw new Error("Tests require a loopback development database.");
process.env.NODE_ENV = "test";
let session = null, sent = 0, emailFailure = false;
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === "@/lib/auth/session") return { getSession: async () => session };
  if (request === "next/cache") return { revalidatePath: () => {} };
  if (request === "@/lib/uploads/upload") return { uploadFile: async () => "https://example.com/photo.jpg" };
  if (request === "@/lib/email/resend") return { FROM_EMAIL: "test@example.test", BASE_URL: "http://localhost:3000", resend: { emails: { send: async () => { if (emailFailure) return { error: { message: "Simulated delivery failure" } }; sent++; return { data: { id: "test-message" }, error: null }; } } } };
  if (request.startsWith("@/")) request = path.join(process.cwd(), request.slice(2));
  return originalLoad.call(this, request, parent, isMain);
};
require.extensions[".ts"] = function(mod, filename) { mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename); };
const { prisma } = require("../lib/prisma.ts");
const actions = require("../app/actions/bulk-import.ts");
const { parseImportFile } = require("../lib/imports/parser.ts");
const { convertCell, csvText, photoMatches } = require("../lib/imports/model.ts");
const { importFields } = require("../lib/imports/fields.ts");
const stamp = `import-test-${Date.now()}`;
const users = [], stores = [], products = [], events = [], batches = [];
let checks = 0;
async function test(name, fn) { await fn(); checks++; console.log(`PASS ${name}`); }
async function batch(kind, rows, storeId = null) {
  const b = await actions.createImportBatch(kind, `${stamp}.csv`, { name: "Data", headers: [...new Set(rows.flatMap(Object.keys))], rows }, storeId);
  batches.push(b.id); return b;
}
async function command(b, operation, options = {}) {
  const current = await actions.getImportBatch(b.id);
  const input = { operation, rowIds: current.rows.map(r => r.id), versions: Object.fromEntries(current.rows.map(r => [r.id, r.version])), ...options };
  return actions.runImportCommand(b.id, input);
}
async function reviewed(b, operation, options = {}) {
  const current = await actions.getImportBatch(b.id);
  const input = { operation, rowIds: current.rows.map(r => r.id), versions: Object.fromEntries(current.rows.map(r => [r.id, r.version])), ...options };
  const review = await actions.prepareImportReview(b.id, input);
  return { results: await actions.confirmImportReview(review.token), review };
}
async function track(b) {
  const current = await actions.getImportBatch(b.id);
  for (const row of current.rows) {
    if (row.createdUserId && !users.includes(row.createdUserId)) users.push(row.createdUserId);
    if (row.createdRecord && row.recordId) {
      const group = b.kind === "vendor" ? stores : b.kind === "event" ? events : products;
      if (!group.includes(row.recordId)) group.push(row.recordId);
    }
  }
  return current;
}
async function run() {
  await test("access requires an administrator", async () => { await assert.rejects(actions.getImportWorkspace, /Administrator/); session = { userId: "x", role: "VENDOR" }; await assert.rejects(actions.getImportWorkspace, /Administrator/); });
  const actor = await prisma.user.create({ data: { fullName: stamp, email: `${stamp}@example.test`, role: "ADMIN" } }); users.push(actor.id); session = { userId: actor.id, role: "ADMIN" };
  await test("CSV quoted fields, multiline text, BOM and trailing empty rows", async () => { const [sheet] = await parseImportFile(new File(['\uFEFFname,description\r\n"Tee, blue","Line one\nLine two"\r\n'], "test.csv")); assert.equal(sheet.rows[0].name, "Tee, blue"); assert.match(sheet.rows[0].description, /\n/); });
  await test("Excel sheet selection and formula rejection", async () => { const workbook = new ExcelJS.Workbook(); workbook.addWorksheet("Products").addRows([["name", "price"], ["Tee", 25]]); workbook.addWorksheet("Events").addRows([["title", "startDate"], ["Meetup", new Date("2027-06-12T18:00:00Z")]]); const sheets = await parseImportFile(new File([await workbook.xlsx.writeBuffer()], "test.xlsx")); assert.equal(sheets.length, 2); assert.equal(sheets[1].rows[0].startDate, "2027-06-12T18:00:00.000-04:00"); workbook.worksheets[0].getCell("B2").value = { formula: "1+1", result: 2 }; await assert.rejects(() => parseImportFile(new File([workbook.xlsx.writeBuffer()], "bad.xlsx"))); await assert.rejects(async () => parseImportFile(new File([await workbook.xlsx.writeBuffer()], "bad.xlsx")), /formula/i); });
  await test("reject duplicate headings and oversized batches", async () => { await assert.rejects(() => parseImportFile(new File(["name,name\na,b"], "test.csv")), /uniquely/); await assert.rejects(() => batch("product", Array.from({ length: 501 }, () => ({ name: "Too many" }))), /500/); });
  await test("date, currency, booleans and list conversion are explicit", async () => { const date = importFields("event").find(f => f.name === "startDate"); assert.equal(convertCell("2027-06-12T18:00", date), "2027-06-12T22:00:00.000Z"); assert.throws(() => convertCell("2027-02-30", date), /valid date/); assert.throws(() => convertCell("12/06/2027", date), /YYYY/); const price = importFields("product").find(f => f.name === "price"); assert.equal(convertCell("1,234.50", price), 1234.5); assert.throws(() => convertCell("$25", price)); assert.match(csvText(["x"], [{ x: "=HYPERLINK(1)" }]), /'=HYPERLINK/); });
  let vendors;
  await test("vendor and store creation is draft-only and sends no invitation", async () => {
    vendors = await batch("vendor", [{ vendorName: "Test owner", email: `${stamp}-vendor@example.test`, name: `${stamp} store` }]); const result = await command(vendors, "import"); assert.equal(result[0].ok, true, JSON.stringify(result)); vendors = await track(vendors); const store = await prisma.store.findUniqueOrThrow({ where: { id: vendors.rows[0].recordId } }); assert.equal(store.status, "DRAFT"); assert.equal(sent, 0);
  });
  await test("existing vendor is reused without overwriting their profile", async () => { const owner = await prisma.user.create({ data: { fullName: "Original profile", role: "VENDOR", email: `${stamp}-existing@example.test` } }); users.push(owner.id); const b = await batch("vendor", [{ vendorName: "Spreadsheet name", email: owner.email.toUpperCase(), name: `${stamp} second store` }]); assert.equal((await command(b, "import"))[0].ok, true); const current = await track(b); assert.equal(current.rows[0].createdUserId, null); assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).fullName, "Original profile"); });
  await test("repeat vendor import skips the existing store", async () => { const b = await batch("vendor", [{ email: `${stamp}-vendor@example.test`, name: `${stamp} store` }]); assert.equal((await command(b, "import"))[0].ok, true); const current = await actions.getImportBatch(b.id); assert.equal(current.rows[0].state, "skipped"); assert.equal(current.rows[0].recordId, vendors.rows[0].recordId); assert.equal(await prisma.store.count({ where: { ownerId: vendors.rows[0].createdUserId } }), 1); });
  await test("different store name for the same owner is flagged", async () => { const b = await batch("vendor", [{ email: `${stamp}-vendor@example.test`, name: "Unrelated business" }]); const result = await command(b, "import"); assert.equal(result[0].ok, false); assert.match(result[0].message, /already owns/); });
  await test("partial failure preserves good rows and rolls back bad rows", async () => { const b = await batch("vendor", [{ vendorName: "Good", email: `${stamp}-good@example.test`, name: `${stamp} good` }, { vendorName: "Bad", email: "invalid-email", name: "Bad store" }]); const results = await command(b, "import"); await track(b); assert.equal(results.filter(r => r.ok).length, 1); assert.equal(await prisma.user.count({ where: { email: "invalid-email" } }), 0); assert.equal((await actions.getImportBatch(b.id)).rows[1].state, "failed"); });
  let productBatch;
  await test("product import includes variations and photo URLs", async () => { productBatch = await batch("product", [{ name: `${stamp} tee`, price: 150, sku: `${stamp}-TEE`, images: "https://example.com/a.jpg|https://example.com/b.jpg", variants: JSON.stringify([{ name: "Small", price: 150, stock: 4, attributes: { size: "S" }, images: [] }]), hasVariants: "yes" }], vendors.rows[0].recordId); const result = await command(productBatch, "import"); assert.equal(result[0].ok, true, JSON.stringify(result)); productBatch = await track(productBatch); const product = await prisma.product.findUniqueOrThrow({ where: { id: productBatch.rows[0].recordId }, include: { variants: true } }); assert.equal(product.images.length, 2); assert.equal(product.variants.length, 1); assert.equal(product.isPublished, false); });
  await test("retrying an imported row does not duplicate the product", async () => { await command(productBatch, "import"); assert.equal(await prisma.product.count({ where: { sku: `${stamp}-TEE` } }), 1); });
  await test("quick edits, photo order, stale versions and undo", async () => { assert.equal((await command(productBatch, "edit", { patch: { price: 175, images: ["https://example.com/b.jpg", "https://example.com/a.jpg"] } }))[0].ok, true); let b = await actions.getImportBatch(productBatch.id); assert.equal(b.rows[0].values.price, 175); assert.equal(b.rows[0].values.images[0], "https://example.com/b.jpg"); const stale = await actions.runImportCommand(b.id, { operation: "edit", rowIds: [b.rows[0].id], versions: { [b.rows[0].id]: 0 }, patch: { price: 999 } }); assert.equal(stale[0].ok, false); const latest = b.changes.find(c => c.action === "edit"); await command(b, "undo", { changeId: latest.id }); b = await actions.getImportBatch(b.id); assert.equal(b.rows[0].values.price, 150); });
  await test("database errors cannot leave half-created items", async () => { const b = await batch("product", [{ name: `${stamp} bad variants`, variants: JSON.stringify([{ name: "Broken", stock: -1 }]) }], vendors.rows[0].recordId); assert.equal((await command(b, "import"))[0].ok, false); assert.equal(await prisma.product.count({ where: { name: `${stamp} bad variants` } }), 0); await command(b, "edit", { patch: { variants: [{ name: "Fixed", stock: 1, images: [], attributes: {} }] } }); assert.equal((await command(b, "import"))[0].ok, true); await track(b); });
  await test("existing update requires review and cleanup protects pre-existing records", async () => { const b = await batch("product", [{ name: "Renamed tee", sku: `${stamp}-TEE`, price: 222 }], vendors.rows[0].recordId); await command(b, "import"); await assert.rejects(() => command(b, "update_existing"), /Review/); const reviewedResult = await reviewed(b, "update_existing"); assert.equal(reviewedResult.results[0].ok, true, JSON.stringify(reviewedResult)); assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productBatch.rows[0].recordId } })).price, 222); const replay = await actions.confirmImportReview(reviewedResult.review.token); assert.equal(replay[0].ok, false); const cleanup = await reviewed(b, "delete"); assert.equal(cleanup.results[0].ok, false); });
  await test("external record changes are detected before overwriting", async () => { const result = await command(productBatch, "edit", { patch: { price: 1 } }); assert.equal(result[0].ok, false); assert.match(result[0].message, /outside/); await command(productBatch, "refresh"); assert.equal((await command(productBatch, "edit", { patch: { price: 200 } }))[0].ok, true); });
  await test("publishing requires complete fields and explicit review", async () => { await assert.rejects(() => command(productBatch, "publish"), /Review/); let result = await reviewed(productBatch, "publish"); assert.equal(result.results[0].ok, false); await command(productBatch, "edit", { patch: { description: "Complete sample description", category: "clothing_apparel" } }); result = await reviewed(productBatch, "publish"); assert.equal(result.results[0].ok, true, JSON.stringify(result)); await command(productBatch, "draft"); });
  let eventBatch;
  await test("incomplete event stays saved and can be completed later", async () => { eventBatch = await batch("event", [{ title: `${stamp} event` }], vendors.rows[0].recordId); assert.equal((await command(eventBatch, "import"))[0].ok, false); assert.equal((await actions.getImportBatch(eventBatch.id)).rows[0].values.title, `${stamp} event`); await command(eventBatch, "edit", { patch: { startDate: "2027-12-12T22:00:00Z", ticketTypes: [{ name: "General", price: 100, quantity: 50, isVisible: true }] } }); const result = await command(eventBatch, "import"); assert.equal(result[0].ok, true, JSON.stringify(result)); eventBatch = await track(eventBatch); const event = await prisma.event.findUniqueOrThrow({ where: { id: eventBatch.rows[0].recordId }, include: { ticketTypes: true } }); assert.equal(event.status, "DRAFT"); assert.equal(event.ticketTypes.length, 1); });
  await test("service draft preserves booking and subscription fields", async () => { const b = await batch("service", [{ name: `${stamp} service`, price: 250, serviceType: "SUBSCRIPTION", subscriptionInterval: "monthly", sessionsIncluded: 4, serviceRequirements: "Bring a towel", requiresDeposit: "no" }], vendors.rows[0].recordId); const result = await command(b, "import"); assert.equal(result[0].ok, true, JSON.stringify(result)); const loaded = await track(b); assert.equal(loaded.rows[0].values.sessionsIncluded, 4); assert.equal(loaded.rows[0].values.serviceRequirements, "Bring a towel"); });
  await test("invitations report delivery failures and send only on explicit confirmation", async () => { assert.equal(sent, 0); emailFailure = true; let result = await reviewed(vendors, "invite"); assert.equal(result.results[0].ok, false); assert.match(result.results[0].message, /not delivered/); emailFailure = false; result = await reviewed(vendors, "invite"); assert.equal(result.results[0].ok, true, JSON.stringify(result)); assert.equal(sent, 1); result = await reviewed(vendors, "invite"); assert.equal(sent, 1); });
  await test("unsupported fields and cross-batch row IDs are rejected", async () => { const result = await command(productBatch, "edit", { patch: { passwordHash: "injected", isPublished: true } }); assert.equal(result[0].ok, false); const current = await actions.getImportBatch(vendors.id); const cross = await actions.runImportCommand(productBatch.id, { operation: "edit", rowIds: [current.rows[0].id], versions: { [current.rows[0].id]: current.rows[0].version }, patch: { name: "injected" } }); assert.equal(cross[0].ok, false); });
  await test("photo filename matching flags uncertainty", async () => { const rows = (await actions.getImportBatch(productBatch.id)).rows; assert.deepEqual(photoMatches(`${stamp}-TEE-1.jpg`, rows, "product"), [rows[0].id]); assert.equal(photoMatches("unmatched.jpg", rows, "product").length, 0); assert.equal(photoMatches(`${stamp}-TEE.jpg`, [rows[0], { ...rows[0], id: "second" }], "product").length, 2); });
  await test("cleanup removes only this batch's unused drafts", async () => { const result = await reviewed(eventBatch, "delete"); assert.equal(result.results[0].ok, true, JSON.stringify(result)); assert.equal(await prisma.event.count({ where: { id: eventBatch.rows[0].recordId } }), 0); assert.ok(await prisma.user.findUnique({ where: { id: vendors.rows[0].createdUserId } })); });
  await test("preflight checks detect duplicates without creating records", async () => {
    const b = await batch("product", [{ name: `${stamp} preflight`, sku: `${stamp}-TEE` }], vendors.rows[0].recordId);
    const before = await prisma.product.count();
    assert.equal((await command(b, "check"))[0].ok, true);
    assert.match((await actions.getImportBatch(b.id)).rows[0].note, /will skip/);
    assert.equal(await prisma.product.count(), before);
  });
  await test("an invalid staged row can be corrected one field at a time", async () => {
    const b = await batch("product", [{ name: `${stamp} incremental`, price: "bad", stock: "bad" }], vendors.rows[0].recordId);
    assert.equal((await command(b, "edit", { patch: { price: 20 } }))[0].ok, true);
    let current = await actions.getImportBatch(b.id);
    assert.equal(current.rows[0].values.price, 20); assert.ok(current.rows[0].errors.stock);
    await command(b, "edit", { patch: { stock: 5 } });
    assert.equal((await command(b, "import"))[0].ok, true); await track(b);
  });
  await test("several quick edits can be undone in reverse order", async () => {
    await command(productBatch, "edit", { patch: { price: 210 } });
    let current = await actions.getImportBatch(productBatch.id);
    const firstChange = current.changes.find(c => c.action === "edit" && !c.undone);
    await command(productBatch, "edit", { patch: { price: 220 } });
    current = await actions.getImportBatch(productBatch.id);
    const secondChange = current.changes.find(c => c.action === "edit" && !c.undone);
    await assert.rejects(() => command(productBatch, "undo", { changeId: firstChange.id }), /newer/);
    await command(productBatch, "undo", { changeId: secondChange.id });
    await command(productBatch, "undo", { changeId: firstChange.id });
    assert.equal((await actions.getImportBatch(productBatch.id)).rows[0].values.price, 200);
  });
  await test("edits cannot make an already published product invalid", async () => {
    assert.equal((await reviewed(productBatch, "publish")).results[0].ok, true);
    const result = await command(productBatch, "edit", { patch: { images: [] } });
    assert.equal(result[0].ok, false);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productBatch.rows[0].recordId } })).images.length, 2);
    await command(productBatch, "draft");
  });
  await test("cleanup preserves linked customer activity", async () => {
    const cart = await prisma.productCartItem.create({ data: { userId: actor.id, productId: productBatch.rows[0].recordId, quantity: 1 } });
    try { const result = await reviewed(productBatch, "delete"); assert.equal(result.results[0].ok, false); assert.match(result.results[0].message, /linked activity/); }
    finally { await prisma.productCartItem.delete({ where: { id: cart.id } }); }
  });
  await test("overlapping imports serialize without duplicating a product", async () => {
    const name = `${stamp} concurrent`, a = await batch("product", [{ name }], vendors.rows[0].recordId), b = await batch("product", [{ name }], vendors.rows[0].recordId);
    await Promise.all([command(a, "import"), command(b, "import")]);
    await command(a, "import"); await command(b, "import");
    await track(a); await track(b);
    assert.equal(await prisma.product.count({ where: { name, storeId: vendors.rows[0].recordId } }), 1);
  });
  await test("rich descriptions keep formatting and discard executable HTML", async () => {
    const result = await command(productBatch, "edit", { patch: { description: '<p>Local <strong>quality</strong></p><img src=x onerror=alert(1)><script>alert(1)</script><a href="javascript:alert(1)">More</a>' } });
    assert.equal(result[0].ok, true);
    const description = (await actions.getImportBatch(productBatch.id)).rows[0].values.description;
    assert.match(description, /<strong>quality<\/strong>/); assert.doesNotMatch(description, /script|onerror|<img/);
  });
  await test("bulk photo groups save together and repeated assignments preserve the cover", async () => {
    const { planPhotoAssignments } = require("../lib/imports/photos.ts");
    const assets = await Promise.all(["one", "two"].map(name => prisma.importAsset.create({ data: { batchId: vendors.id, name: `${name}.jpg`, url: `https://example.com/group-${name}.jpg` } })));
    let current = await actions.getImportBatch(vendors.id);
    const assignments = Object.fromEntries(assets.map(asset => [asset.id, current.rows[0].id]));
    const [plan] = planPhotoAssignments(current, assignments);
    assert.equal((await command(current, "edit", { rowIds: [plan.id], patch: plan.patch }))[0].ok, true);
    current = await actions.getImportBatch(vendors.id);
    assert.equal(current.rows[0].values.coverPhotoUrl, assets[0].url);
    assert.deepEqual(current.rows[0].values.storeGallery, assets.map(asset => asset.url));
    assert.deepEqual(planPhotoAssignments(current, assignments), []);
  });
  console.log(`\n${checks} import checks passed. No real emails, uploads or production records were used.`);
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  // Discover test-owned records even if an assertion failed after a successful transaction.
  const testBatches = await prisma.importBatch.findMany({ where: { filename: `${stamp}.csv` }, include: { rows: true } });
  for (const b of testBatches) for (const r of b.rows) { if (r.createdUserId) users.push(r.createdUserId); if (r.createdRecord && r.recordId) (b.kind === "vendor" ? stores : b.kind === "event" ? events : products).push(r.recordId); }
  await prisma.importBatch.deleteMany({ where: { id: { in: testBatches.map(b => b.id) } } });
  await prisma.eventTicketType.deleteMany({ where: { eventId: { in: events } } });
  await prisma.event.deleteMany({ where: { id: { in: events } } });
  await prisma.productVariant.deleteMany({ where: { productId: { in: products } } });
  await prisma.product.deleteMany({ where: { id: { in: products } } });
  await prisma.storeImage.deleteMany({ where: { storeId: { in: stores } } });
  await prisma.store.deleteMany({ where: { id: { in: stores } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});
