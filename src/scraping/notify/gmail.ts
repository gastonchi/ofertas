import nodemailer from "nodemailer";
import { effectiveUnitPrice } from "../../lib/promotions";
import { STORE_COLORS, STORE_LABELS } from "../../lib/stores";
import type { OfferMatch, StoreId } from "../../lib/types";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function storeBadgeLabel(store: StoreId): string {
  return STORE_LABELS[store].toUpperCase();
}

function getEffectivePrice(m: OfferMatch): number {
  const { effective } = effectiveUnitPrice(m.snapshot.price, m.snapshot.promotions);
  return effective;
}

function promoDetailLine(m: OfferMatch): string | null {
  if (m.snapshot.onlineExclusiveLabel) {
    return `💳 ${m.snapshot.onlineExclusiveLabel}`;
  }

  const { bestPromotion, hasPromo } = effectiveUnitPrice(
    m.snapshot.price,
    m.snapshot.promotions,
  );
  const pricing = bestPromotion?.pricing;

  if (hasPromo && pricing && pricing.summary !== "promo") {
    if (pricing.unitsToBuy > 1) {
      return `⚡ ${pricing.summary} (${pricing.unitsToBuy}x ${formatMoney(pricing.totalToPay)})`;
    }
    return `⚡ ${pricing.summary}`;
  }

  const listDiscount = m.triggers.find((t) => t.type === "list_discount");
  if (listDiscount?.type === "list_discount") {
    return `🏷️ Descuento de lista ${listDiscount.discountPct}%`;
  }

  const promoTrigger = m.triggers.find((t) => t.type === "promotion");
  if (promoTrigger) {
    return promoTrigger.message;
  }

  const belowTarget = m.triggers.find((t) => t.type === "below_target");
  if (belowTarget) {
    return belowTarget.message;
  }

  return null;
}

function groupMatchesByProduct(matches: OfferMatch[]): OfferMatch[][] {
  const groups = new Map<string, OfferMatch[]>();

  for (const match of matches) {
    const key = match.snapshot.ean;
    const existing = groups.get(key);
    if (existing) {
      existing.push(match);
    } else {
      groups.set(key, [match]);
    }
  }

  return [...groups.values()].map((group) =>
    [...group].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b)),
  );
}

function priceBlockText(m: OfferMatch): string[] {
  const effective = getEffectivePrice(m);
  const promo = effectiveUnitPrice(m.snapshot.price, m.snapshot.promotions);
  const lines = [`Precio: ${formatMoney(effective)}`];

  if (m.snapshot.listPrice > effective) {
    lines.push(`Lista: ${formatMoney(m.snapshot.listPrice)}`);
  }

  if (promo.hasPromo && promo.bestPromotion?.pricing) {
    const { pricing } = promo.bestPromotion;
    if (pricing.summary !== "promo") {
      lines.push(
        `Promo: ${pricing.summary} (llevando ${pricing.unitsToBuy} pagás ${formatMoney(pricing.totalToPay)})`,
      );
    }
  }

  lines.push(`Objetivo: ${formatMoney(m.targetPrice)}`);
  return lines;
}

function renderProductThumbnail(match: OfferMatch): string {
  const alt = escapeHtml(match.trackedName);
  const imageUrl = match.snapshot.imageUrl?.trim();

  if (imageUrl) {
    return `<img src="${escapeHtml(imageUrl)}" alt="${alt}" width="70" height="70" style="display:block;width:100%;height:100%;object-fit:contain;" />`;
  }

  const initials = escapeHtml(match.trackedName.trim().slice(0, 2).toUpperCase() || "?");
  return `<span style="display:inline-block;line-height:70px;font-size:18px;font-weight:700;color:#64748b;">${initials}</span>`;
}

