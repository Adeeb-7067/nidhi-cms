import { CmsRowActions, type CmsRowActionsProps } from "@/components/cms";

/** @deprecated Prefer CmsRowActions — kept as a thin alias for Marketing pages. */
export function MarketingRowActions(props: CmsRowActionsProps) {
  return <CmsRowActions label={props.label ?? "Marketing row actions"} {...props} />;
}
