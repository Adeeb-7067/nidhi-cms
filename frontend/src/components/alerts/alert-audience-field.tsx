import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  { value: "user", label: "Specific user", description: "Only this one person will see the alert." },
  { value: "role", label: "Specific role", description: "Everyone currently assigned this role will see the alert." },
  { value: "all", label: "All users", description: "Every active user will see the alert." },
];

type AlertAudienceFieldProps = {
  audienceType: AlertAudienceType;
  targetUserId: number | null;
  targetRole: string | null;
  onChange: (value: { audienceType: AlertAudienceType; targetUserId: number | null; targetRole: string | null }) => void;
  disabled?: boolean;
};

export function AlertAudienceField({
  audienceType,
  targetUserId,
  targetRole,
  onChange,
  disabled,
}: AlertAudienceFieldProps) {
  const selectedMode = AUDIENCE_MODES.find((m) => m.value === audienceType);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">Who should see this alert?</Label>
        <Select
          value={audienceType}
          onValueChange={(v) =>
            onChange({ audienceType: v as AlertAudienceType, targetUserId: null, targetRole: null })
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
        <UserPicker
          value={targetUserId}
          onChange={(userId) => onChange({ audienceType, targetUserId: userId, targetRole: null })}
          disabled={disabled}
        />
      ) : null}

      {audienceType === "role" ? (
        <RolePicker
          value={targetRole}
          onChange={(role) => onChange({ audienceType, targetUserId: null, targetRole: role })}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}

function UserPicker({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (userId: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data } = useListUsers({ search: search || undefined, limit: 20 });
  const users = data?.users ?? [];
  const selectedUser = users.find((u) => u.id === value);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">User</Label>
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
              {selectedUser ? selectedUser.name : value ? `User #${value}` : "Search for a user…"}
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
                    onSelect={() => {
                      onChange(user.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === user.id ? "opacity-100" : "opacity-0")}
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
    </div>
  );
}

function RolePicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (role: string) => void;
  disabled?: boolean;
}) {
  const { data } = useAssignableCmsRoles();
  const roles = data?.roles ?? [];

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">Role</Label>
      <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Select a role" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
