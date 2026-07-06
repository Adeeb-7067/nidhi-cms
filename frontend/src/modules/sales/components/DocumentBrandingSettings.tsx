import { useMemo } from "react";
import { Link } from "wouter";
import {
  Plus, Trash2, FileText, Building2, Landmark, Tags, ExternalLink, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SalesDocumentBrandingFields, SalesDocumentCustomField } from "@/api/sales";
import { useGetSettings } from "@/api/generated/api";
import {
  resolveSalesDocumentBranding,
  customFieldsForDocument,
  type SalesDocumentKind,
} from "@/modules/sales/company-branding";
import { DocumentBankDetails } from "./DocumentIssuerMeta";

const DOC_TYPES: { kind: SalesDocumentKind; label: string }[] = [
  { kind: "invoice", label: "Invoice" },
  { kind: "receipt", label: "Receipt" },
  { kind: "proposal", label: "Proposal" },
  { kind: "statement", label: "Statement" },
];

function emptyCustomField(): SalesDocumentCustomField {
  return {
    id: `field-${Date.now()}`,
    label: "",
    value: "",
    showOnInvoice: true,
    showOnReceipt: true,
    showOnProposal: false,
    showOnStatement: false,
  };
}

export function createDocumentBrandingState(
  source?: SalesDocumentBrandingFields | null,
): SalesDocumentBrandingFields {
  return {
    gstin: source?.gstin ?? "",
    email: source?.email ?? "",
    phone: source?.phone ?? "",
    pan: source?.pan ?? "",
    cin: source?.cin ?? "",
    website: source?.website ?? "",
    bankName: source?.bankName ?? "",
    bankAccount: source?.bankAccount ?? "",
    bankIfsc: source?.bankIfsc ?? "",
    customFields: source?.customFields?.map((field) => ({ ...field })) ?? [],
  };
}

