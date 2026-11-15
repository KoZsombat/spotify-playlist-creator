"use client";

import { LogIn } from "lucide-react";
import { useState } from "react";
import { signInWithSpotify } from "@/lib/auth-client";

export function SignInButton({
  label = "Continue with Spotify",
  className = "btn-primary w-full",
}: {
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await signInWithSpotify();
          if (result.error) {
            setError(result.error.message ?? "Spotify sign-in failed");
            setPending(false);
          }
        }}
      >
        <LogIn className="size-4" />
        {pending ? "Redirecting…" : label}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
