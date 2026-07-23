# Snip Backend

Tiny Bun backend for a URL shortener demo.

## API

- POST /api/links with JSON body { "url": "https://example.com" }
  - 201 with { code, url, shortUrl, hits, createdAt }
  - 400 on invalid JSON or non-http(s) URL
- GET /api/links
  - 200 with array of links
- GET /:code
  - 302 redirect to original URL and increments hits
  - 404 if code is unknown

## Environment

- PORT: server port (default 3000)
- BASE_URL: origin used for shortUrl values
- RAILWAY_PUBLIC_DOMAIN: fallback origin as https://$RAILWAY_PUBLIC_DOMAIN when BASE_URL is unset
- PUBLIC_DIR: optional static directory; / serves index.html, and existing files take precedence over short codes

## Run

bun start
