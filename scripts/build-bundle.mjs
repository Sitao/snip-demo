import { spawn } from 'node:child_process';
import {
  access,
  chmod,
  copyFile,
  cp,
  mkdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const shouldPush = process.argv.includes('--push');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const backendDir = path.join(repoRoot, 'backend');
const frontendDir = path.join(repoRoot, 'frontend');
const cliDir = path.join(repoRoot, 'cli');
const bundleDir = path.join(repoRoot, 'bundle');
const frontendOutputDir = path.join(frontendDir, 'dist', 'snip-frontend', 'browser');

function log(message) {
  console.log(`[build-bundle] ${message}`);
}

function run(command, args = [], options = {}) {
  const { cwd = repoRoot, shell = false, stdio = 'inherit' } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell,
      stdio,
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function runStatus(command, args = [], options = {}) {
  const { cwd = repoRoot, shell = false, stdio = 'ignore' } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell,
      stdio,
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });
}

async function fileExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyFileWithMode(sourcePath, targetPath) {
  await copyFile(sourcePath, targetPath);
  const sourceStats = await stat(sourcePath);
  await chmod(targetPath, sourceStats.mode);
}

async function ensureCleanGeneratedTargets() {
  const generatedPaths = [
    'server.js',
    'cli.js',
    'public',
    '.env',
    'package.json',
    'Dockerfile',
    '.dockerignore',
    'railway.json',
  ];

  for (const entry of generatedPaths) {
    await rm(path.join(bundleDir, entry), { force: true, recursive: true });
  }
}

async function ensureFrontendBuild() {
  log('Updating source submodules to their tracked branch tips');
  await run('git', ['submodule', 'update', '--init', '--remote', 'backend', 'frontend', 'cli']);

  log('Installing frontend dependencies');
  await run('npm install', [], { cwd: frontendDir, shell: true });

  log('Building frontend');
  await run('npx ng build', [], { cwd: frontendDir, shell: true });

  if (!(await fileExists(path.join(frontendOutputDir, 'index.html')))) {
    throw new Error('Frontend build missing frontend/dist/snip-frontend/browser/index.html');
  }
}

async function writeGeneratedFiles() {
  log('Assembling generated bundle contents');
  await mkdir(bundleDir, { recursive: true });
  await ensureCleanGeneratedTargets();

  await copyFileWithMode(path.join(backendDir, 'server.js'), path.join(bundleDir, 'server.js'));
  await copyFileWithMode(path.join(cliDir, 'cli.js'), path.join(bundleDir, 'cli.js'));
  await cp(frontendOutputDir, path.join(bundleDir, 'public'), { recursive: true });

  await writeFile(path.join(bundleDir, '.env'), 'PUBLIC_DIR=./public\n');
  await writeFile(
    path.join(bundleDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'snip-bundle',
        private: true,
        scripts: {
          start: 'bun server.js',
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(bundleDir, 'Dockerfile'),
    'FROM oven/bun:1-alpine\nCOPY . .\nENV PORT=3000\nEXPOSE 3000\nCMD bun server.js\n',
  );
  await writeFile(
    path.join(bundleDir, '.dockerignore'),
    '.git\nnode_modules\nnpm-debug.log\n.DS_Store\n',
  );
  await writeFile(
    path.join(bundleDir, 'railway.json'),
    `${JSON.stringify(
      {
        build: {
          builder: 'DOCKERFILE',
        },
      },
      null,
      2,
    )}\n`,
  );
}

async function hasStagedChanges(cwd) {
  const code = await runStatus('git', ['diff', '--cached', '--quiet'], { cwd });
  if (code === 0) {
    return false;
  }
  if (code === 1) {
    return true;
  }
  throw new Error(`Unable to inspect staged changes in ${cwd}`);
}

async function commitBundleIfNeeded() {
  await run(
    'git',
    ['add', 'server.js', 'cli.js', 'public', '.env', 'package.json', 'Dockerfile', '.dockerignore', 'railway.json'],
    { cwd: bundleDir },
  );

  if (!(await hasStagedChanges(bundleDir))) {
    log('Bundle submodule unchanged; nothing to commit');
    return false;
  }

  await run('git', ['commit', '-m', 'Build generated bundle'], { cwd: bundleDir });
  log('Committed generated bundle contents');
  return true;
}

async function commitSuperprojectIfNeeded() {
  await run('git', ['add', 'backend', 'frontend', 'cli', 'bundle'], { cwd: repoRoot });

  if (!(await hasStagedChanges(repoRoot))) {
    log('Superproject unchanged; nothing to commit');
    return false;
  }

  await run('git', ['commit', '-m', 'Update bundle release'], { cwd: repoRoot });
  log('Committed updated submodule pointers on main');
  return true;
}

async function pushIfRequested() {
  if (!shouldPush) {
    log('Skipping pushes; run with --push to publish bundle and main');
    return;
  }

  log('Pushing bundle branch');
  await run('git', ['push', 'origin', 'HEAD:bundle'], { cwd: bundleDir });

  log('Pushing main branch');
  await run('git', ['push', 'origin', 'main'], { cwd: repoRoot });
}

async function main() {
  await ensureFrontendBuild();
  await writeGeneratedFiles();
  await commitBundleIfNeeded();
  await commitSuperprojectIfNeeded();
  await pushIfRequested();
}

main().catch((error) => {
  console.error(`[build-bundle] ${error.message}`);
  process.exit(1);
});