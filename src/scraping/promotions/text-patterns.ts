/**
 * Patrones para detectar y clasificar textos de promo en VTEX teasers,
 * productClusters (Jumbo/Disco/Vea) y Coto discounts.
 */

export type PromoKind =
  | "nxm"
  | "second_unit_percent"
  | "direct_percent"
  | "payment_only"
  | "loyalty"
  | "ambiguous"
  | "unknown";

export type ClassifiedPromoText = {
  kind: PromoKind;
  /** Texto original */
  raw: string;
  /** Porcentaje cuando aplica (2da al X%, o dto directo) */
  percent?: number;
  /** NxM: unidades que llevas / unidades que pagás */
  take?: number;
  pay?: number;
  /** Motivo si se descarta o no se puede calcular precio unitario */
  skipReason?: string;
};

/** Segunda unidad al X% — variantes VTEX, Cencosud, Coto */
export const RE_SECOND_UNIT_PERCENT =
  /(?:\b(?:2\s*(?:do|da|°|º|ª)|2da\s+unidad|segund[ao]\s+unidad)\s*(?:al|a)\s*(\d+(?:[.,]\d+)?)\s*(?:%\s*)?(?:off|dto\.?|descuento|de\s+dto)?|\b(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?(?:dto\.?|descuento|off)?\s*(?:en\s+)?(?:la\s+)?(?:2da|2do|segunda)(?:\s+unidad)?|\b2DO\s+AL\s+(\d+(?:[.,]\d+)?)\s*%)/i;

/** NxM — 2x1, 3x2, 4x3, 4x2, 2X1 */
export const RE_NXM = /\b(\d)\s*[x×X]\s*(\d)\b/g;

/** Descuento directo % — 25% off, 35% de Descuento, 25%Dto */
export const RE_DIRECT_PERCENT =
  /(?:^|[^\d])(\d+(?:[.,]\d+)?)\s*%\s*(?:off|dto\.?|de\s+descuento|descuento)?(?:\s|$|\s+en\b|\s*\+)/i;

/** Hasta X% (tope de descuento en categoría) */
export const RE_HASTA_PERCENT = /\bhasta\s+(\d+(?:[.,]\d+)?)\s*%\s*(?:off|dto\.?|de\s+descuento|descuento)?/i;

/** Señales de que el texto parece una promo accionable */
export const RE_LOOKS_LIKE_PROMO =
  /\b(?:2\s*(?:do|da|°|º|ª)|2da\s+unidad|segund[ao]\s+unidad|2x1|3x2|4x3|4x2|\d\s*[x×X]\s*\d|\d+(?:[.,]\d+)?\s*%\s*(?:off|dto\.?|descuento|de\s+descuento)?|promo|ahora\s*\d)/i;

/** Solo medio de pago / fidelidad — no precio de góndola para todos */
export const RE_PAYMENT_ONLY =
  /\b(?:cencopay|cenco\s*pay|tarjeta|banco|cr[eé]dito|d[eé]bito|visa|master(?:card)?|prepaga|naranja|cabal|american\s*express|amex|cuotas?\s*sin\s*inter[eé]s|\d+\s*csi\b|pagando\s+con|mi\s+crf\b|cuenta\s+digital)/i;

export const RE_LOYALTY_ONLY =
  /\b(?:jumbo\s+al\s+\d+|j\s*100\b|j100\b|rpacpay|prime\b|reintegro|cashback)/i;

export const RE_TECHNICAL_CLUSTER = /^[A-Z]+_(?:rpac|promo)/i;

function parsePercent(value: string): number | undefined {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100) return undefined;
  return n;
}

function firstNxm(text: string): { take: number; pay: number } | null {
  RE_NXM.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RE_NXM.exec(text)) !== null) {
    const take = Number(match[1]);
    const pay = Number(match[2]);
    if (take > pay && pay >= 1) {
      return { take, pay };
    }
  }
  return null;
}

