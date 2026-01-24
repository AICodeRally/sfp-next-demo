/**
 * Onboarding Page
 *
 * Full-screen onboarding wizard for new users.
 * Redirects to dashboard if profile already exists.
 */

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
