import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DIGITAL_ADDITIONAL_PLATFORM_OPTIONS,
  DIGITAL_SERVICE_OPTIONS,
  DIGITAL_SOCIAL_LINK_FIELDS,
  type DigitalServiceKey,
  type DigitalServicesForm,
  type SocialLinkKey,
  type SocialLinksForm,
} from "@/lib/project-type-fields";
import { cn } from "@/lib/utils";

type DigitalProjectServiceFieldsProps = {
  services: DigitalServicesForm;
  socialLinks: SocialLinksForm;
  onServicesChange: (next: DigitalServicesForm) => void;
  onSocialLinksChange: (next: SocialLinksForm) => void;
  /** Optional supplemental platform checklist (techStack). */
  platforms?: string[];
  onPlatformsChange?: (next: string[]) => void;
  showAdditionalPlatforms?: boolean;
  className?: string;
  compact?: boolean;
};

export function DigitalProjectServiceFields({
  services,
  socialLinks,
  onServicesChange,
  onSocialLinksChange,
  platforms,
  onPlatformsChange,
  showAdditionalPlatforms = true,
  className,
  compact = false,
}: DigitalProjectServiceFieldsProps) {
  const labelCls = compact ? "text-xs" : "text-sm";
  const inputCls = compact ? "h-8 text-xs" : undefined;

  const toggleService = (key: DigitalServiceKey, checked: boolean) => {
    onServicesChange({ ...services, [key]: checked });
  };

  const setLink = (key: SocialLinkKey, value: string) => {
    onSocialLinksChange({ ...socialLinks, [key]: value });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <Label className={labelCls}>Services</Label>
        <p className="text-[11px] text-muted-foreground">
          What we manage for this client — SEO, Meta ads, and/or Google Ads.
        </p>
        <div className="grid gap-2 border border-border rounded-md p-3 sm:grid-cols-3">
          {DIGITAL_SERVICE_OPTIONS.map((opt) => (
            <div key={opt.key} className="flex items-start space-x-2">
              <Checkbox
                id={`digital-svc-${opt.key}`}
                checked={services[opt.key]}
                onCheckedChange={(checked) => toggleService(opt.key, Boolean(checked))}
                className="mt-0.5"
              />
              <label htmlFor={`digital-svc-${opt.key}`} className="cursor-pointer select-none">
                <span className={cn("font-medium block", compact ? "text-xs" : "text-sm")}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-snug block">
                  {opt.description}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={labelCls}>Social media profiles</Label>
        <p className="text-[11px] text-muted-foreground">
          Client social profile URLs for Facebook, Instagram, LinkedIn, X, YouTube, and more.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 border border-border rounded-md p-3">
          {DIGITAL_SOCIAL_LINK_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={`digital-social-${field.key}`} className="text-[11px] text-muted-foreground">
                {field.label}
              </Label>
              <Input
                id={`digital-social-${field.key}`}
                placeholder={field.placeholder}
                value={socialLinks[field.key]}
                onChange={(e) => setLink(field.key, e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      {showAdditionalPlatforms && platforms != null && onPlatformsChange && (
        <div className="space-y-1.5">
          <Label className={labelCls}>Additional channels / tools</Label>
          <p className="text-[11px] text-muted-foreground">
            Optional — platforms beyond the services above (analytics, email, Snapchat, etc.).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border rounded-md p-2.5 max-h-[140px] overflow-y-auto">
            {DIGITAL_ADDITIONAL_PLATFORM_OPTIONS.map((platform) => (
              <div key={platform} className="flex items-center space-x-2">
                <Checkbox
                  id={`digital-extra-${platform}`}
                  checked={platforms.includes(platform)}
                  onCheckedChange={(checked) => {
                    onPlatformsChange(
                      checked
                        ? [...platforms, platform]
                        : platforms.filter((p) => p !== platform),
                    );
                  }}
                />
                <label
                  htmlFor={`digital-extra-${platform}`}
                  className="text-xs font-normal cursor-pointer select-none"
                >
                  {platform}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
