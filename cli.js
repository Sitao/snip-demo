#!/usr/bin/env node

const { spawn } = require('node:child_process');

const BASE_URL = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/$/, '');

function usage() {
  console.log(`snip - tiny URL shortener CLI

Usage:
  snip add <url>    Create a short link and print shortUrl
  snip ls           List links as code/hits/url table
  snip open <code>  Resolve code and open destination URL in browser
  snip help         Show this help

Environment:
  SNIP_API          Backend origin (default: http://localhost:3000)`);
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function parseJsonOrThrow(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function addLink(url) {
  if (!url || !isHttpUrl(url)) {
    exitWithError('Provide a valid http(s) URL.');
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch {
    exitWithError(`Cannot reach backend at ${BASE_URL}.`);
  }

  const data = await parseJsonOrThrow(response);
  if (!response.ok) {
    const detail = data && typeof data.error === 'string' ? data.error : `Request failed (${response.status}).`;
    exitWithError(detail);
  }

  if (!data || typeof data.shortUrl !== 'string') {
    exitWithError('Unexpected response from backend.');
  }

  console.log(data.shortUrl);
}

function printTable(links) {
  if (!Array.isArray(links) || links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const codeWidth = Math.max(
    'CODE'.length,
    ...links.map((item) => String(item.code ?? '').length),
  );
  const hitsWidth = Math.max(
    'HITS'.length,
    ...links.map((item) => String(item.hits ?? '').length),
  );

  const header = `${'CODE'.padEnd(codeWidth)}  ${'HITS'.padStart(hitsWidth)}  URL`;
  console.log(header);
  console.log(`${'-'.repeat(codeWidth)}  ${'-'.repeat(hitsWidth)}  ${'-'.repeat(3)}`);

  for (const item of links) {
    const code = String(item.code ?? '').padEnd(codeWidth);
    const hits = String(item.hits ?? '').padStart(hitsWidth);
    const url = String(item.url ?? '');
    console.log(`${code}  ${hits}  ${url}`);
  }
}

async function listLinks() {
  let response;
  try {
    response = await fetch(`${BASE_URL}/api/links`);
  } catch {
    exitWithError(`Cannot reach backend at ${BASE_URL}.`);
  }

  const data = await parseJsonOrThrow(response);
  if (!response.ok) {
    const detail = data && typeof data.error === 'string' ? data.error : `Request failed (${response.status}).`;
    exitWithError(detail);
  }

  printTable(data);
}

function openInBrowser(targetUrl) {
  let command;
  let args;

  if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', targetUrl];
  } else if (process.platform === 'darwin') {
    command = 'open';
    args = [targetUrl];
  } else {
    command = 'xdg-open';
    args = [targetUrl];
  }

  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  child.unref();
}

async function openCode(code) {
  if (!code) {
    exitWithError('Provide a short code to open.');
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}/${encodeURIComponent(code)}`, {
      redirect: 'manual',
    });
  } catch {
    exitWithError(`Cannot reach backend at ${BASE_URL}.`);
  }

  if (response.status === 404) {
    exitWithError(`Unknown short code: ${code}`);
  }

  const location = response.headers.get('location');
  if (response.status < 300 || response.status >= 400 || !location) {
    exitWithError(`Expected redirect for code ${code}, got ${response.status}.`);
  }

  openInBrowser(location);
  console.log(location);
}

async function main() {
  const [command, arg] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    usage();
    return;
  }

  if (command === 'add') {
    await addLink(arg);
    return;
  }

  if (command === 'ls') {
    await listLinks();
    return;
  }

  if (command === 'open') {
    await openCode(arg);
    return;
  }

  exitWithError(`Unknown command: ${command}`);
}

main().catch((error) => {
  const message = error && typeof error.message === 'string' ? error.message : 'Unexpected error.';
  exitWithError(message);
});
