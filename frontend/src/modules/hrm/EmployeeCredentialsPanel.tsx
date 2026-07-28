import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Key, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getGetUserCredentialsQueryKey,
  useGetUserCredentials,
  useRevealCredential,
} from "@/api";
import { Button } from "@/components/ui/button";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { useClientPagination } from "@/lib/table-pagination";
import { HrmChartCard } from "./hrm-ui-kit";

const REVEAL_MS = 10_000;

type CredentialRow = {
  id: number;
  entryNumber: number;
  setBy: string;
  setAt: string;
  trigger: string;
};

export function EmployeeCredentialsPanel({
  userId,
  enabled = true,
}: {
  userId: number;
  enabled?: boolean;
}) {
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string>>({});
  const [revealTimers, setRevealTimers] = useState<Record<number, ReturnType<typeof setTimeout>>>({});

  const { data: credentials, isLoading } = useGetUserCredentials(userId, {
    query: {
      enabled: enabled && userId > 0,
      queryKey: getGetUserCredentialsQueryKey(userId),
    },
  });
  const { pageItems: credentialRows, pagination } = useClientPagination(credentials ?? []);
  const revealMutation = useRevealCredential();

  useEffect(() => {
    return () => {
      Object.values(revealTimers).forEach(clearTimeout);
    };
  }, [revealTimers]);

  const handleReveal = async (credId: number) => {
    if (revealedPasswords[credId]) {
      setRevealedPasswords((prev) => {
        const next = { ...prev };
        delete next[credId];
        return next;
      });
      if (revealTimers[credId]) {
        clearTimeout(revealTimers[credId]);
      }
      return;
    }

    try {
      const res = await revealMutation.mutateAsync({ id: userId, credId });
      setRevealedPasswords((prev) => ({ ...prev, [credId]: res.password }));
      const timer = setTimeout(() => {
        setRevealedPasswords((prev) => {
          const next = { ...prev };
          delete next[credId];
          return next;
        });
      }, REVEAL_MS);
      setRevealTimers((prev) => ({ ...prev, [credId]: timer }));
    } catch {
      toast.error("Could not decrypt password history");
    }
  };

  const columns = useMemo((): CmsColumn<CredentialRow>[] => [
    {
      id: "version",
      header: "Ver.",
      align: "center",
      className: "w-[50px] font-mono text-muted-foreground",
      cell: (cred) => `#${cred.entryNumber}`,
    },
    {
      id: "createdBy",
      header: "Created by",
      cell: (cred) => <span className="font-medium">{cred.setBy}</span>,
    },
    {
      id: "dateSet",
      header: "Date set",
      cell: (cred) => (
        <span className="text-muted-foreground">{new Date(cred.setAt).toLocaleString()}</span>
      ),
    },
    {
      id: "trigger",
      header: "Trigger",
      cell: (cred) => (
        <span className="text-muted-foreground capitalize">{cred.trigger.replace(/_/g, " ")}</span>
      ),
    },
    {
      id: "password",
      header: "Password",
      align: "right",
      className: "w-[120px]",
      cell: (cred) => (
        <div className="flex items-center justify-end gap-1.5">
          <span
            className={`font-mono select-all px-1.5 py-0.5 rounded ${
              revealedPasswords[cred.id]
                ? "text-primary bg-primary/10 font-semibold text-[10px]"
                : "text-muted-foreground/60 tracking-widest text-[8px]"
            }`}
          >
            {revealedPasswords[cred.id] || "????????"}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-60 hover:opacity-100 hover:text-primary hover:bg-primary/10 transition-all"
            onClick={() => void handleReveal(cred.id)}
            disabled={revealMutation.isPending}
            aria-label={revealedPasswords[cred.id] ? "Hide password" : "Reveal password"}
          >
            {revealedPasswords[cred.id] ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
        </div>
      ),
    },
  ], [revealedPasswords, revealMutation.isPending]);

  return (
    <HrmChartCard
      title="Login credentials"
      description="Audit-tracked password history for this employee account"
      headerExtra={<Key className="h-4 w-4 text-muted-foreground" />}
    >
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <div className="bg-primary/5 px-3 py-2 border-b border-border/60 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] font-medium text-primary">Credential vault</p>
        </div>
        <CmsDataTable
          columns={columns}
          rows={credentialRows as CredentialRow[]}
          rowKey={(cred) => cred.id}
          isLoading={isLoading}
          embedded
          loadingRows={3}
          empty={{ title: "No credential snapshots recorded yet." }}
          pagination={pagination}
          className="text-[10px]"
        />
      </div>
      <p className="text-[9px] text-muted-foreground/80 mt-2 italic">
        Decrypted passwords remain visible for 10 seconds. Each reveal is logged in the security audit trail.
      </p>
    </HrmChartCard>
  );
}
