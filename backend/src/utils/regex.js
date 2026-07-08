/** Escape regex metacharacters so user search input is matched literally, not compiled as a pattern. */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
