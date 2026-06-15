import { BASE_URL } from "./resend";

// Shared email HTML wrapper
function wrap(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LinkWe</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="background:#1C1C1A;border-radius:16px 16px 0 0;padding:24px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
                Link<span style="color:#D4450A;">We</span>
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e4e4e7;border-right:1px solid #e4e4e7;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;border-radius:0 0 16px 16px;border:1px solid #e4e4e7;border-top:none;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;">
                LinkWe Online Directory · Trinidad & Tobago<br/>
                <a href="${BASE_URL}/privacy" style="color:#a1a1aa;">Privacy Policy</a> ·
                <a href="${BASE_URL}/terms" style="color:#a1a1aa;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;background:linear-gradient(135deg,#D4450A,#E8820C);color:#ffffff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:12px;text-decoration:none;">${label}</a>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#18181b;line-height:1.3;">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#52525b;">${text}</p>`;
}

function infoBox(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px 12px;font-size:12px;color:#71717a;font-weight:600;white-space:nowrap;">${r.label}</td>
          <td style="padding:8px 12px;font-size:13px;color:#18181b;font-weight:700;">${r.value}</td>
        </tr>`,
    )
    .join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f9f9f9;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
    ${rowsHtml}
  </table>`;
}

// ─── TEMPLATES ───────────────────────────────────────────────

export function newOrderVendorEmail(data: {
  vendorName: string;
  orderRef: string;
  itemCount: number;
  totalTTD: number;
  dashboardUrl: string;
}) {
  const content = `
    ${heading("You have a new order!")}
    ${para(`Hi ${data.vendorName}, a customer just placed an order in your store.`)}
    ${infoBox([
      { label: "Order", value: `#${data.orderRef}` },
      { label: "Items", value: `${data.itemCount} item${data.itemCount !== 1 ? "s" : ""}` },
      { label: "Total", value: `TTD ${data.totalTTD.toFixed(2)}` },
    ])}
    ${para("Log in to your dashboard to view the order details and prepare it for pickup or delivery.")}
    ${btn("View order", data.dashboardUrl)}
  `;
  return {
    subject: `New order #${data.orderRef} — LinkWe`,
    html: wrap(content, `You have a new order #${data.orderRef} worth TTD ${data.totalTTD.toFixed(2)}`),
  };
}

export function orderConfirmedCustomerEmail(data: {
  customerName: string;
  orderRef: string;
  itemCount: number;
  totalTTD: number;
  orderUrl: string;
}) {
  const content = `
    ${heading("Order confirmed")}
    ${para(`Hi ${data.customerName}, your order has been placed successfully.`)}
    ${infoBox([
      { label: "Order", value: `#${data.orderRef}` },
      { label: "Items", value: `${data.itemCount} item${data.itemCount !== 1 ? "s" : ""}` },
      { label: "Total", value: `TTD ${data.totalTTD.toFixed(2)}` },
    ])}
    ${para("You will receive updates as your order is prepared and shipped.")}
    ${btn("Track your order", data.orderUrl)}
  `;
  return {
    subject: `Order confirmed — #${data.orderRef}`,
    html: wrap(content, `Your order #${data.orderRef} has been confirmed`),
  };
}

export function newBookingVendorEmail(data: {
  vendorName: string;
  serviceName: string;
  customerName: string;
  bookingDate: string;
  startTime: string;
  dashboardUrl: string;
}) {
  const content = `
    ${heading("New booking received")}
    ${para(`Hi ${data.vendorName}, you have a new booking for ${data.serviceName}.`)}
    ${infoBox([
      { label: "Service", value: data.serviceName },
      { label: "Customer", value: data.customerName },
      { label: "Date", value: data.bookingDate },
      { label: "Time", value: data.startTime },
    ])}
    ${para("Log in to your dashboard to confirm or manage this booking.")}
    ${btn("View booking", data.dashboardUrl)}
  `;
  return {
    subject: `New booking — ${data.serviceName}`,
    html: wrap(content, `New booking for ${data.serviceName} on ${data.bookingDate}`),
  };
}

export function bookingConfirmedCustomerEmail(data: {
  customerName: string;
  serviceName: string;
  storeName: string;
  bookingDate: string;
  startTime: string;
  orderUrl: string;
}) {
  const content = `
    ${heading("Booking confirmed")}
    ${para(`Hi ${data.customerName}, your booking is confirmed.`)}
    ${infoBox([
      { label: "Service", value: data.serviceName },
      { label: "Provider", value: data.storeName },
      { label: "Date", value: data.bookingDate },
      { label: "Time", value: data.startTime },
    ])}
    ${para("We look forward to seeing you. Contact the provider if you need to reschedule.")}
    ${btn("View booking", data.orderUrl)}
  `;
  return {
    subject: `Booking confirmed — ${data.serviceName}`,
    html: wrap(content, `Your booking for ${data.serviceName} on ${data.bookingDate} is confirmed`),
  };
}

