import React from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

const sizeClass = {
  sm: "h-7 max-w-[4.75rem]",
  md: "h-9 max-w-[5.75rem]",
  lg: "h-12 max-w-[14rem]",
  xl: "h-16 max-w-[18rem]",
} as const;

type AppLogoProps = {
  size?: keyof typeof sizeClass;
  className?: string;
  title?: string;
};

export function AppLogo({ size = "md", className, title = BRAND.shortName }: AppLogoProps) {
  return (
    <img
      src={BRAND.logoSrc}
      alt={BRAND.shortName}
      title={title}
      className={cn("object-contain object-left", sizeClass[size], className)}
      draggable={false}
    />
  );
}
