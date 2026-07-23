import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const links = new Map();
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const PORT = Number.parseInt(process.env.PORT || "3000", 10);

function baseOrigin() {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return `http://localhost:${PORT}`;
}

const BASE_URL = baseOrigin().replace(/\/$/, "");
const PUBLIC_DIR = process.env.PUBLIC_DIR
  ? path.resolve(process.env.PUBLIC_DIR)
  : null;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function withCors(response) {
  const headers = new Headers(response.headers);
  const cors = corsHeaders();
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(data, status = 200) {
  return withCors(
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    }),
  );
}

function randomCode(length = 6) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * BASE62.length);
    out += BASE62[idx];
  }
  return out;
}

function generateUniqueCode() {
  let code = randomCode(6);
  while (links.has(code)) {
    code = randomCode(6);
  }
  return code;
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function shortLinkFor(code) {
  return `${BASE_URL}/${code}`;
}

function toRecord(entry) {
  return {
    code: entry.code,
    url: entry.url,
    shortUrl: shortLinkFor(entry.code),
    hits: entry.hits,
    createdAt: entry.createdAt,
  };
}

function sanitizePublicPath(urlPathname) {
  const trimmed = urlPathname.replace(/^\/+/, "");
  const requested = trimmed === "" ? "index.html" : trimmed;
  const normalized = path.normalize(requested);

  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return null;
  }

  return normalized;
}

async function tryServeStatic(pathname) {
  if (!PUBLIC_DIR) {
    return null;
  }

  const safeRelativePath = sanitizePublicPath(pathname);
  if (!safeRelativePath) {
    return withCors(new Response("Not Found", { status: 404 }));
  }

  const fullPath = path.join(PUBLIC_DIR, safeRelativePath);
  if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
    return null;
  }

  const file = await readFile(fullPath);
  const contentType = Bun.file(fullPath).type || "application/octet-stream";
  return withCors(
    new Response(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
      },
    }),
  );
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/api/links" && req.method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const inputUrl = body?.url;
      if (typeof inputUrl !== "string" || !isHttpUrl(inputUrl)) {
        return json({ error: "URL must be http(s)" }, 400);
      }

      const code = generateUniqueCode();
      const entry = {
        code,
        url: inputUrl,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, entry);

      return json(toRecord(entry), 201);
    }

    if (url.pathname === "/api/links" && req.method === "GET") {
      const all = Array.from(links.values()).map(toRecord);
      return json(all, 200);
    }

    const staticResponse = await tryServeStatic(url.pathname);
    if (staticResponse) {
      return staticResponse;
    }

    if (req.method === "GET" && url.pathname.length > 1) {
      const code = url.pathname.slice(1);
      const entry = links.get(code);
      if (!entry) {
        return withCors(new Response("Not Found", { status: 404 }));
      }
      entry.hits += 1;

      return withCors(
        Response.redirect(entry.url, 302),
      );
    }

    return withCors(new Response("Not Found", { status: 404 }));
  },
});

console.log(`Snip backend listening on ${server.url}`);
