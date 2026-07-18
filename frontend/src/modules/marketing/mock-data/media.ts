import type { MediaItem } from "../types";
import { mockMarketingClients } from "./clients";

const STANDARD_SUBFOLDERS = [
  { key: "images", name: "Images", kind: "folder" as const },
  { key: "documents", name: "Documents", kind: "folder" as const },
  { key: "brand", name: "Brand assets", kind: "folder" as const },
  { key: "videos", name: "Videos", kind: "folder" as const },
];

function buildClientVault(clientId: string, company: string, seed: number): MediaItem[] {
  const rootId = `folder-${clientId}`;
  const items: MediaItem[] = [
    {
      id: rootId,
      name: company,
      kind: "folder",
      parentId: "folder-clients",
      clientId,
      modifiedAt: "2026-07-10T09:00:00Z",
    },
  ];

  for (const sub of STANDARD_SUBFOLDERS) {
    const folderId = `${rootId}-${sub.key}`;
    items.push({
      id: folderId,
      name: sub.name,
      kind: "folder",
      parentId: rootId,
      clientId,
      modifiedAt: "2026-07-12T11:00:00Z",
    });
  }

  const imagesId = `${rootId}-images`;
  const docsId = `${rootId}-documents`;
  const brandId = `${rootId}-brand`;
  const videosId = `${rootId}-videos`;

  const imageFiles: Omit<MediaItem, "id" | "parentId" | "clientId">[] = [
    { name: "logo-primary.png", kind: "image", extension: "png", sizeBytes: 240_000 + seed * 1200, modifiedAt: "2026-07-08T14:20:00Z" },
    { name: "product-hero.jpg", kind: "image", extension: "jpg", sizeBytes: 1_850_000 + seed * 800, modifiedAt: "2026-07-09T10:15:00Z" },
    { name: "story-frame-01.png", kind: "image", extension: "png", sizeBytes: 920_000 + seed * 400, modifiedAt: "2026-07-11T16:40:00Z" },
    { name: "carousel-slide-a.webp", kind: "image", extension: "webp", sizeBytes: 480_000 + seed * 300, modifiedAt: "2026-07-14T08:05:00Z" },
  ];

  const docFiles: Omit<MediaItem, "id" | "parentId" | "clientId">[] = [
    { name: "creative-brief.pdf", kind: "document", extension: "pdf", sizeBytes: 420_000 + seed * 200, modifiedAt: "2026-06-28T12:00:00Z" },
    { name: "monthly-report-jun.docx", kind: "document", extension: "docx", sizeBytes: 180_000 + seed * 150, modifiedAt: "2026-07-02T09:30:00Z" },
    { name: "content-calendar.xlsx", kind: "document", extension: "xlsx", sizeBytes: 95_000 + seed * 90, modifiedAt: "2026-07-05T17:10:00Z" },
  ];

  const brandFiles: Omit<MediaItem, "id" | "parentId" | "clientId">[] = [
    { name: "brand-guidelines.pdf", kind: "document", extension: "pdf", sizeBytes: 3_200_000 + seed * 500, modifiedAt: "2026-05-15T11:00:00Z" },
    { name: "logo-pack.zip", kind: "other", extension: "zip", sizeBytes: 8_400_000 + seed * 1000, modifiedAt: "2026-05-15T11:05:00Z" },
    { name: "fonts-license.pdf", kind: "document", extension: "pdf", sizeBytes: 65_000, modifiedAt: "2026-05-16T08:00:00Z" },
  ];

  const videoFiles: Omit<MediaItem, "id" | "parentId" | "clientId">[] = [
    { name: "reel-raw-take1.mp4", kind: "video", extension: "mp4", sizeBytes: 48_000_000 + seed * 10_000, modifiedAt: "2026-07-13T19:20:00Z" },
    { name: "ugc-cutdown.mov", kind: "video", extension: "mov", sizeBytes: 72_000_000 + seed * 12_000, modifiedAt: "2026-07-15T13:45:00Z" },
  ];

  imageFiles.forEach((f, i) =>
    items.push({ ...f, id: `${imagesId}-f${i}`, parentId: imagesId, clientId }),
  );
  docFiles.forEach((f, i) =>
    items.push({ ...f, id: `${docsId}-f${i}`, parentId: docsId, clientId }),
  );
  brandFiles.forEach((f, i) =>
    items.push({ ...f, id: `${brandId}-f${i}`, parentId: brandId, clientId }),
  );
  videoFiles.forEach((f, i) =>
    items.push({ ...f, id: `${videosId}-f${i}`, parentId: videosId, clientId }),
  );

  return items;
}

/** Root: This PC → Clients → per-client vault folders */
export const mockMediaItems: MediaItem[] = [
  {
    id: "folder-this-pc",
    name: "This PC",
    kind: "folder",
    parentId: null,
    modifiedAt: "2026-07-01T00:00:00Z",
  },
  {
    id: "folder-clients",
    name: "Clients",
    kind: "folder",
    parentId: "folder-this-pc",
    modifiedAt: "2026-07-01T00:00:00Z",
  },
  {
    id: "folder-shared",
    name: "Shared templates",
    kind: "folder",
    parentId: "folder-this-pc",
    modifiedAt: "2026-06-20T00:00:00Z",
  },
  {
    id: "shared-caption-bank.docx",
    name: "caption-bank.docx",
    kind: "document",
    parentId: "folder-shared",
    extension: "docx",
    sizeBytes: 55_000,
    modifiedAt: "2026-06-22T10:00:00Z",
  },
  {
    id: "shared-story-sizes.pdf",
    name: "platform-sizes.pdf",
    kind: "document",
    parentId: "folder-shared",
    extension: "pdf",
    sizeBytes: 210_000,
    modifiedAt: "2026-06-25T14:00:00Z",
  },
  ...mockMarketingClients.flatMap((c, i) => buildClientVault(c.id, c.company, i + 1)),
];

export function getMediaItemById(id: string): MediaItem | undefined {
  return mockMediaItems.find((item) => item.id === id);
}

export function getMediaChildren(parentId: string | null): MediaItem[] {
  return mockMediaItems
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1;
      if (a.kind !== "folder" && b.kind === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
}

export function getMediaPath(folderId: string): MediaItem[] {
  const path: MediaItem[] = [];
  let current = getMediaItemById(folderId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? getMediaItemById(current.parentId) : undefined;
  }
  return path;
}

export function getClientMediaFolderId(clientId: string): string {
  return `folder-${clientId}`;
}

export function formatMediaSize(bytes?: number): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
