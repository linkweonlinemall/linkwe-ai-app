export const GUIDE_ROOT = "/dashboard/vendor/guided-creation";
export const GUIDE_VERSION = 1;
export type Answers = Record<string, string>;
export type Choice = { value: string; label: string; example: string };
export type Question = { id: string; title: string; help: string; choices: Choice[] };
export type Step = { id: string; title: string; detail: string };
export type GuideResult = {
  code: string; title: string; reason: string; kind: "product" | "service" | "event" | "ticket" | "review";
  productType?: "simple" | "variable" | "digital"; workflow?: string;
  prepare: string[]; steps: Step[]; cautions: string[];
};
export type GuidePlan = { id: string; title: string; answers: Answers; checked: string[]; version: number; guideVersion: number; updatedAt: string };
const choice = (value: string, label: string, example: string): Choice => ({ value, label, example });
const unsure = choice("unsure", "I’m not sure", "Help me choose with a simpler example.");
const questions: Record<string, Question> = {
  receive: { id: "receive", title: "What is your customer paying for?", help: "Think about the main thing they receive, rather than your business category.", choices: [
    choice("physical", "Something they can hold", "Clothes, food, candles or other physical goods."),
    choice("digital", "A file they download", "An ebook, a template or a ready-made digital file."),
    choice("service", "Your time, skills or ongoing care", "A haircut, repairs, a private lesson or monthly coaching."),
    choice("event", "Entry to an event", "A concert, party or group workshop on a fixed date."),
    choice("mixed", "A combination of these", "A kit with lessons, or an event with extra merchandise."), unsure,
  ] },
  mixed: { id: "mixed", title: "How do the parts of your offer fit together?", help: "Choose what the purchase primarily gives the customer. Parts sold separately usually need separate listings.", choices: [
    choice("physical", "A physical item with an included extra", "A craft kit with an included instruction sheet."),
    choice("service", "A service with included materials", "A salon treatment that includes the products used."),
    choice("event", "Event admission with included perks", "A VIP ticket that includes a meal."),
    choice("separate", "Separate purchases or a complex bundle", "A shirt plus an optional paid lesson, or several different offers."), unsure,
  ] },
  options: { id: "options", title: "Will customers choose between versions of the item?", help: "A version is a specific option you sell. A message typed by the customer is personalisation.", choices: [
    choice("none", "No, it is one version", "One candle, one size, one price."),
    choice("variants", "Yes, they choose a version", "A size, colour, flavour or another option—even if prices are the same."),
    choice("personal", "They only add personal details", "An engraved name or a gift message, with no versions to choose."),
    choice("both", "Versions and personal details", "A shirt size plus a name to print."), unsure,
  ] },
  axes: { id: "axes", title: "Which options will customers choose?", help: "You will enter the actual values and available combinations in the product form.", choices: [
    choice("size", "Size", "Small, medium and large."), choice("colour", "Colour", "Black, blue and red."),
    choice("both", "Size and colour", "Medium / blue and large / black."), choice("other", "Other options", "Flavour, material, pack size or another choice."), unsure,
  ] },
  file: { id: "file", title: "How will the digital purchase be delivered?", help: "A downloadable file and a live online appointment have different setups.", choices: [
    choice("ready", "A ready-made file", "The buyer downloads the same prepared file after payment."),
    choice("custom", "I create it for each customer", "A custom logo or report that needs a brief first."),
    choice("live", "A live online session", "A private consultation or lesson over a call."), unsure,
  ] },
  service: { id: "service", title: "How should a customer start this service?", help: "Choose the buying process you want customers to follow.", choices: [
    choice("appointment", "Choose an appointment time", "A haircut, massage or private lesson."),
    choice("quote", "Request a quote first", "Custom work where the scope or price needs discussion."),
    choice("subscription", "Pay regularly for ongoing service", "Weekly or monthly coaching, care or membership."),
    choice("callout", "Send a request for a visit", "A repair or callout you review and accept."),
    choice("event", "Attend at a fixed date with a group", "A scheduled workshop with admission tickets."), unsure,
  ] },
  location: { id: "location", title: "Where will the appointment happen?", help: "Customers choose a time in either case.", choices: [
    choice("person", "In person", "At your premises or the customer’s location."),
    choice("online", "Online", "A video call or online meeting link."), unsure,
  ] },
  event: { id: "event", title: "Have you already created this event on LinkWe?", help: "Tickets always belong to an event. Ticket tiers such as General and VIP are not product variants.", choices: [
    choice("new", "No, this is a new event", "Start with its date, venue and details, then add tickets."),
    choice("existing", "Yes, I need to add tickets", "Choose your existing event and add its ticket tiers."), unsure,
  ] },
};

