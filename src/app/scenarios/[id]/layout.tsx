"use client";

import { use } from "react";
import { ScenarioHeader } from "@/components/scenario/scenario-header";
import { ScenarioTabs } from "@/components/scenario/scenario-tabs";

export default function ScenarioLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const basePath = `/scenarios/${id}`;

  return (
    <div className="space-y-6">
      <ScenarioHeader scenarioId={id} />
      <ScenarioTabs basePath={basePath} />
      {children}
    </div>
  );
}
