"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import { uploadImage } from "@/lib/api";
import { withBusy } from "@/lib/busy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Uploads an image to /api/images and reports the new image id.
 *  Enforces the 2MB limit client-side. */
export function UploadButton({
  kind,
  label = "Upload image",
  accept = "image/png,image/jpeg,image/webp",
  onUploaded,
  className,
  variant = "outline",
}: {
  kind: string;
  label?: string;
  accept?: string;
  onUploaded: (r: { id: string; url: string }) => void;
  className?: string;
  variant?: "outline" | "default" | "secondary";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("That image is over 2 MB — please choose a smaller file.");
      return;
    }
    setBusy(true);
    try {
      const r = await withBusy("Uploading image…", () => uploadImage(file, kind));
      onUploaded({ id: r.id, url: r.url });
      toast.success("Image uploaded.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
        aria-hidden
      />
      <Button type="button" variant={variant} className={cn("gap-2", className)} onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {busy ? "Uploading…" : label}
      </Button>
    </>
  );
}
