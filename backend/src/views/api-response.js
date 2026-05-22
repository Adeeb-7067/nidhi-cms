function sendJson(res, data, status = 200) {
  res.status(status).json(data);
}
function sendNoContent(res) {
  res.status(204).end();
}
export {
  sendJson,
  sendNoContent
};
