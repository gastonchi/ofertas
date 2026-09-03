type ProductThumbProps = {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

export function ProductThumb({
  name,
  imageUrl,
  size = "sm",
}: ProductThumbProps) {
  const label = `Foto de ${name}`;

  if (imageUrl?.trim()) {
    return (
      <img
        src={imageUrl}
        alt=""
        title={label}
        className={`product-thumb product-thumb-${size}`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      className={`product-thumb product-thumb-${size} product-thumb-placeholder`}
      role="img"
      aria-label={label}
    />
  );
}
