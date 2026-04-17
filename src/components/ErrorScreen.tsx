type Props = {
  variant: "not_food" | "error";
  photo?: string;
  message?: string;
  onReset: () => void;
};

export function ErrorScreen({ variant, photo, message, onReset }: Props) {
  const title = variant === "not_food" ? "That's not food" : "Something went wrong";
  const body =
    variant === "not_food"
      ? "Point the camera at a dish and try again."
      : (message ?? "Please try again in a moment.");

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {photo && (
        <div className="mb-8 h-48 w-48 overflow-hidden rounded-3xl shadow-[0_20px_50px_-24px_rgba(43,38,32,0.35)]">
          <img
            src={photo}
            alt=""
            className="h-full w-full object-cover opacity-80"
          />
        </div>
      )}
      <h2 className="serif text-ink text-[28px] leading-tight italic">
        {title}
      </h2>
      <p className="text-muted mx-auto mt-3 max-w-xs text-[15px]">{body}</p>
      <button
        type="button"
        onClick={onReset}
        className="bg-terracotta active:bg-terracotta-dark mt-8 rounded-full px-6 py-3 text-[15px] font-medium text-white shadow-lg shadow-terracotta/30 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
