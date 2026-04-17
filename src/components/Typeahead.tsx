import { useMemo, useState } from "react";
import type { Dish } from "../lib/dish";
import { search } from "../lib/search";

type Props = { onPick: (dish: Dish) => void };

export function Typeahead({ onPick }: Props) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);

  const results = useMemo(() => search(q), [q]);

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      onPick(results[cursor]);
    }
  }

  return (
    <div>
      <div className="relative">
        <SearchIcon />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setCursor(0);
          }}
          onKeyDown={onKey}
          placeholder="Search a dish…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="text-ink placeholder:text-muted focus:ring-terracotta/40 h-14 w-full rounded-2xl bg-white pr-5 pl-12 text-[17px] shadow-[0_10px_30px_-12px_rgba(43,38,32,0.25)] outline-none focus:ring-2"
        />
      </div>

      {q.trim() && (
        <ul className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-12px_rgba(43,38,32,0.2)]">
          {results.length === 0 ? (
            <li className="text-muted px-5 py-4 text-[15px]">
              No match. Try snapping a photo instead.
            </li>
          ) : (
            results.map((d, i) => (
              <li key={d.name}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => onPick(d)}
                  className={`flex w-full flex-col items-start gap-0.5 px-5 py-3 text-left transition-colors ${
                    i === cursor ? "bg-cream" : "bg-white"
                  }`}
                >
                  <span className="text-ink text-[16px] font-medium">
                    {d.name}
                  </span>
                  <span className="text-muted text-[13px]">{d.type}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="text-muted pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
