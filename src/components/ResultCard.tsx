import { useEffect, useState } from "react";
import type { Dish } from "../lib/dish";
import {
  fetchDish,
  saveDish,
  unsaveDish,
  correctDish,
  type DishDetails,
} from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { CorrectDialog } from "./CorrectDialog";

type Props = {
  dish: Dish;
  photo?: string;
  onReset: () => void;
  onDishChanged?: (dish: Dish) => void;
  initialIngredients?: string[] | null;
  initialHistory?: string | null;
  initialSaved?: boolean;
};

export function ResultCard({
  dish,
  photo,
  onReset,
  onDishChanged,
  initialIngredients = null,
  initialHistory = null,
  initialSaved = false,
}: Props) {
  const { user, signIn } = useAuth();
  const [ingredients, setIngredients] = useState<string[] | null>(initialIngredients);
  const [history, setHistory] = useState<string | null>(initialHistory);
  const [saved, setSaved] = useState(initialSaved);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIngredients(initialIngredients);
    setHistory(initialHistory);
    setSaved(initialSaved);
    if (!dish.id) return;
    if (initialIngredients && initialHistory) return;
    setLoadingDetails(true);
    fetchDish(dish.id).then((d) => {
      if (cancelled || !d) {
        setLoadingDetails(false);
        return;
      }
      setIngredients(d.ingredients);
      setHistory(d.history);
      setSaved(d.saved);
      setLoadingDetails(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dish.id, initialIngredients, initialHistory, initialSaved]);

  async function toggleSave() {
    if (!user) {
      setSaveHint("Sign in to save");
      signIn();
      return;
    }
    if (!dish.id || savePending) return;
    setSavePending(true);
    const prev = saved;
    setSaved(!prev);
    const ok = prev ? await unsaveDish(dish.id) : await saveDish(dish.id);
    if (!ok) setSaved(prev);
    setSavePending(false);
  }

  async function applyCorrection(name: string) {
    setCorrectOpen(false);
    setLoadingDetails(true);
    const result: DishDetails | null = await correctDish(dish.name, name);
    if (result && onDishChanged) {
      onDishChanged(result.dish);
      setIngredients(result.ingredients);
      setHistory(result.history);
      setSaved(false);
    }
    setLoadingDetails(false);
  }

  return (
    <div className="flex flex-1 flex-col">
      <article className="overflow-hidden rounded-3xl bg-white shadow-[0_20px_50px_-24px_rgba(43,38,32,0.35)]">
        {photo && (
          <div className="bg-cream aspect-[16/10] w-full overflow-hidden">
            <img src={photo} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="px-6 pt-6 pb-7">
          <div className="flex items-start justify-between gap-3">
            <h2 className="serif text-ink text-[30px] leading-tight">
              {dish.name}
            </h2>
            <button
              type="button"
              onClick={toggleSave}
              aria-label={saved ? "Remove from saved" : "Save dish"}
              className={`hover:bg-cream -mt-1 -mr-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                saved ? "text-terracotta" : "text-muted"
              }`}
            >
              <HeartIcon filled={saved} />
            </button>
          </div>
          {saveHint && !user && (
            <p className="text-terracotta mt-1 text-[12px]">{saveHint}</p>
          )}

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

          {dish.description && (
            <p className="text-ink/85 mt-5 text-[16px] leading-relaxed">
              {dish.description}
            </p>
          )}

          <button
            type="button"
            onClick={() => setCorrectOpen(true)}
            className="text-muted hover:text-terracotta mt-3 text-[13px] underline-offset-2 hover:underline"
          >
            Not this? Correct it
          </button>

          <Section icon={<LeafIcon />} label="Ingredients">
            {loadingDetails && !ingredients ? (
              <SkeletonLines />
            ) : ingredients && ingredients.length > 0 ? (
              <ul className="text-ink mt-2 flex flex-wrap gap-1.5 text-[14px]">
                {ingredients.map((ing) => (
                  <li
                    key={ing}
                    className="bg-cream border-muted/15 rounded-full border px-3 py-1"
                  >
                    {ing}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mt-1 text-[14px] italic">
                Not available yet
              </p>
            )}
          </Section>

          <Section icon={<ScrollIcon />} label="History">
            {loadingDetails && !history ? (
              <SkeletonLines />
            ) : history ? (
              <p className="text-ink/85 mt-1 text-[15px] leading-relaxed">
                {history}
              </p>
            ) : (
              <p className="text-muted mt-1 text-[14px] italic">
                Not available yet
              </p>
            )}
          </Section>
        </div>
      </article>

      <button
        type="button"
        onClick={onReset}
        className="text-terracotta mt-8 self-center text-[15px] font-medium underline-offset-4 hover:underline"
      >
        ← Try another
      </button>

      {correctOpen && (
        <CorrectDialog
          originalName={dish.name}
          onClose={() => setCorrectOpen(false)}
          onSubmit={applyCorrection}
        />
      )}
    </div>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-muted/15 mt-6 border-t pt-5">
      <div className="text-olive flex items-center gap-2">
        {icon}
        <h3 className="text-muted text-[12px] font-medium tracking-wide uppercase">
          {label}
        </h3>
      </div>
      {children}
    </section>
  );
}

function SkeletonLines() {
  return (
    <div className="mt-2 space-y-2">
      <div className="bg-muted/15 h-3 w-11/12 animate-pulse rounded-full" />
      <div className="bg-muted/15 h-3 w-9/12 animate-pulse rounded-full" />
      <div className="bg-muted/15 h-3 w-10/12 animate-pulse rounded-full" />
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg
      width="18"
      height="18"
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

function ScrollIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H9a2 2 0 0 1-2-2V9H4Z" />
      <path d="M7 9V6" />
      <path d="M11 9h5" />
      <path d="M11 13h5" />
    </svg>
  );
}
