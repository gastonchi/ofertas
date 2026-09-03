import { formatArs, formatWeekdayDate } from "@/lib/format";
import { StoreLogo } from "@/components/ui/store-logo";
import type { StorePriceQuote } from "@/lib/types";

function promoDetailText(quote: StorePriceQuote): string | null {
  const pricing = quote.bestPromotion?.pricing;
  if (!quote.hasPromo || !pricing || pricing.summary === "promo") return null;
  return `${pricing.summary} · llevando ${pricing.unitsToBuy} pagás ${formatArs(pricing.totalToPay)}`;
}

export function bestEffectivePriceFromQuotes(
  quotes: StorePriceQuote[],
): number | null {
  const values = quotes
    .map((quote) => quote.effectivePrice ?? quote.price)
    .filter((price): price is number => price != null && Number.isFinite(price));
  if (values.length === 0) return null;
  return Math.min(...values);
}

export function StorePriceCard({
  quote,
  isBest,
}: {
  quote: StorePriceQuote;
  isBest: boolean;
}) {
  const displayPrice =
    quote.effectivePrice != null ? quote.effectivePrice : quote.price;
  const promoText = promoDetailText(quote);
  const showList = quote.listPrice != null;
  const showShelf =
    quote.hasPromo &&
    quote.price != null &&
    quote.effectivePrice != null &&
    quote.price !== quote.effectivePrice;

  return (
    <article
      className={
        isBest
          ? "info-card info-card-best store-price-card"
          : "info-card store-price-card"
      }
    >
      <header className="info-card-head">
        <StoreLogo store={quote.store} size="lg" />
        <div className="store-price-head-values">
          <strong>
            {displayPrice != null ? formatArs(displayPrice) : "—"}
          </strong>
          {quote.hasPromo ? (
            <span className="store-price-unit-label muted">c/u con promo</span>
          ) : null}
        </div>
      </header>

      {quote.price != null && (showList || showShelf) ? (
        <dl className="info-card-meta store-price-meta">
          {showList ? (
            <>
              <dt>Lista</dt>
              <dd>{formatArs(quote.listPrice!)}</dd>
            </>
          ) : null}
          {showShelf ? (
            <>
              <dt>Góndola</dt>
              <dd>{formatArs(quote.price)}</dd>
            </>
          ) : null}
        </dl>
      ) : null}

      {promoText ? (
        <p className="info-card-copy store-promo-copy">{promoText}</p>
      ) : quote.promotions && quote.promotions.length > 0 ? (
        <p className="info-card-copy store-promo-copy muted">
          {quote.promotions.map((p) => p.name).join(" · ")}
        </p>
      ) : null}

      {quote.checked_at ? (
        <p className="muted info-card-copy">
          {formatWeekdayDate(quote.checked_at)}
        </p>
      ) : null}

      {quote.price == null ? (
        <p className="muted info-card-copy">No encontrado</p>
      ) : isBest ? (
        <span className="chip">Mejor precio</span>
      ) : null}
    </article>
  );
}
