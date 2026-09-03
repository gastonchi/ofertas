/** Muestra curada para estudiar textos de promo (VTEX teasers + Coto discounts). */
export type PromoSampleEan = {
  ean: string;
  /** Patrones esperados para orientar el análisis */
  notes: string;
};

export const PROMO_SAMPLE_EANS: PromoSampleEan[] = [
  {
    ean: "7790550000164",
    notes: "VTEX: 2do al 50% (Carrefour Mi Crf). Base products.json.",
  },
  {
    ean: "8480017258922",
    notes: "VTEX Día: 2do al 80%.",
  },
  {
    ean: "7791337010017",
    notes: "VTEX: 2do al 70% (Día / Carrefour).",
  },
  {
    ean: "7622201703080",
    notes: "VTEX Día: 2x1. Carrefour: 4x2.",
  },
  {
    ean: "77969071",
    notes: "VTEX Día: 3x2.",
  },
  {
    ean: "7798338291056",
    notes: "Coto: Llevando 2 + 2x1.",
  },
  {
    ean: "7730105821745",
    notes: "Coto: Llevando 2 + 70% 2da.",
  },
  {
    ean: "7790787002535",
    notes: "Coto: Llevando 4 + 4x3.",
  },
  {
    ean: "7790550022258",
    notes: "Coto: 25%Dto (descuento directo %).",
  },
  {
    ean: "7790742333605",
    notes: "Referencia sin promo fuerte (leche). products.json.",
  },
];
