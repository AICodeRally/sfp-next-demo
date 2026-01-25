/**
 * Company Profile Settings
 *
 * Edit company name, industry, stage, team size, and other metadata.
 * Includes form validation and save confirmation.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompanyProfile, saveCompanyProfile } from "@/lib/sfp-store";
import { CompanyProfileSchema, type CompanyProfile } from "@/lib/sfp-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeftIcon, CheckIcon } from "@radix-ui/react-icons";
import Link from "next/link";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const currentProfile = useCompanyProfile();
  const [profile, setProfile] = useState<Partial<CompanyProfile>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setProfile(currentProfile);
    }
  }, [currentProfile]);

  function validate(): boolean {
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

  function handleSave() {
    if (!validate()) return;

    const now = new Date().toISOString();
    const updatedProfile: CompanyProfile = {
      ...currentProfile!,
      ...profile,
      updatedAt: now
    };

    saveCompanyProfile(updatedProfile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function updateField(updates: Partial<CompanyProfile>) {
    setProfile((p) => ({ ...p, ...updates }));
  }

  if (!currentProfile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-muted-foreground">No profile found. Please complete onboarding first.</p>
        <Link href="/onboarding">
          <Button className="mt-4">Go to Onboarding</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold">Company Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your company information and metadata
        </p>
      </div>

      {/* Save Success Banner */}
      {saved && (
        <div className="mb-6 rounded-lg border border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2">
            <CheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Profile saved successfully
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <Label htmlFor="name">Company Name *</Label>
          <Input
            id="name"
            value={profile.name || ""}
            onChange={(e) => updateField({ name: e.target.value })}
            placeholder="Acme Inc."
          />
        </div>

        <div>
          <Label htmlFor="industry">Industry</Label>
          <select
            id="industry"
            value={profile.industry || "technology"}
            onChange={(e) =>
              updateField({ industry: e.target.value as CompanyProfile["industry"] })
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
            onChange={(e) => updateField({ stage: e.target.value as CompanyProfile["stage"] })}
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
            value={profile.teamSize || 1}
            onChange={(e) => updateField({ teamSize: parseInt(e.target.value, 10) || 1 })}
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
            onChange={(e) =>
              updateField({ foundedYear: parseInt(e.target.value, 10) || undefined })
            }
            placeholder="2024"
          />
        </div>

        <div>
          <Label htmlFor="website">Website (Optional)</Label>
          <Input
            id="website"
            type="url"
            value={profile.website || ""}
            onChange={(e) => updateField({ website: e.target.value })}
            placeholder="https://example.com"
          />
        </div>

        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <textarea
            id="description"
            value={profile.description || ""}
            onChange={(e) => updateField({ description: e.target.value })}
            placeholder="What does your company do?"
            className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm"
          />
        </div>

        {errors.length > 0 && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4">
            <div className="text-sm text-red-600 dark:text-red-400">
              {errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4 border-t">
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
        </div>

        {/* Metadata */}
        {currentProfile && (
          <div className="text-xs text-muted-foreground border-t pt-4">
            <p>Created: {new Date(currentProfile.createdAt).toLocaleString()}</p>
            <p>Last Updated: {new Date(currentProfile.updatedAt).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
