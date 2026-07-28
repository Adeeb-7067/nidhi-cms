import { useState, useCallback } from "react";

export type CaCrudMode = "create" | "edit" | "view";

/** Shared create/edit/view/delete dialog state for CA list pages. */
export function useCaListCrud<T extends { id: number }>() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [mode, setMode] = useState<CaCrudMode>("create");
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setMode("create");
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((row: T) => {
    setEditing(row);
    setMode("edit");
    setDialogOpen(true);
  }, []);

  const openView = useCallback((row: T) => {
    setEditing(row);
    setMode("view");
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      setMode("create");
    }
  }, []);

  return {
    dialogOpen,
    editing,
    mode,
    readOnly: mode === "view",
    deleteTarget,
    setDeleteTarget,
    openCreate,
    openEdit,
    openView,
    closeDialog,
  };
}
