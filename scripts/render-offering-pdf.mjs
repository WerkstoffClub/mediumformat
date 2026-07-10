import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

// One-shot: render docs/investor-offering.html → docs/investor-offering.pdf
// using the pre-installed Chromium bundle. Not part of the app build.

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../docs/investor-offering.html");
const out = path.resolve(here, "../docs/investor-offering.pdf");

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage();
await page.goto(pathToFileURL(src).href, { waitUntil: "load" });
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  preferCSSPageSize: true,
});
await browser.close();
console.log("Wrote:", out);
