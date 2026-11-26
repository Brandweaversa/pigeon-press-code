"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Send, Trash2, BookOpen, Clock3, Layers, LogIn, Pencil } from "lucide-react";
import { api, post, patch, del } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useSession } from "next-auth/react";
import { imgSrc, StatusBadge, SectionTitle, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UploadButton } from "@/components/upload-button";

type Cat = { id: string; name: string };
type MyMag = {
  id: string; title: string; description?: string | null; status: string; featured: boolean;
  rejectionReason?: string | null; coverImageId: string; flipbookUrl: string; frequency?: string | null;
  category?: { id: string; name: string } | null; editionsCount: number; readers: number;
};
type Me = {
  id: string; companyName: string; contactEmail: string; about?: string | null; logoImageId?: string | null;
  status: string; rejectionReason?: string | null;
  magazines: MyMag[];
};
type Edition = { id: string; title: string; issueNumber?: string | null; status: string; publishedAt?: string | null; rejectionReason?: string | null };

export function PublisherView() {
  const { data: session } = useSession();
  const push = useApp((s) => s.push);
  const qc = useQueryClient();
  const [editMag, setEditMag] = useState<MyMag | "new" | null>(null);
  const [editionsMag, setEditionsMag] = useState<MyMag | null>(null);
  const [deleteMag, setDeleteMag] = useState<MyMag | null>(null);
  const [editCompany, setEditCompany] = useState(false);

  const enabled = !!session?.user && (session.user as { role?: string }).role === "PUBLISHER";

  const { data: me, isLoading } = useQuery({
    queryKey: ["publisher-me"],
    queryFn: () => api<Me | null>("/api/publishers/me"),
    enabled,
  });
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: () => api<Cat[]>("/api/categories") });

  if (!enabled) {
    return (
      <EmptyState
        icon={<LogIn className="h-6 w-6" />}
        title="Publishers sign in here"
        hint="Create a publisher account to register your company or publication, upload covers and submit editions for approval."
        action={<Button onClick={() => push({ name: "auth" })}>Sign in / register</Button>}
      />
    );
  }
  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  if (!me) {
    return (
      <EmptyState
        icon={<Building2 className="h-6 w-6" />}
        title="No publisher profile yet"
        hint="Register a company or publication first — your account can hold as many magazines as you like."
        action={<Button onClick={() => push({ name: "auth" })}>Register as publisher</Button>}
      />
    );
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["publisher-me"] });
    qc.invalidateQueries({ queryKey: ["magazines"] });
  };

  return (
    <div className="space-y-6">
      {/* company card */}
      <div className="rounded-3xl bg-white/85 p-5 ring-1 ring-black/5">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 ring-1 ring-black/5">
            {me.logoImageId ? (
              <img src={imgSrc(me.logoImageId)} alt="logo" className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-black">{me.companyName}</h2>
              <StatusBadge status={me.status} />
            </div>
            <p className="text-sm text-black/55">{me.contactEmail}</p>
            {me.about ? <p className="mt-1 text-sm text-black/65">{me.about}</p> : null}
            {me.status === "PENDING" && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20">
                Your registration is awaiting platform approval. You will get an alert as soon as it is reviewed.
              </p>
            )}
            {me.status === "REJECTED" && me.rejectionReason && (
              <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900 ring-1 ring-inset ring-red-600/20">
                Registration was not approved: {me.rejectionReason}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditCompany(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>
      </div>

      {/* magazines */}
      <section>
        <div className="flex items-center justify-between">
          <SectionTitle sub={`${me.magazines.length} magazine${me.magazines.length === 1 ? "" : "s"} on your shelf`}>My magazines</SectionTitle>
          <Button
            onClick={() => setEditMag("new")}
            disabled={me.status !== "APPROVED"}
            className="gap-2"
            title={me.status !== "APPROVED" ? "Available once your publisher account is approved" : "Create a magazine"}
          >
            <Plus className="h-4 w-4" /> New magazine
          </Button>
        </div>

        {me.status !== "APPROVED" ? (
          <p className="mb-3 text-sm text-black/55">Magazine creation unlocks once your publisher registration is approved.</p>
        ) : null}

        {me.magazines.length === 0 ? (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No magazines yet" hint="Create your first magazine: upload the cover, add the flipbook link and submit for approval." />
        ) : (
          <ul className="space-y-3">
            {me.magazines.map((m) => (
              <li key={m.id} className="rounded-2xl bg-white/85 p-4 ring-1 ring-black/5">
                <div className="flex items-start gap-3">
                  <div className="a4 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10">
                    <img src={imgSrc(m.coverImageId, "/icons/icon-192.png")} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-black">{m.title}</p>
                      <StatusBadge status={m.status} />
                      {m.featured && <span className="text-xs font-semibold text-primary">★ Featured</span>}
                    </div>
                    <p className="truncate text-xs text-black/50">
                      {m.category?.name || "No category"} · {m.editionsCount} edition{m.editionsCount === 1 ? "" : "s"} · {m.readers} saved
                    </p>
                    {m.status === "REJECTED" && m.rejectionReason ? (
                      <p className="mt-1 text-xs text-red-700">Rejected: {m.rejectionReason}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditionsMag(m)}>
                        <Layers className="h-3.5 w-3.5" /> Editions
                      </Button>
                      {(m.status === "DRAFT" || m.status === "REJECTED") && (
                        <SubmitButton magId={m.id} onDone={invalidate} />
                      )}
                      <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setEditMag(m)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-black/40 hover:text-red-600" onClick={() => setDeleteMag(m)} aria-label={`Delete ${m.title}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editCompany && <CompanyDialog me={me} onClose={() => setEditCompany(false)} onSaved={invalidate} />}
      {editMag && (
        <MagazineDialog
          cats={cats || []}
          mag={editMag === "new" ? null : editMag}
          onClose={() => setEditMag(null)}
          onSaved={invalidate}
        />
      )}
      {editionsMag && (
        <EditionsDialog mag={editionsMag} onClose={() => setEditionsMag(null)} onChanged={invalidate} />
      )}
      <AlertDialog open={!!deleteMag} onOpenChange={(v) => !v && setDeleteMag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteMag?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the magazine and all its editions permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!deleteMag) return;
                try {
                  await del(`/api/magazines/${deleteMag.id}`);
                  toast.success("Magazine deleted.");
                  invalidate();
                } catch (e) {
                  toast.error((e as Error).message);
                }
                setDeleteMag(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SubmitButton({ magId, onDone }: { magId: string; onDone: () => void }) {
  const mut = useMutation({
    mutationFn: () => patch<{ status: string }>(`/api/magazines/${magId}`, { action: "submit" }),
    onSuccess: () => {
      toast.success("Submitted for approval — the platform team will review it.");
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Button size="sm" className="gap-1.5" onClick={() => mut.mutate()} disabled={mut.isPending}>
      <Send className="h-3.5 w-3.5" /> Submit for approval
    </Button>
  );
}

function CompanyDialog({ me, onClose, onSaved }: { me: Me; onClose: () => void; onSaved: () => void }) {
  const [companyName, setCompanyName] = useState(me.companyName);
  const [contactEmail, setContactEmail] = useState(me.contactEmail);
  const [about, setAbout] = useState(me.about || "");
  const [logoId, setLogoId] = useState(me.logoImageId || "");
  const mut = useMutation({
    mutationFn: () => patch("/api/publishers/me", { companyName, contactEmail, about, logoImageId: logoId || null }),
    onSuccess: () => {
      toast.success("Company profile saved.");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Company / publication profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact email</Label>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label>About</Label>
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} className="bg-white min-h-[80px]" />
          </div>
          <div className="space-y-1.5">
            <Label>Logo (transparent PNG, max 2 MB)</Label>
            <div className="flex items-center gap-3">
              <UploadButton kind="logo" accept="image/png" label={logoId ? "Replace logo" : "Upload logo"} onUploaded={(r) => setLogoId(r.id)} />
              {logoId ? <img src={imgSrc(logoId)} alt="logo" className="h-10 w-10 object-contain" /> : null}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MagazineDialog({
  cats, mag, onClose, onSaved,
}: { cats: Cat[]; mag: MyMag | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(mag?.title || "");
  const [description, setDescription] = useState(mag?.description || "");
  const [categoryId, setCategoryId] = useState(mag?.category?.id || "");
  const [flipbookUrl, setFlipbookUrl] = useState(mag?.flipbookUrl || "");
  const [frequency, setFrequency] = useState(mag?.frequency || "");
  const [coverId, setCoverId] = useState(mag?.coverImageId || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (mag) {
        await patch(`/api/magazines/${mag.id}`, { title, description, categoryId: categoryId || null, flipbookUrl, frequency, coverImageId: coverId });
        toast.success("Magazine saved and sent for review.");
      } else {
        await post("/api/magazines", { title, description, categoryId: categoryId || null, flipbookUrl, frequency, coverImageId: coverId });
        toast.success("Magazine created as a draft. Submit it for approval when ready.");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mag ? "Edit magazine" : "New magazine"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div className="space-y-2">
            <div className="a4 w-full overflow-hidden rounded-xl bg-muted ring-1 ring-black/10">
              {coverId ? (
                <img src={imgSrc(coverId)} alt="cover" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-xs text-black/40">A4 cover preview</div>
              )}
            </div>
            <UploadButton kind="cover" label={coverId ? "Replace cover" : "Upload cover"} className="w-full" onUploaded={(r) => setCoverId(r.id)} />
            <p className="text-[11px] leading-tight text-black/45">Portrait, close to A4 ratio (210×297). PNG/JPG/WebP, max 2 MB.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. African Business Review" className="bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is the magazine about?" className="bg-white min-h-[72px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={frequency || undefined} onValueChange={setFrequency}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {["Weekly", "Bi-Weekly", "Monthly", "Bi-Monthly", "Quarterly", "Annually"].map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Flipbook URL</Label>
              <Input value={flipbookUrl} onChange={(e) => setFlipbookUrl(e.target.value)} placeholder="https://… (link to the page-turn edition)" className="bg-white" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || !title || !coverId || !flipbookUrl}>
            {busy ? "Saving…" : mag ? "Save (re-enters review)" : "Create draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditionsDialog({ mag, onClose, onChanged }: { mag: MyMag; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [issue, setIssue] = useState("");
  const [url, setUrl] = useState("");
  const [coverId, setCoverId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: editions, isLoading } = useQuery({
    queryKey: ["editions", mag.id],
    queryFn: () => api<Edition[]>(`/api/magazines/${mag.id}/editions`),
  });

  const add = async () => {
    setBusy(true);
    try {
      await post(`/api/magazines/${mag.id}/editions`, { title, issueNumber: issue, flipbookUrl: url, coverImageId: coverId || null });
      toast.success("Edition submitted for approval.");
      setTitle(""); setIssue(""); setUrl(""); setCoverId("");
      qc.invalidateQueries({ queryKey: ["editions", mag.id] });
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editions — {mag.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {isLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          ) : (editions || []).length === 0 ? (
            <p className="text-sm text-black/50">No editions yet.</p>
          ) : (
            (editions || []).map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <Clock3 className="h-4 w-4 shrink-0 text-black/40" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-black">
                    {e.title} {e.issueNumber ? <span className="font-normal text-black/45">· {e.issueNumber}</span> : null}
                  </p>
                  <p className="text-xs text-black/50">
                    {e.status === "APPROVED" ? `Live · published ${e.publishedAt ? new Date(e.publishedAt).toLocaleDateString("en-ZA") : ""}` : e.status}
                  </p>
                  {e.status === "REJECTED" && e.rejectionReason ? <p className="text-xs text-red-700">Rejected: {e.rejectionReason}</p> : null}
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-sm font-semibold text-black">Add a new edition</p>
          <div className="grid grid-cols-2 gap-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Edition title (e.g. November Edition)" className="bg-white" aria-label="Edition title" />
            <Input value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Issue no. (e.g. 2026-11)" className="bg-white" aria-label="Issue number" />
          </div>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Flipbook URL for this edition (https://…)" className="bg-white" aria-label="Edition flipbook URL" />
          <div className="flex items-center gap-3">
            <UploadButton kind="edition" label={coverId ? "Replace cover" : "Edition cover (optional)"} onUploaded={(r) => setCoverId(r.id)} />
            {coverId ? <img src={imgSrc(coverId)} alt="edition cover" className="h-8 w-6 rounded object-cover" /> : null}
          </div>
          <Button onClick={add} disabled={busy || !title || !url} className="w-full gap-2">
            <Send className="h-4 w-4" /> {busy ? "Submitting…" : "Submit for approval"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