function explanatoryQuestion(q: Question): Question {
  return { id: `${q.id}Help`, title: "Which example is closest to your offer?", help: q.help,
    choices: [...q.choices.filter(c => c.value !== "unsure").map(c => ({ ...c, label: c.example, example: c.label })), choice("unsure", "None of these fits yet", "Save a clarification checklist; we won’t guess your listing type.")] };
}

/** Builds one active branch. Answers from abandoned branches are never used. */
export function guideJourney(input: Answers) {
  const active: Question[] = [];
  const answers: Answers = {};
  let pending: Question | null = null;
  let uncertain = false;
  function ask(id: string): string | null {
    if (pending || uncertain) return null;
    const q = questions[id]; active.push(q);
    const value = input[id];
    if (!q.choices.some(c => c.value === value)) { pending = q; return null; }
    answers[id] = value;
    if (value !== "unsure") return value;
    const help = explanatoryQuestion(q); active.push(help);
    const resolved = input[help.id];
    if (!help.choices.some(c => c.value === resolved)) { pending = help; return null; }
    answers[help.id] = resolved;
    if (resolved === "unsure") { uncertain = true; return null; }
    return resolved;
  }
  let receive = ask("receive");
  let mixed = false;
  if (receive === "mixed") { mixed = true; receive = ask("mixed"); }
  let code = "";
  if (receive === "separate") code = "review";
  if (receive === "physical") {
    const options = ask("options");
    if (options === "none" || options === "personal") code = options === "personal" ? "personal" : "simple";
    if (options === "variants" || options === "both") {
      if (ask("axes")) code = options === "both" ? "variable-personal" : "variable";
    }
  }
  if (receive === "digital") {
    const file = ask("file");
    if (file === "ready") code = "digital";
    if (file === "custom") code = "QUOTE";
    if (file === "live") code = "VIRTUAL";
  }
  if (receive === "service") {
    const service = ask("service");
    if (service === "appointment") {
      const location = ask("location");
      if (location) code = location === "online" ? "VIRTUAL" : "BOOKABLE";
    }
    if (service === "quote") code = "QUOTE";
    if (service === "subscription") code = "SUBSCRIPTION";
    if (service === "callout") code = "ON_DEMAND";
    if (service === "event") receive = "event";
  }
  if (receive === "event") {
    const event = ask("event");
    if (event) code = event === "existing" ? "ticket" : "event";
  }
  if (uncertain) code = "review";
  return { questions: active, answers, pending, result: !pending && code ? recommendation(code, answers, mixed) : null };
}

export function cleanAnswers(input: unknown): Answers {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Choose answers from the guide.");
  const entries = Object.entries(input);
  if (entries.length > 20) throw Error("Too many answers.");
  for (const [key, value] of entries) {
    const base = key.endsWith("Help") ? key.slice(0, -4) : key;
    const q = Object.hasOwn(questions, base) ? questions[base] : null;
    if (!q || typeof value !== "string" || !(key.endsWith("Help") ? explanatoryQuestion(q) : q).choices.some(c => c.value === value)) throw Error("An answer is no longer supported. Reopen the guide.");
  }
  return guideJourney(input as Answers).answers;
}

export function changeAnswer(answers: Answers, questionId: string, value: string): Answers {
  const previous = guideJourney(answers).questions;
  const index = previous.findIndex(q => q.id === questionId);
  if (index < 0) return answers;
  const retained = Object.fromEntries(previous.slice(0, index).filter(q => answers[q.id]).map(q => [q.id, answers[q.id]]));
  return cleanAnswers({ ...retained, [questionId]: value });
}

