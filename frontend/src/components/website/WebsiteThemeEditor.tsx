import React, { useState, useEffect } from "react";
import { fetchAdminSettings, updateAdminSettings, WebsiteSettingsData } from "@/api/website";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type, Code2, Sparkles, Check, Save, Loader2 } from "lucide-react";

const FONT_OPTIONS = [
  { label: "Inter (Modern Tech / Clean)", value: "Inter" },
  { label: "Outfit (Bold Display / Modern)", value: "Outfit" },
  { label: "Plus Jakarta Sans (Corporate / Premium)", value: "Plus Jakarta Sans" },
  { label: "Roboto (Versatile / Standard)", value: "Roboto" },
  { label: "Syne (Cinematic / Editorial)", value: "Syne" },
];

export function WebsiteThemeEditor() {
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
        description: err.message || "Failed to load theme settings.",
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
        description: "Global typography, colors, and site styling updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save theme settings.",
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

  const theme = settings.theme || {
    primaryFont: "Inter",
    headingFont: "Outfit",
    primaryColor: "#6366f1",
    accentColor: "#8b5cf6",
    mode: "dark",
    borderRadius: "12px",
    customCss: "",
    analyticsId: "",
    tagManagerId: "",
  };

  const updateThemeField = (field: string, value: any) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        theme: {
          ...prev.theme,
          [field]: value,
        },
      };
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Palette className="w-6 h-6 text-indigo-400" />
            Website Theme & Typography Controls
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Customize primary fonts, heading styles, brand colors, glassmorphism presets, and tracking codes.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Theme Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Typography Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Type className="w-5 h-5 text-purple-400" />
            Typography Controls
          </h3>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Primary Body Font Family
            </label>
            <select
              value={theme.primaryFont}
              onChange={(e) => updateThemeField("primaryFont", e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Heading Font Family (H1 - H3)
            </label>
            <select
              value={theme.headingFont}
              onChange={(e) => updateThemeField("headingFont", e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Typography Live Preview */}
          <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
            <span className="text-xs text-indigo-400 font-mono">LIVE TYPOGRAPHY PREVIEW</span>
            <h4
              style={{ fontFamily: theme.headingFont }}
              className="text-xl font-bold text-slate-100"
            >
              Enterprise Software Systems
            </h4>
            <p
              style={{ fontFamily: theme.primaryFont }}
              className="text-sm text-slate-400"
            >
              This is how paragraph body text will render across all service and landing pages.
            </p>
          </div>
        </div>

        {/* Color Tokens & Preset Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Brand Color Tokens & Style
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => updateThemeField("primaryColor", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e) => updateThemeField("primaryColor", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Gradient Accent
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.accentColor}
                  onChange={(e) => updateThemeField("accentColor", e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={theme.accentColor}
                  onChange={(e) => updateThemeField("accentColor", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Visual Theme Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {["dark", "light", "system"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateThemeField("mode", m)}
                  className={`py-2 px-3 rounded-xl border text-sm font-medium capitalize flex items-center justify-center gap-2 transition-all ${
                    theme.mode === m
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {theme.mode === m && <Check className="w-4 h-4 text-indigo-400" />}
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Container Border Radius
            </label>
            <select
              value={theme.borderRadius}
              onChange={(e) => updateThemeField("borderRadius", e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="4px">Compact (4px)</option>
              <option value="8px">Standard Rounded (8px)</option>
              <option value="12px">Modern Rounded (12px)</option>
              <option value="20px">Curved Glass (20px)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytics & Code Overrides */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-emerald-400" />
          Analytics & Custom CSS Overrides
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Google Analytics Tracking ID (GA4)
            </label>
            <input
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={theme.analyticsId || ""}
              onChange={(e) => updateThemeField("analyticsId", e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Google Tag Manager ID (GTM)
            </label>
            <input
              type="text"
              placeholder="GTM-XXXXXXX"
              value={theme.tagManagerId || ""}
              onChange={(e) => updateThemeField("tagManagerId", e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
            Custom CSS Global Rules
          </label>
          <textarea
            rows={4}
            placeholder="/* Custom CSS rule overrides */&#10;.hero-title { letter-spacing: -0.02em; }"
            value={theme.customCss || ""}
            onChange={(e) => updateThemeField("customCss", e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
