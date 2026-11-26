"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Palette, Type, Image as ImageIcon, MonitorSmartphone } from "lucide-react";
import { api, put } from "@/lib/api";
import { useLiveSettings } from "@/components/use-live-settings";
import { UploadButton } from "@/components/upload-button";
import { imgSrc } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { SettingsKey } from "@/lib/settingsClient";

export function DesignConsole() {
  const settings = useLiveSettings();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: (b: Partial<Record<SettingsKey, string>>) => put("/api/settings", b),
    onSuccess: (s) => {
      qc.setQueryData(["settings"], s);
      toast.success("Design updated — everyone sees it on their next visit.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!settings) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* brand + font */}
      <Card title="Brand & typography" icon={<Type className="h-4 w-4" />}>
        <Field label="App name">
          <Input defaultValue={settings.app_name} onBlur={(e) => save.mutate({ app_name: e.target.value })} className="bg-white" />
        </Field>
        <Field label="Font">
          <Select value={settings.font_family} onValueChange={(v) => save.mutate({ font_family: v })}>
            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inter">Inter (default)</SelectItem>
              <SelectItem value="poppins">Poppins</SelectItem>
              <SelectItem value="merriweather">Merriweather (serif)</SelectItem>
              <SelectItem value="system">System default</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Primary color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.primary_color}
              onChange={(e) => save.mutate({ primary_color: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded-md border border-black/10 bg-white p-1"
              aria-label="Primary color"
            />
            <Input defaultValue={settings.primary_color} onBlur={(e) => save.mutate({ primary_color: e.target.value })} className="bg-white font-mono" />
          </div>
        </Field>
        <Field label="App icon (PWA install icon)">
          <div className="flex items-center gap-3">
            <UploadButton kind="icon" label={settings.app_icon_id ? "Replace icon" : "Upload icon"} onUploaded={(r) => save.mutate({ app_icon_id: r.id })} />
            <img src={imgSrc(settings.app_icon_id, "/icons/icon-192.png")} alt="app icon" className="h-10 w-10 rounded-lg ring-1 ring-black/10" />
          </div>
          <p className="mt-1 text-[11px] text-black/45">Square PNG 512×512 recommended. Reinstalled devices pick it up instantly; installed apps may need to be re-added.</p>
        </Field>
      </Card>

      {/* splash */}
      <Card title="Splash screen" icon={<Palette className="h-4 w-4" />}>
        <Field label="Splash background color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.splash_bg_color}
              onChange={(e) => save.mutate({ splash_bg_color: e.target.value })}
              className="h-9 w-14 cursor-pointer rounded-md border border-black/10 bg-white p-1"
              aria-label="Splash background color"
            />
            <Input defaultValue={settings.splash_bg_color} onBlur={(e) => save.mutate({ splash_bg_color: e.target.value })} className="bg-white font-mono" />
          </div>
        </Field>
        <Field label="Splash logo">
          <div className="flex items-center gap-3">
            <UploadButton kind="logo" accept="image/png" label={settings.splash_logo_id ? "Replace logo" : "Upload logo (transparent PNG)"} onUploaded={(r) => save.mutate({ splash_logo_id: r.id })} />
            {settings.splash_logo_id ? <img src={imgSrc(settings.splash_logo_id)} alt="splash logo" className="h-10 w-10 object-contain" /> : <span className="text-xs text-black/45">Using built-in mark</span>}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Logo size">
            <Select value={settings.splash_logo_size} onValueChange={(v) => save.mutate({ splash_logo_size: v })}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Logo position">
            <Select value={settings.splash_logo_position} onValueChange={(v) => save.mutate({ splash_logo_position: v })}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Card>

      {/* header logo */}
      <Card title="Header logo" icon={<ImageIcon className="h-4 w-4" />}>
        <Field label="Header logo (transparent PNG)">
          <div className="flex items-center gap-3">
            <UploadButton kind="logo" accept="image/png" label={settings.header_logo_id ? "Replace logo" : "Upload logo"} onUploaded={(r) => save.mutate({ header_logo_id: r.id })} />
            <div className="glass rounded-lg px-3 py-1.5 ring-1 ring-black/5">
              <img src={imgSrc(settings.header_logo_id, "/icons/logo-mark.png")} alt="header logo" className="object-contain" style={{ height: settings.header_logo_size === "small" ? 18 : settings.header_logo_size === "large" ? 32 : 24 }} />
            </div>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Size">
            <Select value={settings.header_logo_size} onValueChange={(v) => save.mutate({ header_logo_size: v })}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Position">
            <Select value={settings.header_logo_position} onValueChange={(v) => save.mutate({ header_logo_position: v })}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Card>

      {/* background */}
      <Card title="App background" icon={<MonitorSmartphone className="h-4 w-4" />}>
        <Field label="Background image (subtle textures work best)">
          <div className="flex items-center gap-3">
            <UploadButton kind="background" label={settings.background_image_id ? "Replace image" : "Upload image"} onUploaded={(r) => save.mutate({ background_image_id: r.id })} />
            {settings.background_image_id ? (
              <>
                <img src={imgSrc(settings.background_image_id)} alt="background" className="h-10 w-16 rounded object-cover ring-1 ring-black/10" />
                <Button size="sm" variant="ghost" className="text-red-700" onClick={() => save.mutate({ background_image_id: "" })}>Remove</Button>
              </>
            ) : (
              <span className="text-xs text-black/45">None set</span>
            )}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Size">
            <Select value={settings.background_size} onValueChange={(v) => save.mutate({ background_size: v })}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Position">
            <Select value={settings.background_position} onValueChange={(v) => save.mutate({ background_position: v })}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label={`Opacity — ${Math.round(Number(settings.background_opacity) * 100)}%`}>
          <Slider
            value={[Number(settings.background_opacity) * 100]}
            min={0}
            max={100}
            step={5}
            onValueCommit={(v) => save.mutate({ background_opacity: String(v[0] / 100) })}
            aria-label="Background opacity"
          />
        </Field>
        <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-black">Parallax</p>
            <p className="text-xs text-black/50">Background stays fixed while content scrolls (desktop effect).</p>
          </div>
          <Switch checked={settings.background_parallax === "on"} onCheckedChange={(v) => save.mutate({ background_parallax: v ? "on" : "off" })} aria-label="Parallax" />
        </div>
      </Card>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-3xl bg-white/85 p-5 ring-1 ring-black/5">
      <p className="flex items-center gap-2 font-bold text-black">{icon}{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-black/60">{label}</Label>
      {children}
    </div>
  );
}
