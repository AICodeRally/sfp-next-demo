"use client";

import { ScenarioHeader } from "@/components/scenario/scenario-header";
import { ScenarioTabs } from "@/components/scenario/scenario-tabs";

export default function ScenarioLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const basePath = `/scenarios/${params.id}`;

  return (
    <div className="space-y-6">
      <ScenarioHeader scenarioId={params.id} />
      <ScenarioTabs basePath={basePath} />
      {children}
    </div>
  );
}
