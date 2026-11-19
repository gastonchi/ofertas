import Swal from "sweetalert2";
import {
  SHOPPING_LIST_STOCK_LEVEL_LABELS,
  type ShoppingListStockLevel,
} from "@/lib/shopping-list/stock-level";

const BRAND = "#1f6a45";

export async function promptShoppingListStockLevel(): Promise<ShoppingListStockLevel | null> {
  const result = await Swal.fire({
    title: "Urgencia de compra",
    text: "¿Cuánto queda en casa?",
    input: "radio",
    inputOptions: SHOPPING_LIST_STOCK_LEVEL_LABELS,
    inputValidator: (value) => {
      if (!value) return "Elegí una opción";
      return undefined;
    },
    showCancelButton: true,
    confirmButtonText: "Agregar a la lista",
    cancelButtonText: "Cancelar",
    confirmButtonColor: BRAND,
    cancelButtonColor: "#6b7280",
    reverseButtons: true,
  });

  if (!result.isConfirmed || typeof result.value !== "string") return null;
  return result.value as ShoppingListStockLevel;
}