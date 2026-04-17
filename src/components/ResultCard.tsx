import type { Dish } from "../lib/dish";

type Props = { dish: Dish; photo?: string; onReset: () => void };

export function ResultCard({ dish, photo, onReset }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <article className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-24px_rgba(43,38,32,0.35)]">
        {photo && (
          <div className="bg-cream aspect-[16/10] w-full overflow-hidden">
            <img src={photo} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="px-6 pt-6 pb-7">
          <h2 className="serif text-ink text-[30px] leading-tight">
            {dish.name}
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {dish.type && (
              <span className="bg-olive/12 text-olive rounded-full px-3 py-1 text-[12px] font-medium tracking-wide uppercase">
                {dish.type}
              </span>
            )}
            {dish.origin && (
              <span className="bg-muted/12 text-muted rounded-full px-3 py-1 text-[12px] font-medium tracking-wide uppercase">
                {dish.origin}
              </span>
            )}
          </div>

          <p className="text-ink/85 mt-5 text-[16px] leading-relaxed">
            {dish.description}
          </p>

          <dl className="divide-muted/15 border-muted/15 mt-6 divide-y border-t">
            <InfoRow
              icon={<FlameIcon />}
              label="Calories"
              value={dish.calories ? `${dish.calories} kcal` : null}
            />
            <InfoRow
              icon={<CoinIcon />}
              label="Price (MYR)"
              value={dish.priceMYR ?? null}
            />
            <InfoRow
              icon={<LeafIcon />}
              label="Ingredients"
              value={dish.ingredients?.join(", ") ?? null}
            />
          </dl>
        </div>
      </article>

      <button
        type="button"
        onClick={onReset}
        className="text-terracotta mt-8 self-center text-[15px] font-medium underline-offset-4 hover:underline"
      >
        ← Try another
      </button>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3 py-4">
      <span className="text-olive mt-0.5">{icon}</span>
      <div className="flex-1">
        <dt className="text-muted text-[12px] font-medium tracking-wide uppercase">
          {label}
        </dt>
        <dd
          className={`mt-0.5 text-[15px] ${value ? "text-ink" : "text-muted italic"}`}
        >
          {value ?? "Not available yet"}
        </dd>
      </div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4-2 1-4 3-4 6a6 6 0 0 0 12 0c0-5-5-6-6-10Z" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M9 10.5a2.5 2.5 0 0 1 5 0M9 13.5a2.5 2.5 0 0 0 5 0M12 8v8" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 4c-8 0-14 4-14 12a6 6 0 0 0 6 6c8 0 10-6 10-12V4Z" />
      <path d="M6 22c2-6 6-10 12-12" />
    </svg>
  );
}
