import { STORE_LABELS, STORE_LOGOS, isStoreId } from "@/lib/stores";

export function StoreLogo({
  store,
  size = "md",
}: {
  store: string;
  size?: "sm" | "md" | "lg";
}) {
  const key = store.trim().toLowerCase();
  const label = isStoreId(key) ? STORE_LABELS[key] : store;
  const src = isStoreId(key) ? STORE_LOGOS[key] : null;

  if (!src) {
    return <span className="chip">{label}</span>;
  }

  return (
    <span className={`store-logo store-logo-${size} store-logo-${key}`}>
      <img src={encodeURI(src)} alt={label} title={label} />
    </span>
  );
}

export function StoreLogoList({
  stores,
  size = "sm",
}: {
  stores: string[];
  size?: "sm" | "md" | "lg";
}) {
  if (stores.length === 0) return null;

  return (
    <span className="store-chips">
      {stores.map((store) => (
        <StoreLogo key={store} store={store} size={size} />
      ))}
    </span>
  );
}
