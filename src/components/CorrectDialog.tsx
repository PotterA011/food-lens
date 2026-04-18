import { useEffect, useRef, useState } from "react";
import type { Dish } from "../lib/dish";
import { searchDishes } from "../lib/api";
import { search as staticSearch } from "../lib/search";

type Props = {
  originalName: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export function CorrectDialog({ originalName, onClose, onSubmit }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Dish[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const remote = await searchDishes(query).catch(() => []);
      if (remote.length > 0) {
        setResults(remote.slice(0, 6));
      } else {
        setResults(staticSearch(query, 6));
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  function submit(name: string) {
    if (submitting) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    onSubmit(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 px-4 pb-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_70px_-24px_rgba(43,38,32,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-3">
          <h3 className="serif text-ink text-[22px] leading-tight">
            What is it actually?
          </h3>
          <p className="text-muted mt-1 text-[13px]">
            We guessed <span className="text-ink font-medium">{originalName}</span>.
            Your correction helps Food Lens learn.
          </p>
        </div>
        <div className="px-6 pb-2">
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type the dish name…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="text-ink placeholder:text-muted bg-cream focus:ring-terracotta/40 h-12 w-full rounded-xl px-4 text-[16px] outline-none focus:ring-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(q);
            }}
          />
        </div>

        {results.length > 0 && (
          <ul className="max-h-64 overflow-auto px-2 pb-2">
            {results.map((d) => (
              <li key={(d.id ?? d.name) + d.name}>
                <button
                  type="button"
                  onClick={() => submit(d.name)}
                  className="hover:bg-cream flex w-full flex-col items-start gap-0.5 rounded-xl px-4 py-2.5 text-left"
                >
                  <span className="text-ink text-[15px] font-medium">
                    {d.name}
                  </span>
                  {d.type && (
                    <span className="text-muted text-[12px]">{d.type}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-muted/15 flex gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink flex-1 rounded-full px-4 py-2.5 text-[14px] font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!q.trim() || submitting}
            onClick={() => submit(q)}
            className="bg-terracotta active:bg-terracotta-dark flex-1 rounded-full px-4 py-2.5 text-[14px] font-medium text-white shadow-sm disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
