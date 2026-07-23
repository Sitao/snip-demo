# Snip CLI

Zero-dependency Node CLI for the Snip backend.

## Commands

- `snip add <url>`: create a short link and print `shortUrl`
- `snip ls`: list links in an aligned `code / hits / url` table
- `snip open <code>`: resolve a short code and open the redirect target in your OS browser
- `snip help`: show usage

## Environment

- `SNIP_API`: backend origin (default `http://localhost:3000`)

## Examples

```bash
node cli.js add https://example.com
node cli.js ls
node cli.js open abc123
```
