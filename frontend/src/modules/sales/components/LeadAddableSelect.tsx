import { useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { useAddSalesConfig } from "@/api/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type LeadSelectOption = { value: string; label: string };

function slugifyOption(label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `option_${Date.now()}`;
}

type LeadAddableSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: LeadSelectOption[];
  configType: "lead_source" | "lead_channel";
  placeholder?: string;
  allowEmpty?: boolean;
  className?: string;
};

export function LeadAddableSelect({
  label,
  value,
  onChange,
  options,
  configType,
  placeholder = "Select…",
  allowEmpty = false,
  className,
}: LeadAddableSelectProps) {
  const addConfig = useAddSalesConfig();
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!addOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [addOpen]);

  const closeAddPanel = () => {
    setAddOpen(false);
    setDraft("");
  };

  const selectExistingOrNew = (nextValue: string) => {
    onChange(nextValue);
    closeAddPanel();
  };

  const handleAddOption = async () => {
    const labelText = draft.trim();
    if (!labelText) {
      toast.error("Enter a name for the new option");
      return;
    }

    const existing = options.find(
      (option) =>
        option.label.localeCompare(labelText, undefined, { sensitivity: "accent" }) === 0 ||
        option.value === slugifyOption(labelText),
    );
    if (existing) {
      selectExistingOrNew(existing.value);
      toast.message(`"${existing.label}" is already in the list`);
      return;
    }

    const valueSlug = slugifyOption(labelText);
    try {
      const created = await addConfig.mutateAsync({
        type: configType,
        value: valueSlug,
        label: labelText,
      }) as { value: string };
      selectExistingOrNew(created.value);
      toast.success(`Added "${labelText}"`);
    } catch (err) {
      toastApiError(err, "Could not save option");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium leading-none">{label}</p>
      <div className="flex gap-2">
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="min-w-0 flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="z-[120]">
            {allowEmpty ? (
              <SelectItem value="__none__" className="text-muted-foreground">
                None
              </SelectItem>
            ) : null}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover
          open={addOpen}
          onOpenChange={(next) => {
            setAddOpen(next);
            if (!next) setDraft("");
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              title={`Add ${label.toLowerCase()}`}
            >
              <Plus className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-[120] w-64 p-3" align="end" side="bottom">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add {label.toLowerCase()}</p>
              <Input
                ref={inputRef}
                value={draft}
                placeholder="New option name"
                disabled={addConfig.isPending}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAddOption();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 flex-1"
                  disabled={addConfig.isPending || !draft.trim()}
                  onClick={() => void handleAddOption()}
                >
                  {addConfig.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Add"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  disabled={addConfig.isPending}
                  onClick={closeAddPanel}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