function renderStoreOption(match: OfferMatch, isBest: boolean, isLast: boolean): string {
  const store = match.snapshot.store;
  const storeColor = STORE_COLORS[store];
  const storeLabel = escapeHtml(storeBadgeLabel(store));
  const effective = getEffectivePrice(match);
  const { hasPromo } = effectiveUnitPrice(match.snapshot.price, match.snapshot.promotions);
  const listPrice = match.snapshot.listPrice;
  const showListPrice = listPrice > effective;
  const detail = promoDetailLine(match);
  const ctaLabel = `Ver en ${escapeHtml(STORE_LABELS[store])}${isBest ? " →" : ""}`;
  const ctaHref = match.snapshot.url ? escapeHtml(match.snapshot.url) : "#";

  const rowStyle = [
    "padding:12px 16px",
    isBest ? "background-color:#f0fdf4" : "",
    !isLast ? "border-bottom:1px solid #f1f5f9" : "",
  ]
    .filter(Boolean)
    .join(";");

  const bestBadge = isBest
    ? `<span style="background-color:#16a34a;color:#ffffff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;">🥇 Mejor Precio</span>`
    : "";

  const priceColor = isBest ? "#16a34a" : "#1e293b";
  const priceSize = isBest ? "18px" : "16px";
  const unitSuffix = hasPromo
    ? ` <span style="font-size:11px;font-weight:400;color:#64748b;">c/u</span>`
    : "";

  const listPriceHtml = showListPrice
    ? `<span style="font-size:12px;color:#94a3b8;text-decoration:line-through;margin-left:4px;">${formatMoney(listPrice)}</span>`
    : "";

  const detailHtml = detail
    ? `<div style="font-size:11px;color:${isBest ? "#166534" : "#64748b"};margin-top:4px;">${escapeHtml(detail)}</div>`
    : "";

  const ctaStyle = isBest
    ? "display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;padding:8px 10px;border-radius:6px;"
    : "display:inline-block;background-color:#f1f5f9;color:#334155;text-decoration:none;font-size:12px;font-weight:600;padding:8px 10px;border-radius:6px;";

  return `
    <tr>
      <td style="${rowStyle}">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td valign="top">
              ${bestBadge}
              <span style="background-color:${storeColor};color:#ffffff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;${isBest ? "margin-left:4px;" : ""}">${storeLabel}</span>
              <div style="margin-top:6px;">
                <span style="font-size:${priceSize};font-weight:700;color:${priceColor};">${formatMoney(effective)}${unitSuffix}</span>
                ${listPriceHtml}
              </div>
              ${detailHtml}
            </td>
            <td align="right" valign="middle" width="95">
              <a href="${ctaHref}" style="${ctaStyle}">${ctaLabel}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderProductCard(group: OfferMatch[]): string {
  const product = group[0];
  const productName = escapeHtml(product.trackedName);
  const targetPrice = formatMoney(product.targetPrice);
  const options = group
    .map((match, index) =>
      renderStoreOption(match, index === 0, index === group.length - 1),
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border:1px solid #cbd5e1;border-radius:12px;margin-bottom:20px;overflow:hidden;">
      <tr>
        <td style="padding:14px 16px;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td width="72" valign="middle" style="padding-right:12px;">
                <div style="width:70px;height:70px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;text-align:center;">
                  ${renderProductThumbnail(product)}
                </div>
              </td>
              <td valign="middle">
                <h3 style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0f172a;line-height:1.3;">
                  ${productName}
                </h3>
                <span style="font-size:11px;color:#475569;background-color:#e2e8f0;padding:3px 8px;border-radius:6px;display:inline-block;">
                  Meta: <b>${targetPrice}</b>
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${options}
    </table>`;
}

function buildEmailHtml(matches: OfferMatch[]): string {
  const productGroups = groupMatchesByProduct(matches);
  const offerLabel =
    matches.length === 1 ? "1 Oferta Detectada" : `${matches.length} Ofertas Detectadas`;

  const productCards = productGroups.map(renderProductCard).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(offerLabel)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:24px;text-align:center;color:#ffffff;">
              <span style="background-color:#22c55e;color:#ffffff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(offerLabel)}</span>
              <h1 style="margin:10px 0 0 0;font-size:22px;font-weight:700;">Comparativa por Producto</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;">
              ${productCards}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText(matches: OfferMatch[]): string {
  const productGroups = groupMatchesByProduct(matches);

  return productGroups
    .map((group) => {
      const product = group[0];
      const header = [
        product.trackedName,
        `Meta: ${formatMoney(product.targetPrice)}`,
      ].join("\n");

      const options = group
        .map((match, index) => {
          const prefix = index === 0 ? "🥇 Mejor precio" : STORE_LABELS[match.snapshot.store];
          const lines = [
            `${prefix} · ${STORE_LABELS[match.snapshot.store]}`,
            ...priceBlockText(match),
          ];
          const detail = promoDetailLine(match);
          if (detail) lines.push(detail);
          if (match.snapshot.url) lines.push(match.snapshot.url);
          return lines.join("\n");
        })
        .join("\n\n");

      return `${header}\n\n${options}`;
    })
    .join("\n\n---\n\n");
}

export function buildAlertEmail(matches: OfferMatch[]): {
  subject: string;
  html: string;
  text: string;
} {
  const count = matches.length;
  const bestMatch = [...matches].sort(
    (a, b) => getEffectivePrice(a) - getEffectivePrice(b),
  )[0];

  const subject =
    count === 1
      ? `Oferta: ${bestMatch.trackedName} en ${STORE_LABELS[bestMatch.snapshot.store]} → ${formatMoney(getEffectivePrice(bestMatch))}`
      : `${count} ofertas nuevas · comparativa por producto`;

  return {
    subject,
    text: buildEmailText(matches),
    html: buildEmailHtml(matches),
  };
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