const step = (id: string, title: string, detail: string): Step => ({ id, title, detail });
const presentation = [step("details", "Describe the offer clearly", "Add its name, category, description and photos. Explain exactly what the customer receives.")];
const review = step("review", "Review before you publish", "Check every price, setting and customer-facing detail. These ticks are your own checklist, not an automatic inspection. Save a draft when more work is needed.");

function recommendation(code: string, answers: Answers, mixed: boolean): GuideResult {
  const cautions: string[] = mixed ? ["Describe every included extra. Parts customers purchase separately may need their own listing; this guide does not create a combined checkout."] : [];
  if (code === "review") return { code, kind: "review", title: "Clarify the offer first", reason: "Your answers need a little more detail before a reliable listing type can be recommended.", prepare: ["What the customer receives", "How they pay and receive it", "Which parts are sold separately"], steps: [step("promise", "Write one clear purchase promise", "Finish this sentence: ‘The customer pays for … and receives it by …’."), step("separate", "Separate different purchases", "List physical goods, downloads, services and event admission separately when they have different buying processes."), step("revisit", "Revisit your answers", "Use Change answers, or contact vendor Support with your example before creating the listing.")], cautions: ["A complex bundle or an unsupported selling model should not be forced into a product type."] };
  if (["simple", "personal", "variable", "variable-personal", "digital"].includes(code)) {
    const variable = code.startsWith("variable"), digital = code === "digital", personal = code.includes("personal");
    const productType = digital ? "digital" : variable ? "variable" : "simple";
    const title = digital ? "Digital download" : variable ? "Product with options" : personal ? "Simple product with personalisation" : "Simple product";
    const reason = digital ? "The customer receives a ready-made file after purchase." : variable ? "Customers choose a specific version. Options still belong together when they share the same price." : personal ? "A typed name or message is a checkout detail, rather than a stocked product version." : "You are selling one version with one price and stock setting.";
    const steps = [step("type", `Choose ${variable ? "Variable product" : digital ? "Digital product" : "Simple product"}`, "The form opens with this type selected. You enter and review the remaining details yourself."), ...presentation];
    if (variable) steps.push(step("options", "Build your available combinations", `Add ${answers.axes === "both" ? "Size and Colour" : answers.axes === "size" ? "Size" : answers.axes === "colour" ? "Colour" : "your option names"} and their values. Keep only combinations you actually sell; enter each combination’s price and stock.`));
    else if (!digital) steps.push(step("stock", "Set your price and stock", "Enter the selling price and available quantity. Check the setting carefully if using unlimited stock."));
    if (digital) steps.push(step("file", "Upload and check the downloadable file", "Use the digital file upload, then review the price, licence, download limit and expiry. A listing photo is not the customer’s download."));
    if (personal) steps.push(step("personal", "Add the customer’s personalisation field", "Use checkout fields for the name or message, mark it required when needed, and explain any restrictions. Use a quote service if the price must be agreed individually."));
    if (!digital) steps.push(step("delivery", "Set delivery or pickup", "Choose the fulfilment options you can support and review delivery charges and preparation details."));
    steps.push(review);
    cautions.push(digital ? "Live calls and custom work belong in services. Downloads do not need physical delivery." : "Event admission belongs under events/tickets. Appointments and custom work belong under services.");
    return {code,kind:"product",title,reason,productType,prepare:digital?["Final downloadable file", "Cover image and description", "Price and licence terms"]:["Clear product photos", "Prices and available stock", variable?"Option values and combinations":"Delivery or pickup details", ...(personal?["Personalisation instructions"]:[])],steps,cautions};
  }
  if (code === "event" || code === "ticket") return {code,kind:code,title:code === "event" ? "Event, then tickets" : "Tickets for an existing event",reason:"Customers buy admission to a scheduled event. General, VIP and similar choices are ticket tiers.",prepare:["Event date, time and venue or online details", "Ticket tier names, prices and capacities", "Sales dates and what each ticket includes"],steps:[step("event",code === "event"?"Create the event first":"Choose the existing event","Check the event title, dates, location and cover. Avoid creating a second copy of an event you already have."),step("tickets","Add tickets under that event","Open Tickets & promotions. Add each tier’s price, quantity, What’s included, purchase limit and sales dates."),step("capacity","Check capacity and timing","Make sure ticket quantities fit the venue and that sales dates agree with the event. Review visible tiers and the event’s publication status."),review],cautions:[...cautions,"A private session where customers choose an appointment belongs under services. Ticket tiers are not product variants."]};
  const services: Record<string,{title:string;reason:string;prepare:string[];steps:Step[]}> = {
    BOOKABLE:{title:"Bookable service",reason:"The customer chooses an available time for an in-person appointment.",prepare:["Session duration and price","Working hours and available staff","Location and cancellation terms"],steps:[step("schedule","Set duration and availability","Review duration, buffer time, capacity and available days/hours. Set up staff and availability if a team delivers the service."),step("location","Set the service location","Choose your premises or the customer’s location and enter the relevant location or travel information.")]},
    VIRTUAL:{title:"Online appointment",reason:"You deliver a live session online, with a time the customer books.",prepare:["Session duration and price","Available appointment hours","Meeting platform and joining instructions"],steps:[step("schedule","Set appointment availability","Choose duration, buffer, capacity and available hours just as you would for an in-person booking."),step("virtual","Explain how to join","Set the meeting platform and joining details in the online appointment fields. Review what customers receive after booking.")]},
    QUOTE:{title:"Quote-based service",reason:"The scope or final price needs to be agreed with the customer before the work begins.",prepare:["A clear description of the work","Questions needed to prepare a quote","What is included and delivered"],steps:[step("quote","Choose your quote pricing approach","Choose a free quote, starting price or price range as appropriate. A starting price is not a promise that all jobs cost the same."),step("brief","Ask for the information you need","Use the quote questions and requirements to collect a useful brief. Explain how you will agree the final scope and price.")]},
    SUBSCRIPTION:{title:"Subscription service",reason:"The customer pays on a recurring schedule for an ongoing service.",prepare:["Recurring price and interval","Sessions or benefits in each cycle","Trial, pause and cancellation terms"],steps:[step("recurring","Configure each billing cycle","Set the recurring interval and price. State exactly how many sessions or which benefits are included."),step("terms","Review the subscription settings","Check trial pricing, pause options and cancellation terms. Only advertise the options you have enabled.")]},
    ON_DEMAND:{title:"Callout or visit request",reason:"Customers send a request for a service visit for you to review and accept.",prepare:["Service area and availability","Price and what it covers","Response and visit expectations"],steps:[step("callout","Set request and travel details","Explain your coverage area, location, price and relevant callout settings. A request does not guarantee immediate attendance."),step("requests","Prepare to manage requests","Review incoming requests in Service Desk and keep your availability and customer expectations up to date.")]},
  };
  const config = services[code];
  return {code,kind:"service",workflow:code,...config,steps:[step("type",`Choose ${config.title.toLowerCase()}`,"The correct service type is selected when you open the form."),...presentation,step("expectations","Set customer expectations","Complete What’s included, Before we begin and What the customer receives."),...config.steps,...(["BOOKABLE","VIRTUAL"].includes(code)?[step("payment","Review payment and cancellation","Choose from the payment methods your plan permits. If taking a deposit, check its amount and explain when the balance is due.")]:[]),review],cautions:[...cautions,"The guide is free. Your existing listing limits, payment options and other plan rules still apply in the form."]};
}

export function guideFormHref(result: GuideResult, id?: string): string | null {
  if (result.kind === "review") return null;
  const params = new URLSearchParams({ type: result.kind });
  if (result.productType) params.set("productType", result.productType);
  if (result.workflow) params.set("workflow", result.workflow);
  if (id) params.set("guide", id);
  return `/dashboard/vendor/creation/new?${params}`;
}

export const TYPE_GUIDANCE = [
  ["Simple product", "One version. Typed names and gift messages can use checkout fields."],
  ["Product with options", "Size, colour or other selectable versions—even when prices match."],
  ["Digital download", "A ready-made file delivered after purchase."],
  ["Service", "Appointments, custom quotes, recurring care or callout requests."],
  ["Event and tickets", "Admission to a fixed-date event; General and VIP are ticket tiers."],
] as const;
