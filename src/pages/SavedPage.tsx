import { useEffect, useState } from "react";
import type { Dish } from "../lib/dish";
import { fetchSaved } from "../lib/api";

type Props = {
  onPick: (dish: Dish) => void;
  onBack: () => void;
};

export function SavedPage({ onPick, onBack }: Props) {
  const [dishes, setDishes] = useState<Dish[] | null>(null);

  useEffect(() => {
    fetchSaved().then(setDishes);
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-muted hover:text-ink text-[14px]"
        >
          ← Back
        </button>
        <h2 className="serif text-ink ml-1 text-[26px] leading-tight italic">
          Saved dishes
        </h2>
      </div>

      {dishes === null && (
        <p className="text-muted text-[14px]">Loading your saved dishes…</p>
      )}

      {dishes?.length === 0 && (
        <div className="text-muted rounded-2xl bg-white/60 px-5 py-8 text-center text-[14px]">
          You haven't saved any dishes yet. Tap the heart on a dish to keep it here.
        </div>
      )}

      {dishes && dishes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {dishes.map((d) => (
            <li key={d.id ?? d.name}>
              <button
                type="button"
                onClick={() => onPick(d)}
                className="w-full overflow-hidden rounded-2xl bg-white px-5 py-4 text-left shadow-[0_10px_30px_-18px_rgba(43,38,32,0.3)]"
              >
                <div className="text-ink text-[17px] font-medium">{d.name}</div>
                <div className="text-muted mt-0.5 flex gap-2 text-[12px] uppercase tracking-wide">
                  {d.type && <span>{d.type}</span>}
                  {d.origin && <span>· {d.origin}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
