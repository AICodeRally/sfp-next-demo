/**
 * Onboarding Redirect
 *
 * Client component that checks if company profile exists.
 * Redirects to /onboarding if no profile found (first-time user).
 *
 * Skip redirect for /onboarding and /auth routes.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCompanyProfile } from "@/lib/sfp-store";

export function OnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const profile = useCompanyProfile();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Skip redirect for onboarding and auth routes
    if (pathname.startsWith("/onboarding") || pathname.startsWith("/auth")) {
      return;
    }

    // Only redirect once on initial load if no profile exists
    if (!hasChecked && profile === null) {
      setHasChecked(true);
      router.push("/onboarding");
    }
  }, [profile, pathname, router, hasChecked]);

  return null; // This component doesn't render anything
}
