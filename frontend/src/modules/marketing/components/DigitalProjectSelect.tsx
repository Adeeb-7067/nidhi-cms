import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMarketingAccounts, type MarketingAccount } from "@/api/marketing";
import { digitalAccountLabel } from "@/modules/marketing/digital-account-label";
import { Loader2 } from "lucide-react";

type Props = {
  value?: string;
  onValueChange: (accountId: string) => void;
  placeholder?: string;
  className?: string;
  allowAll?: boolean;
  allLabel?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function DigitalProjectSelect({
  value,
  onValueChange,
  placeholder = "Select digital project",
  className = "h-8 w-[260px] text-xs",
  allowAll = false,
  allLabel = "All digital projects",
  allowEmpty = false,
  emptyLabel = "No project (company-wide)",
}: Props) {
  const { data, isLoading } = useMarketingAccounts();
  // Backend already scopes to digital; keep only rows linked to a project.
  const accounts = (data?.accounts ?? []).filter((a) => a.projectId != null);

  if (isLoading) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  }

  const selectValue =
    value || (allowAll ? "__all__" : allowEmpty ? "__none__" : undefined);

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => {
        if (v === "__all__" || v === "__none__") onValueChange("");
        else onValueChange(v);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none__">{emptyLabel}</SelectItem>}
        {allowAll && <SelectItem value="__all__">{allLabel}</SelectItem>}
        {accounts.map((a: MarketingAccount) => (
          <SelectItem key={a.id} value={String(a.id)}>
            {digitalAccountLabel(a)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
