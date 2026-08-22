"use client";

import { useTransition } from "react";
import Swal from "sweetalert2";
import { refreshProductPriceAction } from "@/modules/products/actions";

export function RefreshProductPriceButton({
  productId,
}: {
  productId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn-edit"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await refreshProductPriceAction(productId);
          if ("error" in result) {
            await Swal.fire({
              icon: "error",
              title: result.error,
              confirmButtonColor: "#1f6a45",
            });
            return;
          }

          await Swal.fire({
            icon: "success",
            title: result.message,
            timer: 2800,
            showConfirmButton: false,
          });
        })
      }
    >
      {pending ? "Consultando…" : "Consultar precio"}
    </button>
  );
}
