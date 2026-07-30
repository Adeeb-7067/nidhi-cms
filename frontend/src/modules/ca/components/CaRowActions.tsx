import { CmsRowActions, type CmsRowActionsProps } from "@/components/cms";

/** @deprecated Prefer CmsRowActions — kept as a thin alias for CA pages. */
export function CaRowActions(props: CmsRowActionsProps) {
  return <CmsRowActions label={props.label ?? "CA row actions"} {...props} />;
}
