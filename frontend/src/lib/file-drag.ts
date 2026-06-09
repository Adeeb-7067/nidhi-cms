/** True when the drag payload may include local files (cross-browser). */
export function dataTransferHasFiles(dt: DataTransfer): boolean {
  return Array.from(dt.types).some(
    (t) => t === "Files" || t === "application/x-moz-file",
  );
}
