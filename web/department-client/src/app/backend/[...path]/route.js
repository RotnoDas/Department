// Clean, reliable server-side proxy route forwarding client requests to the Node backend on port 5000.
// Avoids forwarding hop-by-hop headers (like transfer-encoding or content-length) that break Node's undici fetch.

const BACKEND_BASE = process.env.SERVER_INTERNAL_URL || "http://127.0.0.1:5000";

async function proxyRequest(req, pathSegments) {
  const targetPath = Array.isArray(pathSegments) ? pathSegments.join("/") : "";
  const search = req.nextUrl?.search || "";
  const targetUrl = `${BACKEND_BASE}/${targetPath}${search}`;

  // Forward only necessary application headers
  const forwardHeaders = {};
  const auth = req.headers.get("authorization");
  if (auth) forwardHeaders["authorization"] = auth;
  const contentType = req.headers.get("content-type");
  if (contentType) forwardHeaders["content-type"] = contentType;
  const accept = req.headers.get("accept");
  if (accept) forwardHeaders["accept"] = accept;
  const internalSecret = req.headers.get("x-internal-secret");
  if (internalSecret) forwardHeaders["x-internal-secret"] = internalSecret;

  const range = req.headers.get("range");
  if (range) forwardHeaders["range"] = range;

  const method = req.method;
  let body = undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      const buffer = await req.arrayBuffer();
      if (buffer && buffer.byteLength > 0) {
        body = Buffer.from(buffer);
      }
    } catch (e) {
      console.warn("[/backend proxy] Could not read body:", e);
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body,
      cache: "no-store",
    });

    const responseBody = await res.arrayBuffer();
    const responseHeaders = new Headers();
    const resContentType = res.headers.get("content-type");
    if (resContentType) {
      responseHeaders.set("content-type", resContentType);
    }
    const cacheControl = res.headers.get("cache-control");
    if (cacheControl) {
      responseHeaders.set("cache-control", cacheControl);
    }
    const acceptRanges = res.headers.get("accept-ranges");
    if (acceptRanges) {
      responseHeaders.set("accept-ranges", acceptRanges);
    }
    const contentRange = res.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("content-range", contentRange);
    }
    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("content-length", contentLength);
    }
    const contentDisposition = res.headers.get("content-disposition");
    if (contentDisposition) {
      responseHeaders.set("content-disposition", contentDisposition);
    }

    return new Response(responseBody, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[/backend proxy] Error forwarding to ${targetUrl}:`, err.message, err.cause?.message || "");
    return new Response(
      JSON.stringify({
        success: false,
        error: `Backend unreachable at ${targetUrl}: ${err.message}`,
        code: "BACKEND_UNREACHABLE",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function GET(req, { params }) {
  const resolved = await params;
  return proxyRequest(req, resolved.path);
}

export async function POST(req, { params }) {
  const resolved = await params;
  return proxyRequest(req, resolved.path);
}

export async function PUT(req, { params }) {
  const resolved = await params;
  return proxyRequest(req, resolved.path);
}

export async function PATCH(req, { params }) {
  const resolved = await params;
  return proxyRequest(req, resolved.path);
}

export async function DELETE(req, { params }) {
  const resolved = await params;
  return proxyRequest(req, resolved.path);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}
