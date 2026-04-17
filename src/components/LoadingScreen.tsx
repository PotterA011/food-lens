type Props = { preview: string };

export function LoadingScreen({ preview }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="relative h-64 w-64 overflow-hidden rounded-3xl shadow-[0_20px_50px_-20px_rgba(43,38,32,0.45)]">
        <img
          src={preview}
          alt=""
          className="h-full w-full scale-110 object-cover blur-md"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Spinner />
        </div>
      </div>
      <p className="serif text-ink mt-8 text-[20px] italic">Tasting…</p>
      <p className="text-muted mt-1 text-[14px]">Identifying the dish</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-10 w-10 animate-spin text-white/90"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