function parseSecondUnitPercent(text: string): number | undefined {
  const m = text.match(RE_SECOND_UNIT_PERCENT);
  if (!m) return undefined;
  const pctStr = m[1] ?? m[2] ?? m[3];
  return pctStr ? parsePercent(pctStr) : undefined;
}

function parseDirectPercent(text: string): number | undefined {
  const hasta = text.match(RE_HASTA_PERCENT);
  if (hasta?.[1]) return parsePercent(hasta[1]);

  const direct = text.match(RE_DIRECT_PERCENT);
  if (direct?.[1]) return parsePercent(direct[1]);

  return undefined;
}

export function isPaymentOnlyPromo(text: string): boolean {
  const hasProductPromo =
    RE_NXM.test(text) ||
    RE_SECOND_UNIT_PERCENT.test(text) ||
    /\b\d+\s*%\s*(?:off|dto|descuento)/i.test(text);

  RE_NXM.lastIndex = 0;
  RE_SECOND_UNIT_PERCENT.lastIndex = 0;

  if (hasProductPromo && !/^\d+\s*%\s*\+\s*\d+\s*csi/i.test(text)) {
    return false;
  }

  return RE_PAYMENT_ONLY.test(text) && !hasProductPromo;
}

export function isLoyaltyPromo(text: string): boolean {
  return RE_LOYALTY_ONLY.test(text) || RE_TECHNICAL_CLUSTER.test(text.trim());
}

export function looksLikePromoText(text: string, minimumQuantity?: number): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isLoyaltyPromo(trimmed) && !RE_NXM.test(trimmed) && !RE_SECOND_UNIT_PERCENT.test(trimmed)) {
    return false;
  }
  return RE_LOOKS_LIKE_PROMO.test(trimmed) || (minimumQuantity ?? 0) >= 2;
}

/** Clasifica un texto de promo sin calcular precios */
export function classifyPromoText(text: string): ClassifiedPromoText {
  const raw = text.trim();
  if (!raw) {
    return { kind: "unknown", raw, skipReason: "texto vacío" };
  }

  if (RE_TECHNICAL_CLUSTER.test(raw)) {
    return { kind: "loyalty", raw, skipReason: "cluster técnico Cencosud" };
  }

  if (isLoyaltyPromo(raw) && !RE_NXM.test(raw) && !parseSecondUnitPercent(raw)) {
    return { kind: "loyalty", raw, skipReason: "programa fidelidad / cashback" };
  }

  if (isPaymentOnlyPromo(raw)) {
    return { kind: "payment_only", raw, skipReason: "condicionado a medio de pago" };
  }

  const nxm = firstNxm(raw);
  if (nxm) {
    return { kind: "nxm", raw, take: nxm.take, pay: nxm.pay };
  }

  const secondPct = parseSecondUnitPercent(raw);
  if (secondPct != null) {
    return { kind: "second_unit_percent", raw, percent: secondPct };
  }

  const directPct = parseDirectPercent(raw);
  if (directPct != null) {
    const kind = /\bhasta\s+\d/i.test(raw) ? "ambiguous" : "direct_percent";
    return { kind, raw, percent: directPct };
  }

  if (/\bpromo\b/i.test(raw) || parseValidUntilInText(raw)) {
    return { kind: "ambiguous", raw, skipReason: "promo genérica sin regla numérica" };
  }

  return { kind: "unknown", raw, skipReason: "sin patrón reconocido" };
}

function parseValidUntilInText(text: string): boolean {
  return /hasta(?:\s+el)?\s+\d{1,2}[./-]\d{1,2}/i.test(text);
}

/** Etiquetas de productClusters Cencosud que parecen promos de producto */
export function isActionableClusterLabel(label: string): boolean {
  const c = classifyPromoText(label);
  return c.kind === "nxm" || c.kind === "second_unit_percent" || c.kind === "direct_percent";
}

export function filterProductClusterLabels(
  clusters: Record<string, string> | undefined,
): string[] {
  if (!clusters) return [];
  const labels = Object.values(clusters).map((l) => l.trim()).filter(Boolean);
  return labels.filter(isActionableClusterLabel);
}
