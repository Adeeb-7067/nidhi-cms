import { useRef, useState } from "react";
import { Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useImportLeads } from "@/api/sales";

const CSV_TEMPLATE = `name,email,phone,company,source,priority,expectedValue
Jane Doe,jane@example.com,9876543210,Acme Corp,website,high,50000
John Smith,john@example.com,,Beta Ltd,referral,medium,25000`;

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "leads-import-template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function LeadImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importLeads = useImportLeads();
  const [previewCount, setPreviewCount] = useState(0);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    setPreviewCount(rows.length);
    if (rows.length === 0) {
      toast.error("No data rows found. Use the template format.");
      return;
    }
    try {
      const result = await importLeads.mutateAsync(
        rows.map((row) => ({
          name: row.name,
          email: row.email || undefined,
          phone: row.phone || undefined,
          company: row.company || undefined,
          source: row.source || undefined,
          priority: (row.priority as "low" | "medium" | "high" | "urgent") || undefined,
          expectedValue: row.expectedvalue ? Number(row.expectedvalue) : undefined,
        })),
      );
      if (result.errors.length > 0) {
        toast.warning(`Imported ${result.created} leads. ${result.errors.length} row(s) failed.`);
      } else {
        toast.success(`Imported ${result.created} lead${result.created === 1 ? "" : "s"}.`);
      }
      onOpenChange(false);
      setPreviewCount(0);
    } catch (err) {
      toastApiError(err, "Import failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: name, email, phone, company, source, priority, expectedValue.
            Name is required for each row.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5" />
            Download template
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            className="w-full gap-1.5"
            disabled={importLeads.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {importLeads.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importLeads.isPending ? "Importing…" : "Choose CSV file"}
          </Button>
          {previewCount > 0 && !importLeads.isPending && (
            <p className="text-xs text-muted-foreground text-center">{previewCount} rows detected</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
