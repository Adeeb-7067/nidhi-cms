import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type MarketingChipTab = {
  value: string;
  label: string;
  count?: number;
};

/** Shared status / stage filter chips used across Digital list pages. */
export function MarketingChipTabs({
  value,
  onValueChange,
  items,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: MarketingChipTab[];
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="text-xs data-[state=active]:bg-primary/10"
          >
            {item.label}
            {item.count != null ? ` (${item.count})` : ""}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
