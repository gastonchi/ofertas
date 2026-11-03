import Link from "next/link";

export function ShoppingListProductLink({
  productId,
  name,
  className = "product-name",
}: {
  productId: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      href={`/productos/${productId}`}
      className={`product-name-link ${className}`.trim()}
    >
      {name}
    </Link>
  );
}
