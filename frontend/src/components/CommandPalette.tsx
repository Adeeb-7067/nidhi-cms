import React, { useState, useEffect, useCallback } from "react";
import { CommandInput } from "cmdk";
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useGlobalSearch, getGlobalSearchQueryKey } from "@/api";
import { Briefcase, Building, Bug, Loader2, Search } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getProjectDetailHref } from "@/lib/project-routes";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const enabled = debouncedQuery.length >= 2;

  const { data, isLoading } = useGlobalSearch(
    { q: debouncedQuery, limit: 5 },
    {
      query: {
        queryKey: getGlobalSearchQueryKey({ q: debouncedQuery, limit: 5 }),
        enabled,
      },
    }
  );

  useEffect(() => {
    if (data) {
      const firstProject = data.projects?.[0];
      const firstClient = data.clients?.[0];
      const firstEmployee = data.employees?.[0];
      const firstBug = data.bugs?.[0];

      if (firstProject) {
        setSelectedId(`project-${firstProject.id}-${firstProject.name}`);
      } else if (firstClient) {
        setSelectedId(`client-${firstClient.id}-${firstClient.companyName}`);
      } else if (firstEmployee) {
        setSelectedId(`emp-${firstEmployee.id}-${firstEmployee.name}`);
      } else if (firstBug) {
        setSelectedId(`bug-${firstBug.id}-${firstBug.title}`);
      } else {
        setSelectedId(undefined);
      }
    } else {
      setSelectedId(undefined);
    }
  }, [data]);

  const navigate = useCallback(
    (path: string) => {
      setLocation(path);
      onOpenChange(false);
      setQuery("");
    },
    [setLocation, onOpenChange]
  );

  const hasResults =
    data &&
    (data.projects.length > 0 ||
      data.clients.length > 0 ||
      data.employees.length > 0 ||
      data.bugs.length > 0);

  const hasProjects = (data?.projects?.length ?? 0) > 0;
  const hasClients = (data?.clients?.length ?? 0) > 0;
  const hasEmployees = (data?.employees?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQuery(""); }}>
      <DialogContent className="p-0 gap-0 max-w-xl bg-card border-border shadow-2xl overflow-hidden translate-y-0 top-[20vh]">
        <Command
          className="bg-transparent"
          shouldFilter={false}
          value={selectedId}
          onValueChange={setSelectedId}
        >
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground [&:focus]:outline-none border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Search projects, clients, team, bugs..."
              value={query}
              onValueChange={setQuery}
            />
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>

          <CommandList className="max-h-[420px] overflow-y-auto p-1.5">
            {!enabled ? (
              <div className="py-10 text-center select-none">
                <Search className="h-7 w-7 mx-auto text-muted-foreground/30 mb-2.5" />
                <p className="text-sm text-muted-foreground">Type 2+ characters to search</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Projects · Clients · Team · Bugs</p>
              </div>
            ) : isLoading ? (
              <div className="py-10 text-center">
                <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">Searching…</p>
              </div>
            ) : !hasResults ? (
              <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
                No results for &ldquo;{debouncedQuery}&rdquo;
              </CommandEmpty>
            ) : (
              <>
                {hasProjects && (
                  <CommandGroup heading="Projects">
                    {data!.projects.map((p) => (
                      <CommandItem
                        key={`project-${p.id}`}
                        value={`project-${p.id}-${p.name}`}
                        onSelect={() => {
                          if (user?.role === "client") navigate("/client");
                          else navigate(getProjectDetailHref(p.id, user?.role, p.type));
                        }}
                        className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-muted"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-blue-500/10">
                          <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{p.status.replace(/_/g, " ")}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] capitalize ${p.priority === "critical" ? "text-red-500 bg-red-500/10" : p.priority === "high" ? "text-orange-500 bg-orange-500/10" : ""}`}
                        >
                          {p.priority}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {hasClients && (
                  <>
                    {hasProjects && <CommandSeparator className="my-1 bg-border/60" />}
                    <CommandGroup heading="Clients">
                      {data!.clients.map((c) => (
                        <CommandItem
                          key={`client-${c.id}`}
                          value={`client-${c.id}-${c.companyName}`}
                          onSelect={() => navigate("/admin/clients")}
                          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-muted"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-violet-500/10">
                            <Building className="h-3.5 w-3.5 text-violet-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">{c.companyName}</p>
                            <p className="text-[10px] text-muted-foreground">{c.contactPerson}</p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${c.status === "active" ? "text-green-500 bg-green-500/10" : "text-muted-foreground"}`}
                          >
                            {c.status}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {hasEmployees && (
                  <>
                    {(hasProjects || hasClients) && <CommandSeparator className="my-1 bg-border/60" />}
                    <CommandGroup heading="Team">
                      {data!.employees.map((u) => (
                        <CommandItem
                          key={`emp-${u.id}`}
                          value={`emp-${u.id}-${u.name}`}
                          onSelect={() => navigate("/admin/employees")}
                          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-muted"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[10px] font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground">{u.designation || u.subType || "Developer"}</p>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground/60">{u.employeeId}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {(data?.bugs?.length ?? 0) > 0 && (
                  <>
                    {(hasProjects || hasClients || hasEmployees) && <CommandSeparator className="my-1 bg-border/60" />}
                    <CommandGroup heading="Bugs">
                      {data!.bugs.map((b) => (
                        <CommandItem
                          key={`bug-${b.id}`}
                          value={`bug-${b.id}-${b.title}`}
                          onSelect={() => navigate(`/dev/bugs?bug=${b.id}`)}
                          className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-muted"
                        >
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                              b.severity === "critical"
                                ? "bg-red-500/10"
                                : b.severity === "high"
                                ? "bg-orange-500/10"
                                : "bg-amber-500/10"
                            }`}
                          >
                            <Bug
                              className={`h-3.5 w-3.5 ${
                                b.severity === "critical"
                                  ? "text-red-500"
                                  : b.severity === "high"
                                  ? "text-orange-500"
                                  : "text-amber-500"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">{b.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {b.bugNumber} · {b.status}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] capitalize ${
                              b.severity === "critical"
                                ? "text-red-500 bg-red-500/10"
                                : b.severity === "high"
                                ? "text-orange-500 bg-orange-500/10"
                                : ""
                            }`}
                          >
                            {b.severity}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>

          <div className="border-t border-border px-3 py-2 flex items-center gap-3 text-[10px] text-muted-foreground/60 select-none">
            <span>
              <kbd className="px-1 py-0.5 border border-border/80 rounded text-[9px] bg-muted/40">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 border border-border/80 rounded text-[9px] bg-muted/40">↵</kbd> open
            </span>
            <span>
              <kbd className="px-1 py-0.5 border border-border/80 rounded text-[9px] bg-muted/40">Esc</kbd> close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
