import compression from "compression";
const responseCompression = compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.path.startsWith("/uploads")) return false;
    if (res.getHeader("Content-Type")?.toString().includes("text/event-stream")) {
      return false;
    }
    return compression.filter(req, res);
  }
});
export {
  responseCompression
};
