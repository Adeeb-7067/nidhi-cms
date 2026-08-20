import React, { useState, useEffect } from "react";
import {
  fetchAdminPages,
  createAdminPage,
  fetchAdminPageById,
  updateAdminPageDraft,
  deleteAdminPage,
  publishAdminPage,
  generatePreviewToken,
  seedDefaultPagesApi,
  WebsitePage,
} from "@/api/website";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Globe,
  Eye,
  Send,
  Save,
  Loader2,
  AlertTriangle,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  ArrowLeft,
  Settings2,
  RefreshCw,
  Edit3,
  ExternalLink,
} from "lucide-react";
import { CmsFilterBar } from "@/components/cms";

// Visual Section Block Types for Non-IT Users
const FRIENDLY_SECTION_TYPES = [
  {
    type: "hero",
    label: "Main Header Banner",
    icon: "🚀",
    desc: "Top section of the page with a bold headline, subtitle, and primary call-to-action button.",
    defaultData: {
      headline: "Transform Your Business With Intelligent Technology",
      subheadline: "Custom software engineering, cloud infrastructure, and AI solutions built for scale.",
      badgeText: "Enterprise Technology Partner",
      primaryCta: { label: "Schedule a Consultation", href: "/contact" },
    },
  },
  {
    type: "stats",
    label: "Key Metrics & Statistics",
    icon: "📊",
    desc: "Highlight key numbers and achievements (e.g., 500+ Projects Completed, 99.99% Uptime).",
    defaultData: {
      title: "Impact By The Numbers",
      items: [
        { label: "Active Clients", value: "500+" },
        { label: "Uptime Guarantee", value: "99.99%" },
        { label: "Global Regions", value: "24+" },
        { label: "Expert Engineers", value: "150+" },
      ],
    },
  },
  {
    type: "feature_grid",
    label: "Services & Features Grid",
    icon: "⚡",
    desc: "Showcase your core service offerings or product features in a clean multi-column layout.",
    defaultData: {
      title: "Our Core Capabilities",
      subtitle: "End-to-end technology services tailored to your industry",
    },
  },
  {
    type: "richtext",
    label: "Story & Article Content",
    icon: "📝",
    desc: "Write detailed articles, paragraphs, formatted text, and custom content blocks.",
    defaultData: {
      title: "About Our Engineering Philosophy",
      contentHtml: "We combine deep engineering expertise with modern design patterns to build digital experiences that drive real business growth.",
    },
  },
  {
    type: "cards",
    label: "Portfolio & Case Studies",
    icon: "💼",
    desc: "Display interactive cards showcasing featured projects, client work, or solution highlights.",
    defaultData: {
      title: "Featured Case Studies",
      subtitle: "Recent digital transformations engineered for industry leaders",
    },
  },
  {
    type: "testimonials",
    label: "Client Reviews & Quotes",
    icon: "💬",
    desc: "Build trust by displaying real client testimonials, star ratings, and partner logos.",
    defaultData: {
      title: "What Our Clients Say",
      subtitle: "Trusted by founders, enterprise CTOs, and product leaders worldwide",
    },
  },
  {
    type: "cta",
    label: "Call-To-Action Banner",
    icon: "📣",
    desc: "Prominent banner encouraging visitors to get in touch, start a project, or request a quote.",
    defaultData: {
      headline: "Ready to scale your digital platform?",
      subheadline: "Talk to our engineering leads today and receive an architecture roadmap.",
      buttonText: "Get In Touch",
      buttonUrl: "/contact",
    },
  },
  {
    type: "faq",
    label: "FAQ Accordion List",
    icon: "❓",
    desc: "Frequently Asked Questions collapsible list to answer customer questions.",
    defaultData: {
      title: "Frequently Asked Questions",
      items: [
        { question: "How long does a project engagement take?", answer: "Most product builds take 4 to 12 weeks depending on scope." },
        { question: "Do you offer post-launch maintenance?", answer: "Yes, we provide 24/7 SLA monitoring and continuous deployment support." },
      ],
    },
  },
  {
    type: "form_embed",
    label: "Contact & Lead Intake Form",
    icon: "📩",
    desc: "Embedded lead capture form allowing visitors to send inquiries straight to your sales team.",
    defaultData: {
      title: "Get In Touch",
      subtitle: "Fill out the form below and our team will get back to you within 2 hours.",
    },
  },
];

