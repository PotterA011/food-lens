import { useRef } from "react";
import type { Dish } from "../lib/dish";
import { Typeahead } from "./Typeahead";

type Props = {
  onCapture: (file: File) => void;
  onPick: (dish: Dish) => void;
};

export function HomeScreen({ onCapture, onPick }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onCapture(f);
    e.target.value = "";
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-10 text-center">
        <h1 className="serif text-ink text-[44px] leading-none italic">
          Food Lens
        </h1>
        <p className="text-muted mt-3 text-[15px]">
          Discover Malaysian cuisine.
        </p>
      </header>

      <Typeahead onPick={onPick} />

      <div className="text-muted my-8 flex items-center gap-3 text-[13px] tracking-widest uppercase">
        <span className="bg-muted/30 h-px flex-1" />
        <span>or</span>
        <span className="bg-muted/30 h-px flex-1" />
      </div>

      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="bg-terracotta shadow-terracotta/30 active:bg-terracotta-dark flex h-28 w-28 items-center justify-center rounded-full text-white shadow-lg transition-colors"
          aria-label="Take a photo of your food"
        >
          <CameraIcon />
        </button>
        <p className="text-ink mt-4 text-[15px] font-medium">Snap it</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
        />
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.2-1.6A1.5 1.5 0 0 1 9.9 4h4.2a1.5 1.5 0 0 1 1.2.6L16.5 6h2A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-8Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}
