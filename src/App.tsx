import { useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { ResultCard } from "./components/ResultCard";
import { ErrorScreen } from "./components/ErrorScreen";
import { recognize } from "./lib/recognize";
import type { Dish } from "./lib/dish";

type View =
  | { kind: "home" }
  | { kind: "loading"; preview: string }
  | { kind: "result"; dish: Dish; photo?: string }
  | { kind: "not_food"; photo: string }
  | { kind: "error"; message: string; photo?: string };

export function App() {
  const [view, setView] = useState<View>({ kind: "home" });

  async function onCapture(file: File) {
    const preview = URL.createObjectURL(file);
    setView({ kind: "loading", preview });
    const result = await recognize(file);
    if (result.kind === "dish") {
      setView({ kind: "result", dish: result.dish, photo: preview });
    } else if (result.kind === "not_food") {
      setView({ kind: "not_food", photo: preview });
    } else {
      setView({ kind: "error", message: result.message, photo: preview });
    }
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
      {view.kind === "not_food" && (
        <ErrorScreen variant="not_food" photo={view.photo} onReset={reset} />
      )}
      {view.kind === "error" && (
        <ErrorScreen
          variant="error"
          photo={view.photo}
          message={view.message}
          onReset={reset}
        />
      )}
    </main>
  );
}
