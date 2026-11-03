import type { ExpenseIconKey } from "@/lib/expenses/icons";

export const SUBCATEGORY_EXTRA_ICONS = [
  "beef",
  "fish",
  "wheat",
  "leaf",
  "flame",
  "droplets",
  "zap",
  "fuel",
] as const;

export type SubcategoryExtraIconKey = (typeof SUBCATEGORY_EXTRA_ICONS)[number];

export type SubcategoryMark =
  | { kind: "emoji"; emoji: string }
  | { kind: "category-icon"; icon: ExpenseIconKey }
  | { kind: "extra-icon"; icon: SubcategoryExtraIconKey };

export type SubcategoryVisual = {
  mark: SubcategoryMark;
  accent: string;
  surface: string;
};

type VisualPreset = Pick<SubcategoryVisual, "mark" | "accent" | "surface">;

const FALLBACK_PALETTE: Pick<SubcategoryVisual, "accent" | "surface">[] = [
  { accent: "#9b2c2c", surface: "#fdeaea" },
  { accent: "#1578a0", surface: "#e0f2fe" },
  { accent: "#15803d", surface: "#dcfce7" },
  { accent: "#a16207", surface: "#fef9c3" },
  { accent: "#7c3aed", surface: "#ede9fe" },
  { accent: "#c2410c", surface: "#ffedd5" },
  { accent: "#be185d", surface: "#fce7f3" },
  { accent: "#0f766e", surface: "#ccfbf1" },
  { accent: "#1d4ed8", surface: "#dbeafe" },
  { accent: "#4d7c0f", surface: "#ecfccb" },
  { accent: "#b45309", surface: "#fef3c7" },
  { accent: "#475569", surface: "#f1f5f9" },
];

const KEYWORD_RULES: { pattern: RegExp; visual: VisualPreset }[] = [
  {
    pattern: /carnic/,
    visual: {
      mark: { kind: "extra-icon", icon: "beef" },
      accent: "#9b2c2c",
      surface: "#fdeaea",
    },
  },
  {
    pattern: /panader/,
    visual: {
      mark: { kind: "extra-icon", icon: "wheat" },
      accent: "#a16207",
      surface: "#fef9c3",
    },
  },
  {
    pattern: /pescad/,
    visual: {
      mark: { kind: "extra-icon", icon: "fish" },
      accent: "#1578a0",
      surface: "#e0f2fe",
    },
  },
  {
    pattern: /verdul|verdur/,
    visual: {
      mark: { kind: "extra-icon", icon: "leaf" },
      accent: "#15803d",
      surface: "#dcfce7",
    },
  },
  {
    pattern: /pasta/,
    visual: {
      mark: { kind: "emoji", emoji: "🍝" },
      accent: "#c2410c",
      surface: "#ffedd5",
    },
  },
  {
    pattern: /super|súper/,
    visual: {
      mark: { kind: "category-icon", icon: "shopping-cart" },
      accent: "#1f6a45",
      surface: "#e8f5ee",
    },
  },
  {
    pattern: /cuota|matricul/,
    visual: {
      mark: { kind: "category-icon", icon: "graduation-cap" },
      accent: "#1d4ed8",
      surface: "#dbeafe",
    },
  },
  {
    pattern: /util|útiles/,
    visual: {
      mark: { kind: "category-icon", icon: "book-open" },
      accent: "#7c3aed",
      surface: "#ede9fe",
    },
  },
  {
    pattern: /nafta|combust/,
    visual: {
      mark: { kind: "extra-icon", icon: "fuel" },
      accent: "#b45309",
      surface: "#fef3c7",
    },
  },
  {
    pattern: /seguro|patente/,
    visual: {
      mark: { kind: "category-icon", icon: "car" },
      accent: "#475569",
      surface: "#f1f5f9",
    },
  },
  {
    pattern: /limpieza/,
    visual: {
      mark: { kind: "category-icon", icon: "spray-can" },
      accent: "#0f766e",
      surface: "#ccfbf1",
    },
  },
  {
    pattern: /manten|decor/,
    visual: {
      mark: { kind: "category-icon", icon: "hammer" },
      accent: "#a16207",
      surface: "#fef9c3",
    },
  },
  {
    pattern: /\bluz\b|electric/,
    visual: {
      mark: { kind: "extra-icon", icon: "zap" },
      accent: "#ca8a04",
      surface: "#fef9c3",
    },
  },
  {
    pattern: /\bgas\b/,
    visual: {
      mark: { kind: "extra-icon", icon: "flame" },
      accent: "#ea580c",
      surface: "#ffedd5",
    },
  },
  {
    pattern: /agua/,
    visual: {
      mark: { kind: "extra-icon", icon: "droplets" },
      accent: "#0284c7",
      surface: "#e0f2fe",
    },
  },
  {
    pattern: /celular|internet|wifi/,
    visual: {
      mark: { kind: "category-icon", icon: "wifi" },
      accent: "#1578a0",
      surface: "#e0f2fe",
    },
  },
  {
    pattern: /municipal|arba/,
    visual: {
      mark: { kind: "category-icon", icon: "landmark" },
      accent: "#64748b",
      surface: "#f1f5f9",
    },
  },
  {
    pattern: /netflix|prime|disney|meli|apple|cursor|suscrip/,
    visual: {
      mark: { kind: "category-icon", icon: "tv" },
      accent: "#7c3aed",
      surface: "#ede9fe",
    },
  },
  {
    pattern: /caf[eé]/,
    visual: {
      mark: { kind: "category-icon", icon: "coffee" },
      accent: "#92400e",
      surface: "#ffedd5",
    },
  },
  {
    pattern: /almuerzo|juntada|salida/,
    visual: {
      mark: { kind: "category-icon", icon: "utensils" },
      accent: "#be185d",
      surface: "#fce7f3",
    },
  },
  {
    pattern: /regalo/,
    visual: {
      mark: { kind: "category-icon", icon: "gift" },
      accent: "#db2777",
      surface: "#fce7f3",
    },
  },
  {
    pattern: /activ/,
    visual: {
      mark: { kind: "category-icon", icon: "dumbbell" },
      accent: "#15803d",
      surface: "#dcfce7",
    },
  },
  {
    pattern: /otros?/,
    visual: {
      mark: { kind: "category-icon", icon: "shapes" },
      accent: "#64748b",
      surface: "#f1f5f9",
    },
  },
];

function normalizeSubcategoryName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function resolveSubcategoryVisual(name: string): SubcategoryVisual {
  const normalized = normalizeSubcategoryName(name);
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(normalized)) return rule.visual;
  }

  const palette =
    FALLBACK_PALETTE[hashName(normalized) % FALLBACK_PALETTE.length] ??
    FALLBACK_PALETTE[0];
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return {
    ...palette,
    mark: { kind: "emoji", emoji: initial },
  };
}
