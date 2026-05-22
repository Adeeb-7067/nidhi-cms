import jwt from "jsonwebtoken";
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "cms-access-secret-dev";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "cms-refresh-secret-dev";
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "30d";
function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}
function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}
function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}
export {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
