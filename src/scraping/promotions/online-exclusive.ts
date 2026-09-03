const RE_ONLINE_EXCLUSIVE =
  /\bexclusiv[ao]s?\s+online|\bonline\s+exclusiv|\bexclusivo\s+web|\bexclusiva\s+web/i;

type HighlightEntry = {
  Name?: string;
  "<Name>k__BackingField"?: string;
};

export function isOnlineExclusiveText(text: string): boolean {
  return RE_ONLINE_EXCLUSIVE.test(text.trim());
}

export function formatOnlineExclusiveLabel(raw: string): string {
  const cleaned = raw.replace(/^PROMO-/i, "").trim();
  const pctMatch = cleaned.match(
    /(\d+(?:[.,]\d+)?)\s*%\s*(?:off|dto\.?|descuento)?/i,
  );

  if (pctMatch) {
    const pct = pctMatch[1].replace(",", ".");
    return `Exclusivo online · ${pct}% dto`;
  }

  return "Exclusivo online";
}

export function discountHighlightNames(highlights: unknown): string[] {
  if (!highlights) return [];
  const list = Array.isArray(highlights) ? highlights : [highlights];

  return list
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const record = entry as HighlightEntry;
      return (record.Name ?? record["<Name>k__BackingField"] ?? "").trim();
    })
    .filter(Boolean);
}

export function onlineExclusiveLabelFromHighlights(
  highlights: unknown,
): string | null {
  for (const name of discountHighlightNames(highlights)) {
    if (isOnlineExclusiveText(name)) {
      return formatOnlineExclusiveLabel(name);
    }
  }
  return null;
}
