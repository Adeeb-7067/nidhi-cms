import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function LegalFormDialog({
  open,
  onOpenChange,
  title,
  saving,
  onSubmit,
  children,
  submitLabel,
  readOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  saving?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
  submitLabel?: string;
  readOnly?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (readOnly) return;
            onSubmit();
          }}
          className="flex flex-col flex-1 min-h-0"
        >
          <DialogBody className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
            {readOnly ? (
              <fieldset disabled className="min-w-0 space-y-3 border-0 p-0 m-0 disabled:opacity-95">
                {children}
              </fieldset>
            ) : (
              children
            )}
          </DialogBody>
          <DialogFooter className="px-6 py-4 border-t border-border/60">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly ? (
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {submitLabel ?? "Save"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LegalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function LegalTextInput(props: React.ComponentProps<typeof Input>) {
  return <Input className="h-8 text-xs" {...props} />;
}

export function LegalTextArea(props: React.ComponentProps<typeof Textarea>) {
  return <Textarea className="min-h-[72px] text-xs" {...props} />;
}

export function LegalSelect({
  value,
  onValueChange,
  placeholder,
  options,
  disabled,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
