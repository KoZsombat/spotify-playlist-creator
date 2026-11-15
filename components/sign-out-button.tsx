"use client";

import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-medium text-muted transition hover:border-border hover:bg-surface-2 hover:text-fg"
      onClick={async () => {
        await authClient.signOut();
        window.location.href = "/";
      }}
    >
      <LogOut className="size-3.5" />
      Sign out
    </button>
  );
}
