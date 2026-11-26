"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ShieldCheck, Check, X, Star, Plus, FileText, Users, BookOpen, Layers, Settings2, Trash2, Pencil, Eye } from "lucide-react";
import { api, post, put, patch, del } from "@/lib/api";
import { imgSrc, SectionTitle, EmptyState, fmtDate } from "@/components/shared";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DesignConsole } from "@/components/views/admin-design";

type Queue = {
  publishers: { id: string; companyName: string; contactEmail: string; about?: string | null; logoImageId?: string | null; email: string; createdAt: string }[];
  stats: { publishers: number; magazines: number; editions: number; readers: number; users: number };
};

type Cat = { id: string; name: string; slug: string; sortOrder: number; magazines: number };
type AdminMag = {
  id: string; name: string; logoImageId: string; featured: boolean; editionsCount?: number;
  publisher?: { id?: string; companyName: string } | null;
};
type PageRow = { slug: string; title: string; content: string; updatedAt: string };

type Overview = {
  publishers: {
    id: string; companyName: string; contactEmail: string; about?: string | null; logoImageId?: string | null;
    status: string; rejectionReason?: string | null; email: string; magazines: number; createdAt: string;
  }[];
  magazines: {
    id: string; name: string; logoImageId: string; featured: boolean; frequency?: string | null;
    publisher: { companyName: string; status: string }; editionsCount: number; readers: number; createdAt: string;
  }[];
  editions: {
    id: string; title: string; issueNumber?: string | null; thumbnailImageId: string; flipbookUrl: string;
    publishedAt: string; magazine: { id: string; name: string }; publisher: { companyName: string; status: string };
  }[];
  readers: { id: string; name: string; email: string; favourites: number; createdAt: string }[];
  accounts: {
    id: string; name: string; email: string; role: string; companyName?: string | null;
    favourites: number; notifications: number; createdAt: string;
  }[];
};

const statusStyle: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-700",
};
const roleStyle: Record<string, string> = {
  ADMIN: "bg-primary/10 text-primary",
  PUBLISHER: "bg-emerald-100 text-emerald-800",
  READER: "bg-black/5 text-black/60",
};

