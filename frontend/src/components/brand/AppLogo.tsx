import React from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

const sizeClass = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
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
      className={cn("shrink-0 object-contain", sizeClass[size], className)}
      draggable={false}
    />
  );
}
