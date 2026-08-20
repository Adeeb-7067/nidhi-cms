import React, { useState, useEffect } from "react";
import {
  fetchAdminMedia,
  requestPresignedMediaUrl,
  confirmMediaUpload,
  deleteAdminMedia,
  WebsiteMediaItem,
} from "@/api/website";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon, Copy, Trash2, Check, Loader2, HardDrive } from "lucide-react";

export function WebsiteMediaLibrary() {
  const { toast } = useToast();
  const [items, setItems] = useState<WebsiteMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  async function loadMedia() {
    try {
      setLoading(true);
      const res = await fetchAdminMedia({ limit: 60 });
      setItems(res.items || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load media assets.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Request DigitalOcean Spaces Pre-signed Upload URL
        const presigned = await requestPresignedMediaUrl({
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
        });

        // 2. Direct S3 Upload via PUT
        const uploadRes = await fetch(presigned.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Direct storage upload failed with status ${uploadRes.status}`);
        }

        // 3. Confirm Media Upload in Database
        await confirmMediaUpload({
          key: presigned.key,
          originalName: file.name,
          mimetype: file.type || "application/octet-stream",
          category: "marketing",
        });
      }

      toast({
        title: "Success",
        description: `${files.length} asset(s) uploaded successfully.`,
      });
      await loadMedia();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Upload failed.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this media metadata entry?")) return;
    try {
      await deleteAdminMedia(id);
      toast({ title: "Success", description: "Media entry removed successfully." });
      await loadMedia();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Delete failed.", variant: "destructive" });
    }
  }

  function copyToClipboard(url: string, id: string) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "Success", description: "CDN link copied to clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-indigo-400" />
            DigitalOcean Spaces Media Library
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload images, illustrations, and videos directly to S3 object storage with CDN URL generation.
          </p>
        </div>

        {/* Upload Button */}
        <label className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl cursor-pointer shadow-lg transition-all">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading to Storage..." : "Upload New Asset"}
          <input
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No Media Assets Uploaded Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Upload New Asset" to store images directly into your DigitalOcean Spaces bucket.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => (
            <div
              key={item._id}
              className="group relative bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-md hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="aspect-video bg-slate-950 flex items-center justify-center overflow-hidden relative">
                {item.mimeType.startsWith("image/") ? (
                  <img
                    src={item.url}
                    alt={item.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-600" />
                )}
              </div>

              <div className="p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-200 truncate" title={item.originalName}>
                  {item.originalName}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{(item.sizeBytes / 1024).toFixed(1)} KB</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyToClipboard(item.url, item._id)}
                      className="p-1 hover:bg-slate-800 rounded text-indigo-400"
                      title="Copy Public CDN URL"
                    >
                      {copiedId === item._id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-1 hover:bg-slate-800 rounded text-rose-400"
                      title="Delete Metadata"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
