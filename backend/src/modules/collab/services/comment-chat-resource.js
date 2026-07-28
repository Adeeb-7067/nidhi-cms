import {
  inventoryResourcesTable,
  getNextSequence,
} from "../../../models/schema/index.js";
import { validateStoredFileUrl } from "../../../lib/file-storage.js";
import { broadcast } from "../../../lib/realtime.js";
import { logInventoryActivity, notifyProjectMembers } from "../../inventory/services/helpers.js";

function isImageMime(mime) {
  return typeof mime === "string" && mime.toLowerCase().startsWith("image/");
}

/**
 * When a client shares an image in project discussion, mirror it in inventory resources.
 */
export async function syncClientDiscussionImageToResource(req, {
  projectId,
  commentId,
  attachmentUrl,
  attachmentName,
  attachmentMimeType,
  content,
}) {
  if (req.user?.role !== "client") return null;
  if (!attachmentUrl || !isImageMime(attachmentMimeType)) return null;

  validateStoredFileUrl(attachmentUrl, "attachmentUrl");

  const existing = await inventoryResourcesTable.findOne({
    projectId,
    fileUrl: attachmentUrl,
    deletedAt: null,
  });
  if (existing) return existing.id;

  const name =
    attachmentName?.trim() ||
    `Discussion image – ${req.user.name || "Client"}`;
  const description = content?.trim()
    ? `From project discussion: ${content.slice(0, 200)}`
    : "Shared in project discussion chat";

  const id = await getNextSequence("inventory_resources");
  await inventoryResourcesTable.create({
    id,
    projectId,
    folderId: null,
    type: "file",
    name,
    description,
    fileUrl: attachmentUrl,
    mimeType: attachmentMimeType,
    tags: ["discussion", "chat", `comment:${commentId}`],
    category: "discussion",
    visibility: "client_visible",
    uploadedBy: req.user.id,
  });

  await logInventoryActivity(
    req,
    projectId,
    "resource_uploaded",
    "resource",
    id,
    name,
  );
  await notifyProjectMembers(
    projectId,
    req.user.id,
    "New image from discussion",
    name,
    "resource",
    id,
  );

  broadcast("inventory_update", { projectId, resourceId: id });

  return id;
}
