import nodemailer from "nodemailer";
import { bestPromo } from "../../lib/promotions";
import type { OfferMatch } from "../../lib/types";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}


function priceBlockText(m: OfferMatch): string[] {
  const lines = [
    `Precio góndola: ${formatMoney(m.snapshot.price)} (lista ${formatMoney(m.snapshot.listPrice)})`,
    `Objetivo: ${formatMoney(m.targetPrice)}`,
  ];

  const promo = bestPromo(m.snapshot.promotions);
  if (promo?.pricing && promo.pricing.summary !== "promo") {
    lines.push(
      `Con oferta (${promo.pricing.summary}): ${formatMoney(promo.pricing.unitEffectivePrice)} c/u` +
        ` — llevando ${promo.pricing.unitsToBuy} pagás ${formatMoney(promo.pricing.totalToPay)}`,
    );
    if (promo.pricing.validUntilLabel) {
      lines.push(`Vigencia: ${promo.pricing.validUntilLabel}`);
    }
  } else if (promo?.pricing?.validUntilLabel) {
    lines.push(`Vigencia: ${promo.pricing.validUntilLabel}`);
  }

  return lines;
}

function priceBlockHtml(m: OfferMatch): string {
  const promo = bestPromo(m.snapshot.promotions);
  const offerPrice =
    promo?.pricing && promo.pricing.summary !== "promo"
      ? `<p style="margin:8px 0 4px;font-size:20px">
           <strong>Con oferta: ${formatMoney(promo.pricing.unitEffectivePrice)} c/u</strong>
           <span style="color:#555;font-size:14px"> (${promo.pricing.summary},
           llevando ${promo.pricing.unitsToBuy} pagás ${formatMoney(promo.pricing.totalToPay)})</span>
         </p>`
      : "";

  const vigencia =
    promo?.pricing?.validUntilLabel
      ? `<p style="margin:0 0 8px;color:#0a7">Vigencia: ${escapeHtml(promo.pricing.validUntilLabel)}</p>`
      : "";

  return `
    <p style="margin:0 0 4px">
      Precio góndola: <strong>${formatMoney(m.snapshot.price)}</strong>
      <span style="color:#777"> (lista ${formatMoney(m.snapshot.listPrice)}, objetivo ${formatMoney(m.targetPrice)})</span>
    </p>
    ${offerPrice}
    ${vigencia}
  `;
}

export function buildAlertEmail(matches: OfferMatch[]): {
  subject: string;
  html: string;
  text: string;
} {
  const count = matches.length;
  const firstPromo = count === 1 ? bestPromo(matches[0].snapshot.promotions) : undefined;
  const subject =
    count === 1
      ? firstPromo?.pricing && firstPromo.pricing.summary !== "promo"
        ? `Oferta: ${matches[0].trackedName} → ${formatMoney(firstPromo.pricing.unitEffectivePrice)} c/u`
        : `Oferta: ${matches[0].trackedName} en ${matches[0].snapshot.store}`
      : `${count} ofertas nuevas detectadas`;

  const blocks = matches.map((m) => {
    const reasons = m.triggers.map((t) => `• ${t.message}`).join("\n");
    const link = m.snapshot.url ? `\n${m.snapshot.url}` : "";
    return [
      `${m.trackedName} (${m.snapshot.productName})`,
      `Tienda: ${m.snapshot.store}`,
      ...priceBlockText(m),
      reasons,
      link,
    ].join("\n");
  });

  const text = blocks.join("\n\n---\n\n");

  const html = matches
    .map((m) => {
      const reasons = m.triggers.map((t) => `<li>${escapeHtml(t.message)}</li>`).join("");
      const link = m.snapshot.url
        ? `<p><a href="${escapeHtml(m.snapshot.url)}">Ver en ${escapeHtml(m.snapshot.store)}</a></p>`
        : "";
      return `
        <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #ddd">
          <h2 style="margin:0 0 8px;font-size:18px">${escapeHtml(m.trackedName)}</h2>
          <p style="margin:0 0 8px;color:#555">${escapeHtml(m.snapshot.productName)}</p>
          ${priceBlockHtml(m)}
          <ul>${reasons}</ul>
          ${link}
        </div>`;
    })
    .join("");

  return {
    subject,
    text,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px">${html}</div>`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendAlertEmail(opts: {
  user: string;
  appPassword: string;
  to: string;
  matches: OfferMatch[];
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: opts.user,
      pass: opts.appPassword,
    },
  });

  const { subject, html, text } = buildAlertEmail(opts.matches);

  await transporter.sendMail({
    from: `Ofertas <${opts.user}>`,
    to: opts.to,
    subject,
    html,
    text,
  });
}
