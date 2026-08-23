import type { StoreId } from "@/lib/types";

export type ProductCreateDraft = {
  ean: string;
  name: string;
  targetPrice: string;
  targetHint?: string;
  stores?: StoreId[];
};
