"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2, Plus, Trash2, BookOpen, Layers, LogIn, Pencil, GripVertical, ImagePlus, Globe,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, post, patch, del } from "@/lib/api";
import { withBusy } from "@/lib/busy";
import { useApp } from "@/lib/store";
import { useSession } from "next-auth/react";
import { imgSrc, StatusBadge, SectionTitle, EmptyState, fmtDate } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UploadButton } from "@/components/upload-button";
import { cn } from "@/lib/utils";

type Cat = { id: string; name: string };
type MyMag = {
  id: string; name: string; description?: string | null; logoImageId: string; frequency?: string | null;
  category?: { id: string; name: string } | null; editionsCount: number; readers: number;
};
type Me = {
  id: string; companyName: string; contactEmail: string; about?: string | null; logoImageId?: string | null;
  status: string; rejectionReason?: string | null;
  magazines: MyMag[];
};
type MyEdition = {
  id: string; title: string; issueNumber?: string | null; thumbnailImageId: string;
  flipbookUrl: string; sortOrder: number; publishedAt?: string | null;
};

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
        hint="Create a publisher account to register your company or publication, then publish magazines and editions that go live immediately."
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

      {/* magazines — logo tiles + actions */}
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
          <p className="mb-3 text-sm text-black/55">Magazine publishing unlocks once your publisher registration is approved.</p>
        ) : null}

        {me.magazines.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title="No magazines yet"
            hint="Create your first magazine: add the brand logo, a short description, category and publishing frequency."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {me.magazines.map((m) => (
              <div key={m.id} className="rounded-2xl bg-white/85 p-4 ring-1 ring-black/5">
                <div className="flex items-center gap-3">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted/60 ring-1 ring-black/10">
                    <img src={imgSrc(m.logoImageId, "/icons/icon-192.png")} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-black">{m.name}</p>
                    <p className="truncate text-xs text-black/50">
                      {m.category?.name || "No category"}
                      {m.frequency ? ` · ${m.frequency}` : ""}
                      {` · ${m.editionsCount} edition${m.editionsCount === 1 ? "" : "s"}`}
                    </p>
                    <p className="truncate text-xs text-black/40">{m.readers} reader{m.readers === 1 ? "" : "s"} saved</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1.5" onClick={() => setEditionsMag(m)}>
                    <Layers className="h-3.5 w-3.5" /> Editions
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditMag(m)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-black/40 hover:text-red-600" onClick={() => setDeleteMag(m)} aria-label={`Delete ${m.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editCompany && <CompanyDialog me={me} onClose={() => setEditCompany(false)} onSaved={invalidate} />}
      {editMag && (
        <MagazineDialog
          cats={cats || []}
          mag={editMag === "new" ? null : editMag}
          approved={me.status === "APPROVED"}
          onClose={() => setEditMag(null)}
          onSaved={invalidate}
        />
      )}
      {editionsMag && (
        <EditionsManager mag={editionsMag} onClose={() => setEditionsMag(null)} onChanged={invalidate} />
      )}
      <AlertDialog open={!!deleteMag} onOpenChange={(v) => !v && setDeleteMag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteMag?.name}”?</AlertDialogTitle>
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
                  await withBusy("Deleting magazine…", () => del(`/api/magazines/${deleteMag.id}`));
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

/* ---------------- company profile ---------------- */

function CompanyDialog({ me, onClose, onSaved }: { me: Me; onClose: () => void; onSaved: () => void }) {
  const [companyName, setCompanyName] = useState(me.companyName);
  const [contactEmail, setContactEmail] = useState(me.contactEmail);
  const [about, setAbout] = useState(me.about || "");
  const [logoId, setLogoId] = useState(me.logoImageId || "");
  const mut = useMutation({
    mutationFn: () => withBusy("Saving…", () => patch("/api/publishers/me", { companyName, contactEmail, about, logoImageId: logoId || null })),
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
              <UploadButton kind="company-logo" accept="image/png" label={logoId ? "Replace logo" : "Upload logo"} onUploaded={(r) => setLogoId(r.id)} />
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

/* ---------------- magazine (brand) dialog ---------------- */

function MagazineDialog({
  cats, mag, approved, onClose, onSaved,
}: { cats: Cat[]; mag: MyMag | null; approved: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(mag?.name || "");
  const [description, setDescription] = useState(mag?.description || "");
  const [categoryId, setCategoryId] = useState(mag?.category?.id || "");
  const [frequency, setFrequency] = useState(mag?.frequency || "");
  const [logoId, setLogoId] = useState(mag?.logoImageId || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await withBusy(mag ? "Saving magazine…" : "Creating magazine…", async () => {
        if (mag) {
          await patch(`/api/magazines/${mag.id}`, { name, description, categoryId: categoryId || null, frequency, logoImageId: logoId });
          toast.success("Magazine saved.");
        } else {
          await post("/api/magazines", { name, description, categoryId: categoryId || null, frequency, logoImageId: logoId });
          toast.success(
            approved
              ? "Magazine published — it is live on the newsstand. Open Editions to add the first issue."
              : "Magazine created. It goes live once your publisher account is approved."
          );
        }
        onSaved();
        onClose();
      });
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
        <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
          <div className="space-y-2">
            <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted/60 ring-1 ring-black/10">
              {logoId ? (
                <img src={imgSrc(logoId)} alt="magazine logo" className="h-full w-full object-contain" />
              ) : (
                <div className="grid h-full place-items-center text-xs text-black/40">Logo preview</div>
              )}
            </div>
            <UploadButton kind="magazine-logo" accept="image/png" label={logoId ? "Replace logo" : "Upload logo"} className="w-full" onUploaded={(r) => setLogoId(r.id)} />
            <p className="text-[11px] leading-tight text-black/45">The brand readers will recognise. Transparent PNG works best, max 2 MB.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. African Business Review" className="bg-white" />
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
            <p className="text-xs text-black/45">
              <Globe className="mr-1 inline h-3 w-3" />
              Editions (with their flipbook links) are added on the Editions screen.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || !name || !logoId}>
            {busy ? "Saving…" : mag ? "Save" : "Create magazine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- editions manager (drag to reorder) ---------------- */

function EditionsManager({ mag, onClose, onChanged }: { mag: MyMag; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editEd, setEditEd] = useState<MyEdition | null>(null);
  const [deleteEd, setDeleteEd] = useState<MyEdition | null>(null);
  const [reordering, setReordering] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["editions", mag.id],
    queryFn: () => api<MyEdition[]>(`/api/magazines/${mag.id}/editions`),
  });

  // server order, or the dragged order while the reorder request is in flight
  const items: MyEdition[] = useMemo(() => {
    if (!data) return [];
    if (!localOrder) return data;
    const byId = new Map(data.map((e) => [e.id, e]));
    return localOrder.map((id) => byId.get(id)).filter((x): x is MyEdition => !!x);
  }, [data, localOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reorder = useMutation({
    mutationFn: (order: string[]) => withBusy("Saving order…", () => patch(`/api/magazines/${mag.id}/editions`, { order })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["editions", mag.id] });
      onChanged();
    },
    onError: (e) => {
      toast.error((e as Error).message);
      setLocalOrder(null); // revert to server order on failure
    },
    onSettled: () => setReordering(false),
  });

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((x) => x.id === active.id);
    const newIndex = items.findIndex((x) => x.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setLocalOrder(next.map((x) => x.id));
    setReordering(true);
    reorder.mutate(next.map((x) => x.id));
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editions — {mag.name}</DialogTitle>
        </DialogHeader>

        <p className="-mt-1 text-xs text-black/50">
          Drag the handle to set the order readers see. New editions publish instantly and readers who saved this magazine are notified.
        </p>

        <div className="space-y-2">
          {isLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          ) : items.length === 0 ? (
            <p className="rounded-xl bg-muted/60 px-4 py-6 text-center text-sm text-black/50">No editions yet — add the first one.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={items.map((x) => x.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {items.map((ed) => (
                    <SortableEditionRow
                      key={ed.id}
                      ed={ed}
                      busy={reordering}
                      onEdit={() => setEditEd(ed)}
                      onDelete={() => setDeleteEd(ed)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <Button onClick={() => setAddOpen(true)} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Add a new edition
        </Button>
      </DialogContent>

      {addOpen && (
        <EditionDialog
          magId={mag.id}
          edition={null}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["editions", mag.id] });
            onChanged();
            setAddOpen(false);
          }}
        />
      )}
      {editEd && (
        <EditionDialog
          magId={mag.id}
          edition={editEd}
          onClose={() => setEditEd(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["editions", mag.id] });
            onChanged();
            setEditEd(null);
          }}
        />
      )}
      <AlertDialog open={!!deleteEd} onOpenChange={(v) => !v && setDeleteEd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteEd?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>Readers will no longer see this edition. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!deleteEd) return;
                try {
                  await withBusy("Deleting edition…", () => del(`/api/editions/${deleteEd.id}`));
                  toast.success("Edition deleted.");
                  qc.invalidateQueries({ queryKey: ["editions", mag.id] });
                  onChanged();
                } catch (e) {
                  toast.error((e as Error).message);
                }
                setDeleteEd(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function SortableEditionRow({
  ed, busy, onEdit, onDelete,
}: { ed: MyEdition; busy: boolean; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ed.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/10",
        isDragging && "z-10 shadow-lg ring-primary/40",
        busy && "opacity-80"
      )}
    >
      <button
        className="cursor-grab touch-none text-black/35 hover:text-black/70 active:cursor-grabbing"
        aria-label={`Reorder ${ed.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4.5 w-4.5" />
      </button>
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-black/10">
        <img src={imgSrc(ed.thumbnailImageId, "/icons/icon-192.png")} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-black">
          {ed.title}
          {ed.issueNumber ? <span className="font-normal text-black/45"> · {ed.issueNumber}</span> : null}
        </p>
        <p className="text-xs text-black/50">Published {fmtDate(ed.publishedAt)}</p>
      </div>
      <Button size="sm" variant="outline" className="gap-1" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-black/40 hover:text-red-600" onClick={onDelete} aria-label={`Delete ${ed.title}`}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

/* ---------------- the edition dialog (crucial screen) ---------------- */

function EditionDialog({
  magId, edition, onClose, onSaved,
}: { magId: string; edition: MyEdition | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(edition?.title || "");
  const [issue, setIssue] = useState(edition?.issueNumber || "");
  const [url, setUrl] = useState(edition?.flipbookUrl || "");
  const [thumbId, setThumbId] = useState(edition?.thumbnailImageId || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await withBusy(edition ? "Saving edition…" : "Publishing edition…", async () => {
        if (edition) {
          await patch(`/api/editions/${edition.id}`, { title, issueNumber: issue, flipbookUrl: url, thumbnailImageId: thumbId });
          toast.success("Edition updated.");
        } else {
          await post(`/api/magazines/${magId}/editions`, { title, issueNumber: issue, flipbookUrl: url, thumbnailImageId: thumbId });
          toast.success("Edition published — readers who saved this magazine were notified.");
        }
        onSaved();
        onClose();
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{edition ? "Edit edition" : "New edition"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
          {/* thumbnail */}
          <div className="space-y-2">
            <div className="w-full overflow-hidden rounded-xl bg-muted/60 ring-1 ring-black/10">
              {thumbId ? (
                <img src={imgSrc(thumbId)} alt="edition thumbnail" className="h-auto w-full object-cover" />
              ) : (
                <div className="grid aspect-[3/4] place-items-center text-xs text-black/40">Thumbnail preview</div>
              )}
            </div>
            <UploadButton kind="edition" label={thumbId ? "Replace thumbnail" : "Upload thumbnail"} className="w-full" onUploaded={(r) => setThumbId(r.id)} />
            <p className="text-[11px] leading-tight text-black/45">The cover image readers see first — any shape works, shown full-width.</p>
          </div>

          {/* fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Edition title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. November Edition"
                className="bg-white"
                aria-label="Edition title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Issue number</Label>
              <Input
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="e.g. 2026-11 or No. 24"
                className="bg-white"
                aria-label="Issue number"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Flipbook URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://… (link to the page-turn edition)"
                className="bg-white"
                aria-label="Edition flipbook URL"
                type="url"
              />
              <p className="text-[11px] leading-tight text-black/45">Opens full-screen in the built-in reader.</p>
            </div>
            <div className="rounded-xl bg-primary/5 px-3 py-2.5 text-xs text-black/60 ring-1 ring-inset ring-primary/15">
              <ImagePlus className="mr-1 inline h-3.5 w-3.5 text-primary" />
              {edition
                ? "Saving updates the edition everywhere it appears."
                : "On save, the edition goes live immediately and saved readers get an alert."}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || !title.trim() || !url.trim() || !thumbId}>
            {busy ? "Saving…" : edition ? "Save" : "Publish edition"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
