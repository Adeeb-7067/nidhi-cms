import { useEffect, useState } from "react";
import { Eye, EyeOff, Key, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  getGetUserCredentialsQueryKey,
  useGetUserCredentials,
  useRevealCredential,
} from "@/api";
import { Button } from "@/components/ui/button";
import { DataPagination } from "@/components/ui/data-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClientPagination } from "@/lib/table-pagination";
import { HrmChartCard } from "./hrm-ui-kit";

const REVEAL_MS = 10_000;

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
        <Table>
          <TableHeader className="bg-muted/20">
            <TableRow className="hover:bg-transparent text-[9px] font-semibold text-muted-foreground">
              <TableHead className="h-7 py-1 pl-3 text-center w-[50px]">Ver.</TableHead>
              <TableHead className="h-7 py-1">Created by</TableHead>
              <TableHead className="h-7 py-1">Date set</TableHead>
              <TableHead className="h-7 py-1">Trigger</TableHead>
              <TableHead className="h-7 py-1 pr-3 text-right w-[120px]">Password</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((_, j) => (
                    <TableCell key={j} className="py-2">
                      <Skeleton className="h-3.5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : credentialRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-12 text-center text-[10px] text-muted-foreground">
                  No credential snapshots recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              credentialRows.map((cred) => (
                <TableRow key={cred.id} className="text-[10px] group/row hover:bg-muted/20 border-border/30">
                  <TableCell className="py-1 pl-3 text-center font-mono text-muted-foreground bg-muted/10 font-medium">
                    #{cred.entryNumber}
                  </TableCell>
                  <TableCell className="py-1 font-medium">{cred.setBy}</TableCell>
                  <TableCell className="py-1 text-muted-foreground">
                    {new Date(cred.setAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="py-1 text-muted-foreground capitalize">
                    {cred.trigger.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="py-1 pr-3 text-right">
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
                        className="h-6 w-6 opacity-60 group-hover/row:opacity-100 hover:text-primary hover:bg-primary/10 transition-all"
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <DataPagination {...pagination} />
      </div>
      <p className="text-[9px] text-muted-foreground/80 mt-2 italic">
        Decrypted passwords remain visible for 10 seconds. Each reveal is logged in the security audit trail.
      </p>
    </HrmChartCard>
  );
}
