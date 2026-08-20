import React, { useState, useEffect } from "react";
import { fetchAdminSettings, updateAdminSettings, WebsiteSettingsData } from "@/api/website";
import { useToast } from "@/hooks/use-toast";
import { Compass, Plus, Trash2, Save, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WebsiteNavigationBuilder() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WebsiteSettingsData | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await fetchAdminSettings();
      setSettings(data);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load navigation menus.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await updateAdminSettings(settings);
      setSettings(updated);
      toast({
        title: "Success",
        description: "Public header menu and footer links updated live.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save navigation menus.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const addHeaderItem = () => {
    const newItem = { label: "New Menu Link", href: "/new-page", children: [] };
    setSettings({ ...settings, headerMenu: [...(settings.headerMenu || []), newItem] });
  };

  const removeHeaderItem = (idx: number) => {
    const updated = settings.headerMenu.filter((_, i) => i !== idx);
    setSettings({ ...settings, headerMenu: updated });
  };

  const updateHeaderItem = (idx: number, field: string, val: any) => {
    const items = [...settings.headerMenu];
    items[idx] = { ...items[idx], [field]: val };
    setSettings({ ...settings, headerMenu: items });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-400" />
            Website Navigation Links Builder
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Build and organize navbar header links and footer menus for your public website.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Navigation
        </Button>
      </div>

      {/* Main Header Links Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-indigo-400" />
            Header Menu Items ({settings.headerMenu?.length || 0})
          </h4>
          <Button onClick={addHeaderItem} variant="outline" size="sm" className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Menu Item
          </Button>
        </div>

        <div className="space-y-3">
          {settings.headerMenu?.map((item: any, idx: number) => (
            <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Menu Title</label>
                  <Input
                    type="text"
                    value={item.label || ""}
                    onChange={(e) => updateHeaderItem(idx, "label", e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Page URL</label>
                  <Input
                    type="text"
                    value={item.href || ""}
                    onChange={(e) => updateHeaderItem(idx, "href", e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <button
                onClick={() => removeHeaderItem(idx)}
                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                title="Remove Link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
