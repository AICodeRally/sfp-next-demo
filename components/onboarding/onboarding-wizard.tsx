/**
 * Onboarding Wizard
 *
 * Multi-step guided setup for new companies.
 * Flow: Welcome → Profile → Business Model → Initial Scenario → Complete
 *
 * Features:
 * - Progress indicator
 * - Form validation with Zod
 * - Back/Next navigation
 * - Option to load demo data vs. start fresh
 * - Template-based scenario creation
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyProfileSchema, type CompanyProfile } from "@/lib/sfp-types";
import { saveCompanyProfile, createScenario } from "@/lib/sfp-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckIcon } from "@radix-ui/react-icons";

type Step = "welcome" | "profile" | "business" | "scenario" | "complete";

interface WizardState {
  step: Step;
  profile: Partial<CompanyProfile>;
  loadDemoData: boolean;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [state, setState] = useState<WizardState>({
    step: "welcome",
    profile: {},
    loadDemoData: false
  });

  const steps: Step[] = ["welcome", "profile", "business", "scenario", "complete"];
  const currentIndex = steps.indexOf(state.step);

  function goNext() {
    const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
    setState((s) => ({ ...s, step: steps[nextIndex] }));
  }

  function goBack() {
    const prevIndex = Math.max(currentIndex - 1, 0);
    setState((s) => ({ ...s, step: steps[prevIndex] }));
  }

  function updateProfile(updates: Partial<CompanyProfile>) {
    setState((s) => ({ ...s, profile: { ...s.profile, ...updates } }));
  }

  function completeOnboarding() {
    // Create company profile
    const now = new Date().toISOString();
    const profile: CompanyProfile = {
      id: `profile_${Date.now()}`,
      name: state.profile.name || "My Company",
      industry: state.profile.industry || "technology",
      stage: state.profile.stage || "seed",
      teamSize: state.profile.teamSize || 5,
      foundedYear: state.profile.foundedYear,
      description: state.profile.description,
      website: state.profile.website,
      createdAt: now,
      updatedAt: now
    };

    saveCompanyProfile(profile);

    // Create initial scenario
    if (!state.loadDemoData) {
      createScenario("My First Scenario");
    }
    // If loadDemoData is true, seed data should already be loaded

    goNext(); // Move to complete step
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-2xl p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    index < currentIndex
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : index === currentIndex
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900"
                  }`}
                >
                  {index < currentIndex ? <CheckIcon className="h-5 w-5" /> : <span>{index + 1}</span>}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-12 ${
                      index < currentIndex ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border bg-card shadow-xl p-8">
          {state.step === "welcome" && (
            <WelcomeStep
              onNext={goNext}
              onLoadDemo={() => {
                setState((s) => ({ ...s, loadDemoData: true }));
                goNext();
              }}
            />
          )}

          {state.step === "profile" && (
            <ProfileStep
              profile={state.profile}
              onChange={updateProfile}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {state.step === "business" && (
            <BusinessStep
              profile={state.profile}
              onChange={updateProfile}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {state.step === "scenario" && (
            <ScenarioStep
              loadDemoData={state.loadDemoData}
              onNext={completeOnboarding}
              onBack={goBack}
            />
          )}

          {state.step === "complete" && <CompleteStep onFinish={() => router.push("/")} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Step Components
// ============================================================

function WelcomeStep({ onNext, onLoadDemo }: { onNext: () => void; onLoadDemo: () => void }) {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
        Welcome to SFP
      </h1>
      <p className="text-lg text-muted-foreground mb-8">
        Strategic Financial Planning for growing companies
      </p>
      <div className="space-y-4">
        <Button onClick={onNext} size="lg" className="w-full">
          Start Fresh Setup
        </Button>
        <Button onClick={onLoadDemo} variant="outline" size="lg" className="w-full">
          Load Demo Data
        </Button>
      </div>
    </div>
  );
}

interface ProfileStepProps {
  profile: Partial<CompanyProfile>;
  onChange: (updates: Partial<CompanyProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}

function ProfileStep({ profile, onChange, onNext, onBack }: ProfileStepProps) {
  const [errors, setErrors] = useState<string[]>([]);

  function validate() {
    const result = CompanyProfileSchema.partial().safeParse(profile);
    if (!result.success) {
      setErrors(result.error.errors.map((e) => e.message));
      return false;
    }
    if (!profile.name || profile.name.trim() === "") {
      setErrors(["Company name is required"]);
      return false;
    }
    setErrors([]);
    return true;
  }

  function handleNext() {
    if (validate()) {
      onNext();
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Company Profile</h2>
      <p className="text-muted-foreground mb-6">Tell us about your company</p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            value={profile.name || ""}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Acme Inc."
          />
        </div>

        <div>
          <Label htmlFor="website">Website (Optional)</Label>
          <Input
            id="website"
            type="url"
            value={profile.website || ""}
            onChange={(e) => onChange({ website: e.target.value })}
            placeholder="https://example.com"
          />
        </div>

        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <textarea
            id="description"
            value={profile.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What does your company do?"
            className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>

        {errors.length > 0 && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {errors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-6">
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back
        </Button>
        <Button onClick={handleNext} className="flex-1">
          Next
        </Button>
      </div>
    </div>
  );
}

function BusinessStep({ profile, onChange, onNext, onBack }: ProfileStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Business Model</h2>
      <p className="text-muted-foreground mb-6">Help us understand your business</p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="industry">Industry</Label>
          <select
            id="industry"
            value={profile.industry || "technology"}
            onChange={(e) =>
              onChange({ industry: e.target.value as CompanyProfile["industry"] })
            }
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="technology">Technology</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
            <option value="retail">Retail</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="education">Education</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <Label htmlFor="stage">Company Stage</Label>
          <select
            id="stage"
            value={profile.stage || "seed"}
            onChange={(e) => onChange({ stage: e.target.value as CompanyProfile["stage"] })}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="idea">Idea</option>
            <option value="pre-seed">Pre-Seed</option>
            <option value="seed">Seed</option>
            <option value="series-a">Series A</option>
            <option value="series-b">Series B</option>
            <option value="series-c-plus">Series C+</option>
            <option value="growth">Growth</option>
          </select>
        </div>

        <div>
          <Label htmlFor="teamSize">Team Size</Label>
          <Input
            id="teamSize"
            type="number"
            min="1"
            value={profile.teamSize || 5}
            onChange={(e) => onChange({ teamSize: parseInt(e.target.value, 10) || 1 })}
          />
        </div>

        <div>
          <Label htmlFor="foundedYear">Founded Year (Optional)</Label>
          <Input
            id="foundedYear"
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            value={profile.foundedYear || ""}
            onChange={(e) => onChange({ foundedYear: parseInt(e.target.value, 10) || undefined })}
            placeholder="2024"
          />
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Next
        </Button>
      </div>
    </div>
  );
}

interface ScenarioStepProps {
  loadDemoData: boolean;
  onNext: () => void;
  onBack: () => void;
}

function ScenarioStep({ loadDemoData, onNext, onBack }: ScenarioStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Initial Scenario</h2>
      <p className="text-muted-foreground mb-6">
        {loadDemoData
          ? "Demo data will be loaded with pre-configured scenarios"
          : "We'll create your first scenario to get you started"}
      </p>

      <div className="rounded-lg border border-border bg-muted/50 p-4 mb-6">
        <p className="text-sm text-muted-foreground">
          {loadDemoData
            ? "Demo scenarios include realistic data for SaaS, healthcare, and fintech companies. You can delete them anytime from the Demo Library."
            : "You'll start with a blank scenario that you can customize with your own data."}
        </p>
      </div>

      <div className="flex gap-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Complete Setup
        </Button>
      </div>
    </div>
  );
}

function CompleteStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
        <CheckIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2">You&apos;re All Set!</h2>
      <p className="text-muted-foreground mb-8">
        Your company profile has been created. Let&apos;s start building your financial model.
      </p>
      <Button onClick={onFinish} size="lg">
        Go to Dashboard
      </Button>
    </div>
  );
}
