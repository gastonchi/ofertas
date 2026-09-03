/** Muestra curada para estudiar textos de promo (VTEX teasers + Coto discounts + Cencosud clusters). */
export type PromoSampleEan = {
  ean: string;
  /** Patrones esperados para orientar el análisis */
  notes: string;
};

export const PROMO_SAMPLE_EANS: PromoSampleEan[] = [
  {
    ean: "7790550000164",
    notes: "VTEX teasers: 2do al 50% (Carrefour). Base products.json.",
  },
  {
    ean: "8480017258922",
    notes: "VTEX Día: 2do al 80%.",
  },
  {
    ean: "7791337010017",
    notes: "VTEX: 2do al 70% (Día/Carrefour). Cencosud: clusters 2do al 80% lácteos.",
  },
  {
    ean: "7622201703080",
    notes: "VTEX Día: 2x1. Carrefour: PROMO-4x2.",
  },
  {
    ean: "77969071",
    notes: "VTEX Día: 3x2.",
  },
  {
    ean: "7798338291056",
    notes: "Coto: Llevando 2 + 2x1. Carrefour: PROMO-2x1.",
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
    notes: "Coto: 25%Dto. Carrefour: 2do al 50%.",
  },
  {
    ean: "7790742363107",
    notes: "Cencosud (Jumbo/Disco/Vea): clusters Hasta 2do al 80%, 2x1, 40% lácteos.",
  },
  {
    ean: "7790040143364",
    notes: "Cencosud Vea: 4x2, 3x2 galletitas + Jumbo al 100 clusters.",
  },
  {
    ean: "7790040143234",
    notes: "Cencosud: Hasta 2do al 70% + 4x2 + 3x2.",
  },
  {
    ean: "7790250015536",
    notes: "Cencosud: Hasta 70% off / 80% off (texto off).",
  },
  {
    ean: "7790742333605",
    notes: "Referencia sin promo fuerte (leche). products.json.",
  },
];
