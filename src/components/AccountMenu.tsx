import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

type Props = { onOpenSaved: () => void };

export function AccountMenu({ onOpenSaved }: Props) {
  const { user, loading, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (loading) {
    return <div className="h-10 w-10 animate-pulse rounded-full bg-white/60" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={signIn}
        className="text-ink/80 hover:text-ink flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-[13px] font-medium shadow-sm backdrop-blur-sm"
      >
        <GoogleGlyph />
        Sign in
      </button>
    );
  }

  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ring-white/70 focus-visible:ring-terracotta/40 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-2 shadow-sm outline-none"
        aria-label="Account menu"
      >
        {user.picture_url ? (
          <img src={user.picture_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="bg-olive flex h-full w-full items-center justify-center text-[15px] font-medium text-white">
            {initial}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-12 right-0 z-20 w-56 overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_-24px_rgba(43,38,32,0.35)]">
          <div className="border-muted/15 border-b px-4 py-3">
            <div className="text-ink truncate text-[14px] font-medium">
              {user.name || "Signed in"}
            </div>
            {user.email && (
              <div className="text-muted truncate text-[12px]">{user.email}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenSaved();
            }}
            className="hover:bg-cream text-ink flex w-full items-center gap-2 px-4 py-3 text-left text-[14px]"
          >
            <HeartIcon />
            Saved dishes
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="hover:bg-cream text-ink flex w-full items-center gap-2 px-4 py-3 text-left text-[14px]"
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.9v2.32A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.96H.9A9 9 0 0 0 0 9c0 1.45.35 2.82.9 4.04l3.07-2.32Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .9 4.96l3.07 2.32C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17-5-5 5-5" />
      <path d="M15 12H5" />
    </svg>
  );
}
