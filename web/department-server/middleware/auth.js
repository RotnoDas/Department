const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

// The remote key set caches downloaded keys and handles key rotation. Create it once (lazily, so
// CLIENT_URL is read after dotenv has loaded) instead of re-downloading the JWKS on every request.
let jwks = null;
let jwksUrl = null;

const getJwks = () => {
  const url = `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/jwks`;
  if (!jwks || jwksUrl !== url) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksUrl = url;
  }
  return jwks;
};

// Token verification middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Token format invalid" });
  }
  try {
    const { payload } = await jwtVerify(token, getJwks());
    req.user = payload;
    next();
  } catch (error) {
    console.warn(`[verifyToken] Rejected: ${error.code || error.message}`);
    return res.status(401).json({ message: "Unauthorized: Token validation failed" });
  }
};

module.exports = {
  verifyToken,
};