export function newOnDemandRequestVendorEmail(data: {
  vendorName: string;
  serviceName: string;
  customerName: string;
  description: string;
  address: string | null;
  dashboardUrl: string;
}) {
  const content = `
    ${heading("New on-demand request")}
    ${para(`Hi ${data.vendorName}, a customer has sent you an on-demand request.`)}
    ${infoBox([
      { label: "Service", value: data.serviceName },
      { label: "Customer", value: data.customerName },
      ...(data.address ? [{ label: "Location", value: data.address }] : []),
    ])}
    <div style="margin:16px 0;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px 16px;">
      <p style="margin:0;font-size:12px;color:#92400e;font-weight:600;">Request details</p>
      <p style="margin:4px 0 0;font-size:13px;color:#78350f;line-height:1.6;">${data.description}</p>
    </div>
    ${para("Log in to your dashboard to accept or decline this request.")}
    ${btn("View request", data.dashboardUrl)}
  `;
  return {
    subject: `New on-demand request — ${data.serviceName}`,
    html: wrap(content, `New on-demand request for ${data.serviceName}`),
  };
}

export function onDemandAcceptedCustomerEmail(data: {
  customerName: string;
  serviceName: string;
  storeName: string;
  quotedPrice: number | null;
  estimatedArrival: string | null;
  requestsUrl: string;
}) {
  const content = `
    ${heading("Your request was accepted")}
    ${para(`Hi ${data.customerName}, ${data.storeName} has accepted your on-demand request.`)}
    ${infoBox([
      { label: "Service", value: data.serviceName },
      { label: "Provider", value: data.storeName },
      ...(data.quotedPrice ? [{ label: "Quoted price", value: `TTD ${data.quotedPrice.toFixed(2)}` }] : []),
      ...(data.estimatedArrival ? [{ label: "Estimated arrival", value: data.estimatedArrival }] : []),
    ])}
    ${para("Log in to confirm the job and choose how you would like to pay.")}
    ${btn("View and confirm", data.requestsUrl)}
  `;
  return {
    subject: `Request accepted — ${data.serviceName}`,
    html: wrap(content, `${data.storeName} accepted your request for ${data.serviceName}`),
  };
}

export function onDemandDeclinedCustomerEmail(data: {
  customerName: string;
  serviceName: string;
  storeName: string;
  reason: string | null;
  servicesUrl: string;
}) {
  const content = `
    ${heading("Request declined")}
    ${para(`Hi ${data.customerName}, unfortunately ${data.storeName} was unable to take your request for ${data.serviceName}.`)}
    ${data.reason ? `<div style="margin:16px 0;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px 16px;">
      <p style="margin:0;font-size:12px;color:#991b1b;font-weight:600;">Reason</p>
      <p style="margin:4px 0 0;font-size:13px;color:#7f1d1d;">${data.reason}</p>
    </div>` : ""}
    ${para("You can find other providers for this service on LinkWe.")}
    ${btn("Browse services", data.servicesUrl)}
  `;
  return {
    subject: `Request declined — ${data.serviceName}`,
    html: wrap(content, `${data.storeName} declined your request for ${data.serviceName}`),
  };
}

export function ticketConfirmationEmail(data: {
  customerName: string;
  eventTitle: string;
  orderRef: string;
  ticketCount: number;
  totalTTD: number;
  myTicketsUrl: string;
}) {
  const content = `
    ${heading("Your tickets are confirmed!")}
    ${para(`Hi ${data.customerName}, your ticket purchase was successful.`)}
    ${infoBox([
      { label: "Event", value: data.eventTitle },
      { label: "Order", value: `#${data.orderRef}` },
      { label: "Tickets", value: `${data.ticketCount} ticket${data.ticketCount !== 1 ? "s" : ""}` },
      { label: "Total", value: data.totalTTD === 0 ? "Free" : `TTD ${data.totalTTD.toFixed(2)}` },
    ])}
    ${para("Your tickets are saved to your account. You can view and share them from your tickets page.")}
    ${btn("View my tickets", data.myTicketsUrl)}
  `;
  return {
    subject: `Tickets confirmed — ${data.eventTitle}`,
    html: wrap(content, `Your tickets for ${data.eventTitle} are confirmed`),
  };
}

export function newReviewVendorEmail(data: {
  vendorName: string;
  reviewerName: string;
  productName: string;
  rating: number;
  body: string | null;
  dashboardUrl: string;
}) {
  const ratingLine = `Rating: ${data.rating} out of 5`;
  const content = `
    ${heading("You received a new review")}
    ${para(`Hi ${data.vendorName}, ${data.reviewerName} left a review on ${data.productName}.`)}
    <div style="margin:16px 0;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;">
      <p style="margin:0;font-size:18px;color:#D97706;font-weight:700;">${ratingLine}</p>
      ${data.body ? `<p style="margin:8px 0 0;font-size:13px;color:#78350f;line-height:1.6;">"${data.body}"</p>` : ""}
    </div>
    ${btn("View review", data.dashboardUrl)}
  `;
  return {
    subject: `New ${data.rating}-star review on ${data.productName}`,
    html: wrap(content, `${data.reviewerName} left a ${data.rating}-star review`),
  };
}