function Badge({ value, style }: { value: string; style: Record<string, string> }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${style[value] || "bg-black/5 text-black/60"}`}>
      {value}
    </span>
  );
}

export function AdminView() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const selfId = (session?.user as { id?: string } | undefined)?.id;
  const openReader = useApp((s) => s.openReader);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; title: string } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; body: string; run: () => void } | null>(null);

  const { data: q, isLoading } = useQuery({ queryKey: ["admin-queue"], queryFn: () => api<Queue>("/api/admin/queue") });
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: () => api<Cat[]>("/api/categories") });
  const { data: allMags } = useQuery({ queryKey: ["magazines", "admin-all"], queryFn: () => api<AdminMag[]>("/api/magazines?scope=all") });
  const { data: ov } = useQuery({ queryKey: ["admin-overview"], queryFn: () => api<Overview>("/api/admin/overview") });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-queue"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["magazines"] });
  };

  const review = useMutation({
    mutationFn: (b: { type: string; id: string; action: string; reason?: string }) => post("/api/admin/review", b),
    onSuccess: (_r, b) => {
      toast.success(
        b.action === "approve" ? "Publisher approved — their content is now live." : b.action === "reject" ? "Rejected with reason." : b.action === "feature" ? "Featured on the Magazines catalogue." : "Removed from featured."
      );
      invalidateAll();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMag = useMutation({
    mutationFn: (id: string) => del("/api/magazines/" + id),
    onSuccess: () => { toast.success("Magazine and all its editions deleted."); invalidateAll(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const deleteEd = useMutation({
    mutationFn: (id: string) => del("/api/editions/" + id),
    onSuccess: () => { toast.success("Edition deleted."); invalidateAll(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const setRole = useMutation({
    mutationFn: (b: { id: string; role: string }) => patch("/api/admin/users/" + b.id, { role: b.role }),
    onSuccess: () => { toast.success("Account role updated."); invalidateAll(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const deleteAccount = useMutation({
    mutationFn: (id: string) => del("/api/admin/users/" + id),
    onSuccess: () => { toast.success("Account deleted with all its content."); invalidateAll(); },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;

  const stats = q?.stats;

  return (
    <div className="space-y-6">
      <SectionTitle sub="Approve publishers, curate the catalogue and tune the platform">Admin console</SectionTitle>

      {/* stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: "Publishers", value: stats.publishers, icon: Users },
            { label: "Magazines", value: stats.magazines, icon: BookOpen },
            { label: "Editions", value: stats.editions, icon: Layers },
            { label: "Registered readers", value: stats.readers, icon: Users },
            { label: "All accounts", value: stats.users, icon: ShieldCheck },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/85 p-4 ring-1 ring-black/5">
              <s.icon className="h-4 w-4 text-primary" />
              <p className="mt-1 text-2xl font-extrabold text-black">{s.value}</p>
              <p className="text-xs text-black/55">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="approvals">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="approvals" className="gap-1.5">
            Approvals {q && q.publishers.length > 0 ? `(${q.publishers.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="publishers">All publishers</TabsTrigger>
          <TabsTrigger value="magazines">Magazines</TabsTrigger>
          <TabsTrigger value="editions">Editions</TabsTrigger>
          <TabsTrigger value="readers">Readers</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="design" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Design</TabsTrigger>
          <TabsTrigger value="pages">Legal pages</TabsTrigger>
        </TabsList>

        {/* ------- approvals: pending publishers ------- */}
        <TabsContent value="approvals" className="space-y-4">
          <p className="text-sm text-black/55">
            Approved publishers publish magazines and editions instantly — only publisher registrations need review.
          </p>
          <section>
            <h3 className="mb-2 font-bold text-black">Publisher registrations</h3>
            {!q || q.publishers.length === 0 ? (
              <p className="text-sm text-black/50">Nothing pending.</p>
            ) : (
              q.publishers.map((p) => (
                <div key={p.id} className="mb-2 flex items-center gap-3 rounded-2xl bg-white/85 p-4 ring-1 ring-black/5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10">
                    {p.logoImageId ? <img src={imgSrc(p.logoImageId)} alt="" className="h-full w-full object-contain" /> : <Users className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-black">{p.companyName}</p>
                    <p className="truncate text-xs text-black/55">{p.email} · {p.contactEmail}{p.about ? ` · ${p.about}` : ""}</p>
                  </div>
                  <Button size="sm" className="gap-1 bg-emerald-700 hover:bg-emerald-800" onClick={() => review.mutate({ type: "publisher", id: p.id, action: "approve" })}>
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-700" onClick={() => setRejectTarget({ id: p.id, title: p.companyName })}>
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              ))
            )}
          </section>
        </TabsContent>

        {/* ------- all publishers: full directory with approve / revoke ------- */}
        <TabsContent value="publishers" className="space-y-3">
          <p className="text-sm text-black/55">
            Every publisher on the platform. Revoking an approved publisher immediately hides all of their content.
          </p>
          {!ov || ov.publishers.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="No publishers yet" hint="Publishers register through the Sign in screen." />
          ) : (
            <ul className="space-y-2">
              {ov.publishers.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/85 p-3 ring-1 ring-black/5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10">
                    {p.logoImageId ? <img src={imgSrc(p.logoImageId)} alt="" className="h-full w-full object-contain" /> : <Users className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-black">{p.companyName}</p>
                      <Badge value={p.status} style={statusStyle} />
                    </div>
                    <p className="truncate text-xs text-black/50">
                      {p.email} · {p.contactEmail} · {p.magazines} magazine{p.magazines === 1 ? "" : "s"} · registered {fmtDate(p.createdAt)}
                      {p.status === "REJECTED" && p.rejectionReason ? ` · reason: ${p.rejectionReason}` : ""}
                    </p>
                  </div>
                  {p.status !== "APPROVED" && (
                    <Button size="sm" className="gap-1 bg-emerald-700 hover:bg-emerald-800" onClick={() => review.mutate({ type: "publisher", id: p.id, action: "approve" })}>
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-red-700"
                    onClick={() => setRejectTarget({ id: p.id, title: p.companyName })}
                  >
                    <X className="h-4 w-4" /> {p.status === "APPROVED" ? "Revoke" : "Reject"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ------- magazines: feature management (all publishers) ------- */}
        <TabsContent value="magazines">
          {!allMags || allMags.length === 0 ? (
            <EmptyState icon={<Star className="h-6 w-6" />} title="No magazines yet" hint="Magazines appear here as soon as approved publishers create them." />
          ) : (
            <ul className="space-y-2">
              {allMags.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-white/85 p-3 ring-1 ring-black/5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted/60 ring-1 ring-black/10">
                    <img src={imgSrc(m.logoImageId, "/icons/icon-192.png")} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-black">{m.name}</p>
                    <p className="truncate text-xs text-black/50">
                      {m.publisher?.companyName || "Unknown publisher"}
                      {m.editionsCount !== undefined ? ` · ${m.editionsCount} edition${m.editionsCount === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={m.featured ? "default" : "outline"}
                    className="gap-1.5"
                    onClick={() => review.mutate({ type: "magazine", id: m.id, action: m.featured ? "unfeature" : "feature" })}
                  >
                    <Star className={`h-4 w-4 ${m.featured ? "fill-current" : ""}`} /> {m.featured ? "Featured" : "Feature"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-black/40 hover:text-red-600"
                    aria-label={`Delete ${m.name}`}
                    onClick={() =>
                      setConfirm({
                        title: `Delete “${m.name}”?`,
                        body: "This permanently removes the magazine and every edition in it. Readers lose access immediately.",
                        run: () => deleteMag.mutate(m.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ------- all live editions ------- */}
        <TabsContent value="editions" className="space-y-3">
          <p className="text-sm text-black/55">Every edition across the platform. “Hidden” means the publisher is not currently approved.</p>
          {!ov || ov.editions.length === 0 ? (
            <EmptyState icon={<Layers className="h-6 w-6" />} title="No editions yet" hint="Editions appear here the moment a publisher publishes one." />
          ) : (
            <ul className="space-y-2">
              {ov.editions.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/85 p-3 ring-1 ring-black/5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted/60 ring-1 ring-black/10">
                    <img src={imgSrc(e.thumbnailImageId, "/icons/icon-192.png")} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-black">{e.title}</p>
                      <Badge value={e.publisher.status === "APPROVED" ? "LIVE" : "HIDDEN"} style={{ LIVE: "bg-emerald-100 text-emerald-800", HIDDEN: "bg-amber-100 text-amber-800" }} />
                    </div>
                    <p className="truncate text-xs text-black/50">
                      {e.magazine.name} · {e.publisher.companyName}
                      {e.issueNumber ? ` · issue ${e.issueNumber}` : ""} · published {fmtDate(e.publishedAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => openReader({ url: e.flipbookUrl, title: e.title, magazine: e.magazine.name })}
                  >
                    <Eye className="h-4 w-4" /> Open
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-black/40 hover:text-red-600"
                    aria-label={`Delete ${e.title}`}
                    onClick={() =>
                      setConfirm({
                        title: `Delete edition “${e.title}”?`,
                        body: "This permanently removes the edition from the magazine and from every reader's feed.",
                        run: () => deleteEd.mutate(e.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ------- registered readers ------- */}
        <TabsContent value="readers">
          {!ov || ov.readers.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="No registered readers yet" hint="Readers appear here as soon as they create accounts." />
          ) : (
            <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white/85 ring-1 ring-black/5">
              {ov.readers.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">
                    {(r.name || "R").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-black">{r.name}</p>
                    <p className="truncate text-xs text-black/50">{r.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-black/45">{r.favourites} saved</span>
                  <span className="hidden shrink-0 text-xs text-black/45 sm:block">joined {fmtDate(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ------- all accounts ------- */}
        <TabsContent value="accounts" className="space-y-3">
          <p className="text-sm text-black/55">
            Every account on the platform. Changing a role takes effect on the person's next sign-in. Deleting an account removes their publisher profile, magazines, editions and favourites.
          </p>
          {!ov || ov.accounts.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="No accounts yet" />
          ) : (
            <ul className="space-y-2">
              {ov.accounts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/85 p-3 ring-1 ring-black/5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-bold uppercase">
                    {(a.name || "U").slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-black">{a.name}</p>
                      <Badge value={a.role} style={roleStyle} />
                    </div>
                    <p className="truncate text-xs text-black/50">
                      {a.email}
                      {a.companyName ? ` · ${a.companyName}` : ""} · {a.favourites} saved · joined {fmtDate(a.createdAt)}
                    </p>
                  </div>
                  <Select
                    value={a.role}
                    onValueChange={(v) => setRole.mutate({ id: a.id, role: v })}
                    disabled={a.id === selfId}
                  >
                    <SelectTrigger className="h-8 w-[120px] bg-white" aria-label={`Role for ${a.name}`}>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {["READER", "PUBLISHER", "ADMIN"].map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-black/40 hover:text-red-600"
                    aria-label={`Delete account ${a.name}`}
                    disabled={a.id === selfId}
                    onClick={() =>
                      setConfirm({
                        title: `Delete ${a.name}'s account?`,
                        body: a.role === "PUBLISHER"
                          ? "This permanently removes the account and everything published under it: the publisher profile, all magazines and all editions."
                          : "This permanently removes the account, their saved magazines and their notifications.",
                        run: () => deleteAccount.mutate(a.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* ------- categories ------- */}
        <TabsContent value="categories">
          <CategoriesAdmin cats={cats || []} />
        </TabsContent>

        {/* ------- design console ------- */}
        <TabsContent value="design">
          <DesignConsole />
        </TabsContent>

        {/* ------- legal pages ------- */}
        <TabsContent value="pages">
          <PagesAdmin />
        </TabsContent>
      </Tabs>

      <RejectDialog target={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={(reason) => review.mutate({ type: "publisher", id: rejectTarget!.id, action: "reject", reason })} />
      <ConfirmDialog target={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function ConfirmDialog({
  target, onClose,
}: {
  target: { title: string; body: string; run: () => void } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target?.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-black/65">{target?.body}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => { target?.run(); onClose(); }}>
            Yes, delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  target, onClose, onConfirm,
}: { target: { id: string; title: string } | null; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) { setReason(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject “{target?.title}”</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Reason sent to the publisher</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. We could not verify your publication details." className="bg-white" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 3}
            onClick={() => { onConfirm(reason.trim()); setReason(""); onClose(); }}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesAdmin({ cats }: { cats: Cat[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const add = useMutation({
    mutationFn: () => post("/api/categories", { name }),
    onSuccess: () => { toast.success("Category added."); setName(""); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const rename = useMutation({
    mutationFn: (b: { id: string; name: string }) => patch("/api/categories/" + b.id, { name: b.name }),
    onSuccess: () => { toast.success("Category renamed."); setEditing(null); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del("/api/categories/" + id),
    onSuccess: () => { toast.success("Category deleted."); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" className="bg-white" aria-label="New category name" />
        <Button className="gap-1.5" onClick={() => name.trim() && add.mutate()} disabled={add.isPending}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl bg-white/85 ring-1 ring-black/5">
        {cats.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
            {editing?.id === c.id ? (
              <>
                <Input value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} className="h-8 bg-white" aria-label="Category name" />
                <Button size="sm" onClick={() => rename.mutate({ id: c.id, name: editing.name })}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium text-black">{c.name}</span>
                <span className="text-xs text-black/45">{c.magazines} magazine{c.magazines === 1 ? "" : "s"}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing({ id: c.id, name: c.name })} aria-label={`Rename ${c.name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-black/40 hover:text-red-600" onClick={() => remove.mutate(c.id)} aria-label={`Delete ${c.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </li>
        ))}
        {cats.length === 0 && <li className="px-4 py-6 text-sm text-black/50">No categories yet.</li>}
      </ul>
    </div>
  );
}

function PagesAdmin() {
  const { data: terms } = useQuery({ queryKey: ["page", "terms"], queryFn: () => api<PageRow>("/api/pages/terms") });
  const { data: privacy } = useQuery({ queryKey: ["page", "privacy"], queryFn: () => api<PageRow>("/api/pages/privacy") });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PageEditor slug="terms" label="Terms and Conditions" row={terms} />
      <PageEditor slug="privacy" label="Privacy Policy" row={privacy} />
    </div>
  );
}

function PageEditor({ slug, label, row }: { slug: string; label: string; row?: PageRow }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const t = title ?? row?.title ?? "";
  const c = content ?? row?.content ?? "";
  const save = useMutation({
    mutationFn: () => put("/api/admin/pages", { slug, title: t, content: c }),
    onSuccess: () => {
      toast.success(`${label} saved.`);
      qc.invalidateQueries({ queryKey: ["page", slug] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-2 rounded-2xl bg-white/85 p-4 ring-1 ring-black/5">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <p className="font-bold text-black">{label}</p>
        {row ? <span className="ml-auto text-xs text-black/45">updated {fmtDate(row.updatedAt)}</span> : null}
      </div>
      <Input value={t} onChange={(e) => setTitle(e.target.value)} className="bg-white" aria-label={`${label} title`} />
      <Textarea value={c} onChange={(e) => setContent(e.target.value)} className="min-h-[220px] font-mono text-xs bg-white" aria-label={`${label} content`} />
      <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
    </div>
  );
}
