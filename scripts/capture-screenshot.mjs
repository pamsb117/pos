import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";

const browserNames = process.platform === "win32"
  ? ["chrome.exe","msedge.exe"]
  : ["google-chrome","google-chrome-stable","chromium","chromium-browser"];
const pathCandidates = (process.env.PATH ?? "").split(path.delimiter)
  .flatMap(directory => browserNames.map(name => path.join(directory,name)));
const candidates = [...new Set([
  process.env.CHROME_PATH && path.resolve(process.env.CHROME_PATH),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ...pathCandidates,
].filter(Boolean))];

async function findChrome() {
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch {}
  }
  throw new Error("No se encontro Chrome/Chromium. Define CHROME_PATH con la ruta del navegador.");
}

async function waitForServer(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`La aplicacion no respondio en ${url}`);
}

async function serverIsReady(url) {
  try { return (await fetch(url)).ok; } catch { return false; }
}

const chrome = await findChrome();
const outputDir = path.resolve("artifacts");
const output = path.join(outputDir,"pos-salon.png");
const profile = path.join(outputDir,"chrome-profile");
const url = process.env.SCREENSHOT_URL ?? "http://localhost:3000";
await mkdir(outputDir,{recursive:true});

const server = await serverIsReady(url)
  ? null
  : spawn("npm",["run","dev"],{stdio:"inherit",shell:process.platform==="win32"});
try {
  await waitForServer(url);
  const browser = spawn(chrome,[
    "--headless=new","--no-sandbox","--disable-gpu",
    "--hide-scrollbars","--window-size=1440,1000",
    `--user-data-dir=${profile}`,
    `--screenshot=${output}`,url,
  ],{stdio:"inherit"});
  const exitCode = await new Promise(resolve => browser.on("exit",resolve));
  if (exitCode !== 0) throw new Error(`Chrome termino con codigo ${exitCode}`);
  console.log(`Captura guardada en ${output}`);
} finally {
  server?.kill("SIGTERM");
}
