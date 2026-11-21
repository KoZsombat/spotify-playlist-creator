import { LogIn } from "lucide-react";

/**
 * A real link, not a hydrated button: the OAuth flow starts from
 * `/api/sign-in/spotify`, so sign-in works even when client JavaScript fails.
 */
export function SignInButton({
  href = "/api/sign-in/spotify",
  label = "Continue with Spotify",
  className = "btn-primary w-full",
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  return (
    <a href={href} className={className}>
      <LogIn className="size-4" />
      {label}
    </a>
  );
}
