"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tableDefMap } from "@/lib/sfp-table-defs";
import { addTableRow, deleteTableRow, makeRowId, updateTableRow, useScenarios } from "@/lib/sfp-store";
import type { Tables } from "@/lib/sfp-types";

export function TableEditor({ scenarioId, tableKey }: { scenarioId: string; tableKey: keyof Tables }) {
  const scenarios = useScenarios();
  const scenario = scenarios.find((item) => item.id === scenarioId);
  const def = tableDefMap.get(tableKey);

  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<Record<string, string | number>>({});

  if (!scenario || !def) return null;

  const rows = scenario.tables[tableKey];

  function startEdit(row: Tables[keyof Tables][number]) {
    setEditingId(row.id);
    setFormState(row as unknown as Record<string, string | number>);
    setOpen(true);
  }

  function startAdd() {
    const next = def.newRow() as Record<string, string | number>;
    setEditingId(null);
    setFormState(next);
    setOpen(true);
  }

  function handleChange(key: string, value: string) {
    const column = def.columns.find((col) => col.key === key);
    if (column?.type === "number") {
      setFormState((prev) => ({ ...prev, [key]: value === "" ? 0 : Number(value) }));
    } else {
      setFormState((prev) => ({ ...prev, [key]: value }));
    }
  }

  function handleSave() {
    if (editingId) {
      updateTableRow(scenarioId, tableKey, editingId, formState as Tables[keyof Tables][number]);
    } else {
      const newRow = { ...formState, id: makeRowId(String(tableKey)) } as Tables[keyof Tables][number];
      addTableRow(scenarioId, tableKey, newRow);
    }
    setOpen(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{def.label}</CardTitle>
        <CardDescription>{def.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-500">{rows.length} rows</p>
          <Button variant="outline" onClick={startAdd} data-table-add>
            Add Row
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-ink-100">
          <Table>
            <TableHeader>
              <tr>
                {def.columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
                <TableHead />
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} onClick={() => startEdit(row)} className="cursor-pointer">
                  {def.columns.map((column) => (
                    <TableCell key={column.key}>{String((row as Record<string, string | number>)[column.key] ?? "")}</TableCell>
                  ))}
                  <TableCell className="text-right">
                    <button
                      className="text-xs text-ink-400 hover:text-ink-700"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteTableRow(scenarioId, tableKey, row.id);
                      }}
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={editingId ? `Edit ${def.label}` : `Add ${def.label}`}
        description="Update the fields and save to apply changes to the scenario."
      >
        <div className="space-y-4">
          {def.columns.map((column) => (
            <div key={column.key} className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-400">{column.label}</label>
              {column.type === "select" ? (
                <Select
                  value={String(formState[column.key] ?? column.options?.[0] ?? "")}
                  onChange={(event) => handleChange(column.key, event.target.value)}
                >
                  {column.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={column.type === "number" ? "number" : "text"}
                  value={String(formState[column.key] ?? "")}
                  onChange={(event) => handleChange(column.key, event.target.value)}
                />
              )}
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleSave}>
              Save Row
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Sheet>
    </Card>
  );
}
