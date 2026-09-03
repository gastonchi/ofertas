type ProductThumbProps = {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  layout?: "fixed" | "card";
};

export function ProductThumb({
  name,
  imageUrl,
  size = "sm",
  layout = "fixed",
}: ProductThumbProps) {
  const label = `Foto de ${name}`;
  const className =
    layout === "card"
      ? "product-thumb product-thumb-card"
      : `product-thumb product-thumb-${size}`;

  if (imageUrl?.trim()) {
    return (
      <img
        src={imageUrl}
        alt=""
        title={label}
        className={className}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className={`${className} product-thumb-placeholder`}
      role="img"
      aria-label={label}
    />
  );
}
