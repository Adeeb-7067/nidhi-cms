import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useListUsers } from "@/api";
import { useAssignableCmsRoles } from "@/api/permissions";
import type { AlertAudienceType } from "@/api/alerts";

const AUDIENCE_MODES: Array<{ value: AlertAudienceType; label: string; description: string }> = [
  { value: "user", label: "Specific user", description: "Only the selected people will see the alert." },
  { value: "role", label: "Specific role", description: "Everyone currently assigned the selected roles will see the alert." },
  { value: "all", label: "All users", description: "Every active user will see the alert." },
];

type AlertAudienceFieldProps = {
  audienceType: AlertAudienceType;
  targetUserIds: number[];
  targetRoles: string[];
  onChange: (value: { audienceType: AlertAudienceType; targetUserIds: number[]; targetRoles: string[] }) => void;
  disabled?: boolean;
  /** Preseeded id→name labels for users already selected (e.g. when editing an alert). */
  initialUserLabels?: Record<number, string>;
};

export function AlertAudienceField({
  audienceType,
  targetUserIds,
  targetRoles,
  onChange,
  disabled,
  initialUserLabels,
}: AlertAudienceFieldProps) {
  const selectedMode = AUDIENCE_MODES.find((m) => m.value === audienceType);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">Who should see this alert?</Label>
        <Select
          value={audienceType}
          onValueChange={(v) =>
            onChange({ audienceType: v as AlertAudienceType, targetUserIds: [], targetRoles: [] })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select audience" />
          </SelectTrigger>
          <SelectContent>
            {AUDIENCE_MODES.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedMode ? (
          <p className="text-[11px] text-muted-foreground">{selectedMode.description}</p>
        ) : null}
      </div>

      {audienceType === "user" ? (
        <UserMultiPicker
          value={targetUserIds}
          onChange={(userIds) => onChange({ audienceType, targetUserIds: userIds, targetRoles: [] })}
          disabled={disabled}
          initialLabels={initialUserLabels}
        />
      ) : null}

      {audienceType === "role" ? (
        <RoleMultiPicker
          value={targetRoles}
          onChange={(roles) => onChange({ audienceType, targetUserIds: [], targetRoles: roles })}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

function UserMultiPicker({
  value,
  onChange,
  disabled,
  initialLabels,
}: {
  value: number[];
  onChange: (userIds: number[]) => void;
  disabled?: boolean;
  initialLabels?: Record<number, string>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data } = useListUsers({ search: search || undefined, limit: 20 });
  const users = data?.users ?? [];

  // Selected users may not be in the current (search-filtered) page, so cache
  // their display names as we discover them (from search results or edit seed).
  const labelsRef = useRef<Map<number, string>>(new Map());
  const [, forceRender] = useState(0);
  useEffect(() => {
    if (!initialLabels) return;
    let changed = false;
    for (const [id, name] of Object.entries(initialLabels)) {
      const numId = Number(id);
      if (!labelsRef.current.has(numId)) {
        labelsRef.current.set(numId, name);
        changed = true;
      }
    }
    if (changed) forceRender((n) => n + 1);
  }, [initialLabels]);
  for (const u of users) labelsRef.current.set(u.id, u.name);

  const toggle = (userId: number) => {
    onChange(value.includes(userId) ? value.filter((id) => id !== userId) : [...value, userId]);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">Users</Label>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="h-10 w-full justify-between font-normal"
          >
            <span className="truncate">
              {value.length > 0 ? `${value.length} user${value.length > 1 ? "s" : ""} selected` : "Search for users…"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search users by name…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={String(user.id)}
                    onSelect={() => toggle(user.id)}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value.includes(user.id) ? "opacity-100" : "opacity-0")}
                    />
                    <span className="truncate">{user.name}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">{user.role}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((userId) => (
            <Badge key={userId} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              {labelsRef.current.get(userId) ?? `User #${userId}`}
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((id) => id !== userId))}
                  className="rounded-sm hover:bg-muted-foreground/20"
                  aria-label="Remove user"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RoleMultiPicker({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (roles: string[]) => void;
  disabled?: boolean;
}) {
  const { data } = useAssignableCmsRoles();
  const roles = data?.roles ?? [];

  const toggle = (role: string) => {
    onChange(value.includes(role) ? value.filter((r) => r !== role) : [...value, role]);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">Roles</Label>
      <div className="grid grid-cols-2 gap-1.5">
        {roles.map((role) => {
          const active = value.includes(role.value);
          return (
            <button
              key={role.value}
              type="button"
              disabled={disabled}
              onClick={() => toggle(role.value)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors",
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              <Check className={cn("h-3.5 w-3.5 shrink-0", active ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{role.label}</span>
            </button>
          );
        })}
      </div>
      {value.length > 0 ? (
        <p className="text-[11px] text-muted-foreground pt-0.5">
          {value.length} role{value.length > 1 ? "s" : ""} selected
        </p>
      ) : null}
    </div>
  );
}
