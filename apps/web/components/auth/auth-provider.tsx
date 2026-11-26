import { ClerkProvider } from "@clerk/nextjs";
import { bgBG } from "@clerk/localizations";

import {
  AFTER_SIGN_IN_URL,
  CLERK_PUBLISHABLE_KEY,
  SIGN_IN_URL,
  SIGN_UP_URL,
  isClerkConfigured,
} from "@/lib/auth/config";

/** Tavern theme for every Clerk widget. */
const appearance = {
  variables: {
    colorPrimary: "#1C4532",
    colorBackground: "#FDFBF7",
    colorText: "#1E1915",
    colorTextSecondary: "#5D5348",
    colorDanger: "#7C232B",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-sans)",
  },
} as const;

/**
 * Wraps the app in `<ClerkProvider>` only when a key exists (DentAnnotate
 * pattern), so `next build` runs without keys. Bulgarian localisation.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured) return <>{children}</>;

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInUrl={SIGN_IN_URL}
      signUpUrl={SIGN_UP_URL}
      signInFallbackRedirectUrl={AFTER_SIGN_IN_URL}
      signUpFallbackRedirectUrl={AFTER_SIGN_IN_URL}
      localization={bgBG}
      appearance={appearance}
    >
      {children}
    </ClerkProvider>
  );
}
