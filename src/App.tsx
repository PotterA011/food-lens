import { useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { ResultCard } from "./components/ResultCard";
import { recognize } from "./lib/recognize";
import type { Dish } from "./lib/dish";

type View =
  | { kind: "home" }
  | { kind: "loading"; preview: string }
  | { kind: "result"; dish: Dish; photo?: string };

export function App() {
  const [view, setView] = useState<View>({ kind: "home" });

  async function onCapture(file: File) {
    const preview = URL.createObjectURL(file);
    setView({ kind: "loading", preview });
    const dish = await recognize(file);
    setView({ kind: "result", dish, photo: preview });
  }

  function onPick(dish: Dish) {
    setView({ kind: "result", dish });
  }

  const reset = () => setView({ kind: "home" });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pt-10 pb-12">
      {view.kind === "home" && (
        <HomeScreen onCapture={onCapture} onPick={onPick} />
      )}
      {view.kind === "loading" && <LoadingScreen preview={view.preview} />}
      {view.kind === "result" && (
        <ResultCard dish={view.dish} photo={view.photo} onReset={reset} />
      )}
    </main>
  );
}