function DocBadges({ kinds }: { kinds: SalesDocumentKind[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {kinds.map((kind) => {
        const label = DOC_TYPES.find((d) => d.kind === kind)?.label ?? kind;
        return (
          <Badge key={kind} variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

function DocumentBrandingPreview({ value }: { value: SalesDocumentBrandingFields }) {
  const { data: orgSettings } = useGetSettings();
  const branding = useMemo(
    () => resolveSalesDocumentBranding(orgSettings, value),
    [orgSettings, value],
  );

  const issuerLines = [
    branding.phone,
    branding.email,
    branding.gstin ? `GSTIN: ${branding.gstin}` : null,
    branding.pan ? `PAN: ${branding.pan}` : null,
    branding.cin ? `CIN: ${branding.cin}` : null,
    branding.website,
    ...customFieldsForDocument(branding, "invoice").map((f) => `${f.label}: ${f.value}`),
  ].filter(Boolean);

  const hasBank = Boolean(branding.bankName || branding.bankAccount || branding.bankIfsc);
  const isEmpty = issuerLines.length === 0 && !hasBank;

  return (
    <Card className="border-dashed bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground font-medium">
          <Eye className="h-3.5 w-3.5" />
          Invoice header preview
        </CardTitle>
        <CardDescription className="text-[11px]">
          How issuer details appear on generated documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-xl border bg-white p-4 shadow-sm"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          <div className="border-b-2 border-blue-700 pb-3 mb-3">
            <p className="font-bold text-sm text-gray-900 leading-tight">{branding.companyName}</p>
            {branding.address ? (
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{branding.address}</p>
            ) : null}
            {isEmpty ? (
              <p className="text-[10px] text-amber-600 mt-2 italic">
                Add contact or tax fields to see them here.
              </p>
            ) : (
              <p className="text-[10px] text-gray-500 mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
                {issuerLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
            )}
          </div>
          <p className="text-lg font-black text-blue-700 uppercase tracking-wide">Tax Invoice</p>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">INV-2026-0001</p>
          {hasBank ? (
            <div className="mt-3 scale-[0.92] origin-top-left">
              <DocumentBankDetails branding={branding} compact />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentBrandingSettings({
  value,
  onChange,
}: {
  value: SalesDocumentBrandingFields;
  onChange: (next: SalesDocumentBrandingFields) => void;
}) {
  const setField = <K extends keyof SalesDocumentBrandingFields>(key: K, fieldValue: SalesDocumentBrandingFields[K]) => {
    onChange({ ...value, [key]: fieldValue });
  };

  const updateCustomField = (id: string, patch: Partial<SalesDocumentCustomField>) => {
    onChange({
      ...value,
      customFields: value.customFields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    });
  };

  const removeCustomField = (id: string) => {
    onChange({ ...value, customFields: value.customFields.filter((field) => field.id !== id) });
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <span className="font-medium">Company name, address, logo &amp; seal</span> are managed in{" "}
          <Link href="/admin/settings" className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
            Admin settings
            <ExternalLink className="h-3 w-3" />
          </Link>
          . Use this tab for tax IDs, contact lines, and bank details on sales documents.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="space-y-4 min-w-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Tax &amp; contact
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Shown in the document header. Leave blank to hide a line.
                  </CardDescription>
                </div>
                <DocBadges kinds={["invoice", "receipt", "proposal", "statement"]} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="doc-gstin">GSTIN / tax number</Label>
                <Input
                  id="doc-gstin"
                  value={value.gstin}
                  onChange={(e) => setField("gstin", e.target.value)}
                  placeholder="e.g. 27AABCS1234F1Z5"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-email">Accounts email</Label>
                <Input
                  id="doc-email"
                  type="email"
                  value={value.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="accounts@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-phone">Phone</Label>
                <Input
                  id="doc-phone"
                  value={value.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-pan">PAN</Label>
                <Input
                  id="doc-pan"
                  value={value.pan ?? ""}
                  onChange={(e) => setField("pan", e.target.value || null)}
                  placeholder="Optional"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-cin">CIN</Label>
                <Input
                  id="doc-cin"
                  value={value.cin ?? ""}
                  onChange={(e) => setField("cin", e.target.value || null)}
                  placeholder="Optional"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="doc-website">Website</Label>
                <Input
                  id="doc-website"
                  value={value.website ?? ""}
                  onChange={(e) => setField("website", e.target.value || null)}
                  placeholder="https://company.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Landmark className="h-4 w-4" />
                    Bank details
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Printed on invoices for client payments. Not shared on public proposal links.
                  </CardDescription>
                </div>
                <DocBadges kinds={["invoice"]} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="doc-bank-name">Bank name</Label>
                <Input
                  id="doc-bank-name"
                  value={value.bankName ?? ""}
                  onChange={(e) => setField("bankName", e.target.value || null)}
                  placeholder="e.g. HDFC Bank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-bank-account">Account number</Label>
                <Input
                  id="doc-bank-account"
                  value={value.bankAccount ?? ""}
                  onChange={(e) => setField("bankAccount", e.target.value || null)}
                  placeholder="Account number"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-bank-ifsc">IFSC</Label>
                <Input
                  id="doc-bank-ifsc"
                  value={value.bankIfsc ?? ""}
                  onChange={(e) => setField("bankIfsc", e.target.value || null)}
                  placeholder="HDFC0001234"
                  className="font-mono text-sm uppercase"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Custom fields
                </CardTitle>
                <CardDescription>
                  Extra registration lines (MSME, LUT, etc.). Toggle which documents include each field.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 shrink-0"
                onClick={() => onChange({ ...value, customFields: [...value.customFields, emptyCustomField()] })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add field
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {value.customFields.length === 0 ? (
                <div className="rounded-xl border border-dashed py-8 text-center">
                  <Tags className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No custom fields yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add MSME, LUT, or other IDs that should print on documents.
                  </p>
                </div>
              ) : (
                value.customFields.map((field, index) => (
                  <div key={field.id} className="rounded-xl border bg-card p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Field {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => removeCustomField(field.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                          placeholder="e.g. MSME"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={field.value}
                          onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                          placeholder="Registration number"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Show on
                      </p>
                      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
                        {([
                          ["showOnInvoice", "Invoice"],
                          ["showOnReceipt", "Receipt"],
                          ["showOnProposal", "Proposal"],
                          ["showOnStatement", "Statement"],
                        ] as const).map(([key, label]) => (
                          <label
                            key={key}
                            className="flex items-center justify-between rounded-lg border px-2.5 py-2 cursor-pointer hover:bg-muted/40"
                          >
                            <span className="text-xs">{label}</span>
                            <Switch
                              checked={field[key]}
                              onCheckedChange={(checked) => updateCustomField(field.id, { [key]: checked })}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4 space-y-3">
          <DocumentBrandingPreview value={value} />
          <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
            Changes apply after you click <span className="font-medium">Save changes</span> at the top of this page.
          </p>
        </div>
      </div>
    </div>
  );
}
