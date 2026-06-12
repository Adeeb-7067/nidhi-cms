import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, ListOrdered, AlignLeft } from "lucide-react";
import { BugTrackStatusRow } from "./bug-track-status";
import {
  type DraftBugRow,
  type BatchInputMode,
  parseLinesToRows,
  rowsToLineText,
  newDraftRow,
  MAX_BATCH_BUGS,
} from "@/lib/bug-batch";
import type { FinalStatus, TrackStatus } from "@/lib/bug-workflow";
import { cn } from "@/lib/utils";

export function BugBatchCreate({
  mode,
  onModeChange,
  lineText,
  onLineTextChange,
  rows,
  onRowsChange,
  userRole,
}: {
  mode: BatchInputMode;
  onModeChange: (mode: BatchInputMode) => void;
  lineText: string;
  onLineTextChange: (text: string) => void;
  rows: DraftBugRow[];
  onRowsChange: (rows: DraftBugRow[]) => void;
  userRole?: string;
}) {
  const applyLines = () => {
    const parsed = parseLinesToRows(lineText);
    onRowsChange(parsed);
  };

  const switchMode = (next: BatchInputMode) => {
    if (next === mode) return;
    if (next === "lines" && rows.length > 0) {
      onLineTextChange(rowsToLineText(rows));
    }
    if (next === "list" && lineText.trim()) {
      onRowsChange(parseLinesToRows(lineText));
    }
    onModeChange(next);
  };

  const updateRow = (id: string, patch: Partial<DraftBugRow>) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    if (rows.length >= MAX_BATCH_BUGS) return;
    onRowsChange([...rows, newDraftRow()]);
  };

  const removeRow = (id: string) => {
    onRowsChange(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">How do you want to add bugs?</Label>
        <Tabs value={mode} onValueChange={(v) => switchMode(v as BatchInputMode)}>
          <TabsList className="grid w-full grid-cols-2 h-9 bg-muted/50">
            <TabsTrigger value="lines" className="text-xs gap-1.5">
              <AlignLeft className="h-3.5 w-3.5" />
              One per line
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs gap-1.5">
              <ListOrdered className="h-3.5 w-3.5" />
              Add to list
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === "lines" ? (
        <div className="space-y-2">
          <Label htmlFor="bug-lines">Bug titles (one per line)</Label>
          <Textarea
            id="bug-lines"
            value={lineText}
            onChange={(e) => onLineTextChange(e.target.value)}
            placeholder={"Login button not working\nCheckout total incorrect\nProfile photo missing"}
            className="min-h-[120px] font-mono text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              Up to {MAX_BATCH_BUGS} lines · empty lines ignored
            </p>
            <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" onClick={applyLines}>
              Apply to list
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Add each issue — set QA, Dev, and Final status.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={addRow}
            disabled={rows.length >= MAX_BATCH_BUGS}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add bug
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Bug list ({rows.length})</Label>
          {mode === "list" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={addRow}
              disabled={rows.length >= MAX_BATCH_BUGS}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          )}
        </div>

        <div
          className={cn(
            "rounded-xl border border-border/60 bg-muted/20 max-h-[280px] overflow-y-auto divide-y divide-border/40",
            rows.length === 0 && "min-h-[100px] flex items-center justify-center",
          )}
        >
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">
              {mode === "lines"
                ? "Type bugs above and click Apply to list"
                : "Click Add bug to start your list"}
            </p>
          ) : (
            rows.map((row, index) => (
              <div
                key={row.id}
                className="p-3 space-y-2.5 bg-card/40 hover:bg-card/70 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground mt-2.5 w-5 shrink-0">
                    {index + 1}.
                  </span>
                  <Input
                    value={row.title}
                    onChange={(e) => updateRow(row.id, { title: e.target.value })}
                    placeholder="Bug title"
                    className="h-9 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(row.id)}
                    aria-label="Remove bug"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="pl-7">
                  <BugTrackStatusRow
                    qaStatus={row.qaStatus}
                    devStatus={row.devStatus}
                    finalStatus={row.finalStatus}
                    userRole={userRole}
                    isAssignee={false}
                    initialCreate
                    compact
                    onQaChange={(v: TrackStatus) => updateRow(row.id, { qaStatus: v })}
                    onDevChange={(v: TrackStatus) => updateRow(row.id, { devStatus: v })}
                    onFinalChange={(v: FinalStatus) => updateRow(row.id, { finalStatus: v })}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
