import type { ApkReleaseAudience } from "@/api";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APK_AUDIENCE_OPTIONS } from "@/lib/apk-audience";

type ApkAudienceFieldProps = {
  value: ApkReleaseAudience;
  onChange: (value: ApkReleaseAudience) => void;
  disabled?: boolean;
};

export function ApkAudienceField({ value, onChange, disabled }: ApkAudienceFieldProps) {
  const selected = APK_AUDIENCE_OPTIONS.find((o) => o.value === value);

  return (
    <FormItem className="sm:col-span-2">
      <FormLabel>Who can see this release?</FormLabel>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ApkReleaseAudience)}
        disabled={disabled}
      >
        <FormControl>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select visibility" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {APK_AUDIENCE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="py-2">
              <span className="font-medium">{opt.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected ? (
        <FormDescription>{selected.description}</FormDescription>
      ) : null}
      <FormMessage />
    </FormItem>
  );
}