export function WebsiteBlockStudio({ refreshTrigger }: { refreshTrigger?: number } = {}) {
  const { toast } = useToast();
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [activePage, setActivePage] = useState<WebsitePage | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [newPageData, setNewPageData] = useState({ title: "", slug: "", pageType: "service" });
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [showSeoSettings, setShowSeoSettings] = useState(false);

  useEffect(() => {
    loadPages();
  }, [filterStatus, refreshTrigger]);

  async function loadPages() {
    try {
      setLoadingPages(true);
      const params: any = {};
      if (filterStatus !== "ALL") params.status = filterStatus;
      if (search.trim()) params.search = search.trim();
      const res = await fetchAdminPages(params);
      let pageList = res.pages || [];

      if (pageList.length === 0 && filterStatus === "ALL" && !search.trim()) {
        const seedRes = await seedDefaultPagesApi();
        if (seedRes.seededCount > 0) {
          const reloaded = await fetchAdminPages(params);
          pageList = reloaded.pages || [];
        }
      }

      setPages(pageList);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Unable to load website pages.",
        variant: "destructive",
      });
    } finally {
      setLoadingPages(false);
    }
  }

  async function handleSyncPages() {
    try {
      setLoadingPages(true);
      const seedRes = await seedDefaultPagesApi();
      toast({
        title: "Success",
        description: `Imported ${seedRes.seededCount} website pages into your directory.`,
      });
      await loadPages();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Sync failed.",
        variant: "destructive",
      });
    } finally {
      setLoadingPages(false);
    }
  }

  async function selectPage(pageId: string) {
    try {
      setConflictError(null);
      const fullPage = await fetchAdminPageById(pageId);
      setActivePage({
        ...fullPage,
        blocks: fullPage.blocks || (fullPage as any).draftBlocks || [],
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to open page editor.",
        variant: "destructive",
      });
    }
  }

  async function handleCreatePage(e: React.FormEvent) {
    e.preventDefault();
    if (!newPageData.title || !newPageData.slug) return;
    try {
      let slug = newPageData.slug.toLowerCase().trim();
      if (!slug.startsWith("/")) slug = `/${slug}`;

      const created = await createAdminPage({
        title: newPageData.title,
        slug,
        pageType: newPageData.pageType as any,
      });

      toast({ title: "Success", description: "Website page created successfully." });
      setShowCreateModal(false);
      setNewPageData({ title: "", slug: "", pageType: "service" });
      await selectPage(created._id);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not create website page.",
        variant: "destructive",
      });
    }
  }

  async function handleSaveDraft() {
    if (!activePage) return;
    try {
      setSaving(true);
      setConflictError(null);
      const updated = await updateAdminPageDraft(activePage._id, {
        title: activePage.title,
        slug: activePage.slug,
        draftBlocks: activePage.blocks,
        seo: activePage.seo,
        version: activePage.version,
      });

      setActivePage({
        ...updated,
        blocks: updated.blocks || (updated as any).draftBlocks || activePage.blocks,
      });

      toast({
        title: "Success",
        description: "Your page draft has been saved successfully.",
      });
    } catch (err: any) {
      if (err.status === 409 || err.message?.includes("Conflict")) {
        setConflictError("Another user edited this page. Click 'Reload Latest' to see their updates.");
      } else {
        toast({
          title: "Error",
          description: err.message || "Save failed.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!activePage) return;
    try {
      setPublishing(true);
      await handleSaveDraft();
      const res = await publishAdminPage(activePage._id);
      setActivePage({
        ...activePage,
        status: "PUBLISHED",
        version: res.publishedVersion || activePage.version + 1,
      });

      toast({
        title: "Success",
        description: `Page published live to web at ${activePage.slug}.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Publish failed.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  }

  async function handleOpenPreview() {
    if (!activePage) return;
    try {
      const res = await generatePreviewToken(activePage._id);
      const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000";
      const previewUrl = `${websiteUrl}${activePage.slug}?previewToken=${res.token}`;
      window.open(previewUrl, "_blank");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Preview generation failed.",
        variant: "destructive",
      });
    }
  }

  const addBlockToPage = (sectionDef: typeof FRIENDLY_SECTION_TYPES[0]) => {
    if (!activePage) return;
    const newBlock = {
      id: `blk_${Date.now()}`,
      type: sectionDef.type,
      order: activePage.blocks.length,
      data: { ...sectionDef.defaultData },
    };
    setActivePage({
      ...activePage,
      blocks: [...activePage.blocks, newBlock],
    });
    setShowAddBlockModal(false);
    toast({ title: "Success", description: `Added "${sectionDef.label}" section.` });
  };

  const removeBlock = (index: number) => {
    if (!activePage) return;
    const updated = activePage.blocks.filter((_, i) => i !== index);
    setActivePage({ ...activePage, blocks: updated });
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (!activePage) return;
    const blocks = [...activePage.blocks];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    const temp = blocks[index];
    blocks[index] = blocks[targetIdx];
    blocks[targetIdx] = temp;

    blocks.forEach((b, i) => (b.order = i));
    setActivePage({ ...activePage, blocks });
  };

  const updateBlockData = (blockIdx: number, fieldPath: string, val: any) => {
    if (!activePage) return;
    const blocks = [...activePage.blocks];
    const targetBlock = { ...blocks[blockIdx] };
    const data = { ...targetBlock.data };

    if (fieldPath.includes(".")) {
      const [parent, child] = fieldPath.split(".");
      data[parent] = { ...(data[parent] || {}), [child]: val };
    } else {
      data[fieldPath] = val;
    }

    targetBlock.data = data;
    blocks[blockIdx] = targetBlock;
    setActivePage({ ...activePage, blocks });
  };

  async function handleDeletePage() {
    if (!activePage) return;
    if (!confirm(`Are you sure you want to delete "${activePage.title}"?`)) return;
    try {
      await deleteAdminPage(activePage._id);
      toast({ title: "Page Deleted" });
      setActivePage(null);
      await loadPages();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  }

  const filteredPages = pages.filter(
    (p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  // If no page is actively selected, display the Clean Friendly Page List
  if (!activePage) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Top Header Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              Website Pages Directory
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select any website page below to edit its headlines, text content, and layout.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncPages}
              disabled={loadingPages}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPages ? "animate-spin" : ""}`} /> Sync Website Pages
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" /> Create New Page
            </button>
          </div>
        </div>

        {/* CMS Search & Filter Bar */}
        <CmsFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by page title or URL slug..."
          selectFilters={[
            {
              value: filterStatus,
              onChange: setFilterStatus,
              options: [
                { value: "ALL", label: "All Statuses" },
                { value: "PUBLISHED", label: "Live Pages" },
                { value: "DRAFT", label: "Draft Pages" },
              ],
            },
          ]}
        />

        {/* Simple Page Cards Grid */}
        {loadingPages ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Globe className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">No Pages Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click "Sync Website Pages" to import all existing website pages or "Create New Page" to build one from scratch.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPages.map((p) => {
              const isLive = p.status === "PUBLISHED";
              return (
                <div
                  key={p._id}
                  onClick={() => selectPage(p._id)}
                  className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 space-y-4 shadow-xl hover:shadow-2xl transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase text-indigo-400 tracking-wider">
                        {p.pageType || "Page"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isLive ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {isLive ? "🟢 Live" : "🟡 Draft"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-xs font-mono text-slate-400 truncate">{p.slug}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400">
                    <span className="flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5" /> Edit Page Content &rarr;
                    </span>
                    <span className="text-[10px] text-slate-400">v{p.version || 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Page Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={handleCreatePage}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" /> Create New Website Page
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Page Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., AI Engineering Services"
                    value={newPageData.title}
                    onChange={(e) => setNewPageData({ ...newPageData, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Website Address (URL Slug)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., /services/ai"
                    value={newPageData.slug}
                    onChange={(e) => setNewPageData({ ...newPageData, slug: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                >
                  Create Page
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Active Visual Block Editor Screen
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl sticky top-4 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePage(null)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
            title="Back to Pages List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {activePage.title}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activePage.status === "PUBLISHED" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {activePage.status === "PUBLISHED" ? "🟢 Live" : "🟡 Draft"}
              </span>
            </h2>
            <p className="text-xs font-mono text-slate-400">{activePage.slug}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSeoSettings(!showSeoSettings)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
          >
            <Settings2 className="w-3.5 h-3.5" /> SEO Settings
          </button>

          <button
            onClick={handleDeletePage}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/20"
            title="Delete Page"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Page
          </button>

          <button
            onClick={handleOpenPreview}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold rounded-xl"
          >
            <Eye className="w-3.5 h-3.5" /> Preview Page
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-indigo-400" />}
            Save Draft
          </button>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Publish Live
          </button>
        </div>
      </div>

      {/* Conflict Warning */}
      {conflictError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between text-amber-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{conflictError}</span>
          </div>
          <button
            onClick={() => selectPage(activePage._id)}
            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg"
          >
            Reload Latest
          </button>
        </div>
      )}

      {/* Google SEO Setup Card */}
      {showSeoSettings && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-400" /> Google Search Engine Setup (SEO)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Title Displayed on Google</label>
              <input
                type="text"
                placeholder={activePage.title}
                value={activePage.seo?.title || ""}
                onChange={(e) =>
                  setActivePage({
                    ...activePage,
                    seo: { ...activePage.seo, title: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Description for Search Results</label>
              <input
                type="text"
                placeholder="Short summary describing page content..."
                value={activePage.seo?.description || ""}
                onChange={(e) =>
                  setActivePage({
                    ...activePage,
                    seo: { ...activePage.seo, description: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Visual Page Sections List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" /> Page Sections ({activePage.blocks?.length || 0})
          </h3>

          <button
            onClick={() => setShowAddBlockModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Section To Page
          </button>
        </div>

        {activePage.blocks?.map((block, idx) => {
          const sectionDef = FRIENDLY_SECTION_TYPES.find((s) => s.type === block.type) || {
            label: `${block.type} Section`,
            icon: "📄",
          };

          return (
            <div
              key={block.id || idx}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-xl transition-all"
            >
              {/* Section Header with Controls */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{sectionDef.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{sectionDef.label}</h4>
                    <p className="text-[11px] text-slate-400">Position #{idx + 1}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveBlock(idx, "up")}
                    disabled={idx === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg disabled:opacity-30"
                    title="Move Up"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveBlock(idx, "down")}
                    disabled={idx === activePage.blocks.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg disabled:opacity-30"
                    title="Move Down"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeBlock(idx)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all ml-2"
                    title="Delete Section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Simple Section Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(block.type === "hero" || block.type === "cta" || block.type === "feature_grid" || block.type === "faq" || block.type === "stats" || block.type === "cards" || block.type === "testimonials" || block.type === "form_embed" || block.type === "richtext") && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Section Headline / Title</label>
                    <input
                      type="text"
                      value={block.data?.headline || block.data?.title || ""}
                      onChange={(e) =>
                        updateBlockData(idx, block.data?.headline !== undefined ? "headline" : "title", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {(block.type === "hero" || block.type === "cta" || block.type === "feature_grid" || block.type === "cards" || block.type === "testimonials" || block.type === "form_embed") && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Subheadline / Supporting Text</label>
                    <textarea
                      rows={2}
                      value={block.data?.subheadline || block.data?.subtitle || ""}
                      onChange={(e) =>
                        updateBlockData(idx, block.data?.subheadline !== undefined ? "subheadline" : "subtitle", e.target.value)
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {(block.type === "hero" || block.type === "cta") && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Button Text</label>
                      <input
                        type="text"
                        value={block.data?.primaryCta?.label || block.data?.buttonText || ""}
                        onChange={(e) =>
                          updateBlockData(
                            idx,
                            block.data?.primaryCta?.label !== undefined ? "primaryCta.label" : "buttonText",
                            e.target.value
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Button Target Link URL</label>
                      <input
                        type="text"
                        value={block.data?.primaryCta?.href || block.data?.buttonUrl || ""}
                        onChange={(e) =>
                          updateBlockData(
                            idx,
                            block.data?.primaryCta?.href !== undefined ? "primaryCta.href" : "buttonUrl",
                            e.target.value
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                )}

                {block.type === "richtext" && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Article Content (Text Paragraphs)</label>
                    <textarea
                      rows={5}
                      value={block.data?.contentHtml || ""}
                      onChange={(e) => updateBlockData(idx, "contentHtml", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Add Block Picker Modal */}
      {showAddBlockModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" /> Choose a Section to Add
              </h3>
              <button onClick={() => setShowAddBlockModal(false)} className="text-slate-400 text-xs hover:text-white">
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FRIENDLY_SECTION_TYPES.map((sec) => (
                <div
                  key={sec.type}
                  onClick={() => addBlockToPage(sec)}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{sec.icon}</span>
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      {sec.label}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{sec.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
