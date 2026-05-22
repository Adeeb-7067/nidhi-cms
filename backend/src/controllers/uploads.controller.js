import {
  getStorageBackend,
  resolvePublicFileUrl,
  storeUpload,
  UPLOAD_CATEGORIES
} from "@/lib/file-storage";
import { badRequest } from "@/utils/route-errors";
function parseCategory(raw) {
  if (typeof raw !== "string" || !raw) return "misc";
  const c = raw.toLowerCase();
  return UPLOAD_CATEGORIES.includes(c) ? c : "misc";
}
async function postUpload(req, res) {
  if (!req.file) {
    badRequest('No file was uploaded. Choose a file and use the field name "file".', "file");
  }
  const category = parseCategory(req.query.category);
  const stored = await storeUpload(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    category
  );
  const fileUrl = resolvePublicFileUrl(stored.url, req) ?? stored.url;
  res.status(200).json({
    message: "File uploaded successfully",
    url: fileUrl,
    storage: stored.storage,
    backend: getStorageBackend(),
    category,
    key: stored.key,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
}
export {
  postUpload
};
