# Snip

Snip is a tiny URL shortener that demonstrates one backend with two different clients in a single repository layout.

- `backend/`: Bun API server with in-memory storage
- `frontend/`: Angular web UI
- `cli/`: zero-dependency Node CLI

Each folder on `main` is a Git submodule pinned to a branch of this same repository, so the superproject records one reproducible snapshot of the whole app.

## API contract

| Method | Path | Response |
| --- | --- | --- |
| `POST` | `/api/links` with `{ "url": "https://..." }` | `201` `{ code, url, shortUrl, hits, createdAt }` or `400` on invalid input |
| `GET` | `/api/links` | `200` array of links |
| `GET` | `/:code` | `302` redirect to original URL and increments `hits`, or `404` if unknown |

## Layout

```text
snip-demo/
├── backend/   Bun API submodule tracking branch backend
├── frontend/  Angular app submodule tracking branch frontend
├── cli/       Node CLI submodule tracking branch cli
└── .gitmodules
```

## Clone

Clone with submodules enabled so the folders are populated immediately:

```bash
git clone --recurse-submodules https://github.com/Sitao/snip-demo.git
```

Plain `git clone` leaves `backend/`, `frontend/`, and `cli/` empty until you run:

```bash
git submodule update --init --recursive
```

## Run

Start the backend first:

```bash
cd backend
bun start
```

Run the frontend in a second terminal:

```bash
cd frontend
npm install
npx ng serve
```

Use the CLI in a third terminal:

```bash
cd cli
node cli.js ls
```

The frontend and CLI both talk to the backend on `http://localhost:3000` by default.

## Updating a layer

Make changes inside the submodule folder first, then commit and push there:

```bash
cd backend
git add -A
git commit -m "..."
git push
```

Then return to the superproject and bump the pinned submodule pointer:

```bash
cd ..
git submodule update --remote backend
git add backend
git commit -m "Bump backend submodule"
git push
```

Use the same flow for `frontend` and `cli`.