import { mkdir, readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { chromium } from "playwright";

async function main() {
  const out = resolve(process.argv[2] ?? "out/sample");
  const destination = process.argv[3] ?? "assets";
  await mkdir(destination, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const origin = "http://owebook.local";
    const root = resolve(".");
    const fonts = resolve("fonts");
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      const file = resolve(root, "." + decodeURIComponent(url.pathname));
      if (url.origin !== origin || ![out, fonts].some(directory => file.startsWith(directory + sep))) {
        await route.abort();
        return;
      }
      try {
        await route.fulfill({
          body: await readFile(file),
          contentType: extname(file) === ".ttf" ? "font/ttf" : "text/html; charset=utf-8"
        });
      } catch {
        await route.abort();
      }
    });
    const urlFor = (path: string) => origin + "/" + relative(root, join(out, path)).split(sep).map(encodeURIComponent).join("/");
    const receipt = process.argv[4] ?? (await readdir(join(out, "receipts"))).find(name => name.endsWith(".html"));
    const captures: [string, number, string][] = [
      ["ledger.html", 390, "ledger-390.png"], ["ledger.html", 1280, "ledger-1280.png"],
    ];
    if (receipt) captures.push(["receipts/" + receipt, 600, "receipt.png"], ["receipts/" + receipt, 390, "receipt-390.png"]);
    if (receipt && process.argv.includes("--wide")) captures.push(["receipts/" + receipt, 1280, "receipt-1280.png"]);
    for (const [file, width, name] of captures) {
      await page.setViewportSize({ width, height: file.startsWith("receipts/") ? 600 : 950 });
      await page.goto(urlFor(file));
      const layout = await page.evaluate(async () => {
        await document.fonts.ready;
        return { width: window.innerWidth, content: document.documentElement.scrollWidth,
          lato: Array.from(document.fonts).some(font => font.family === "Lato" && font.status === "loaded"),
          desktopTable: Boolean(document.querySelector(".owetable")?.getClientRects().length),
          mobileRows: Boolean(document.querySelector(".owe-mobile")?.getClientRects().length),
          wrappingLabels: Array.from(document.querySelectorAll(".owe-mobile-label"))
            .filter(label => label.getClientRects().length && getComputedStyle(label).whiteSpace !== "nowrap").length };
      });
      console.log(name, JSON.stringify(layout));
      if (layout.content > width) throw new Error(file + " overflows at " + width + "px");
      if (!layout.lato) throw new Error("Lato did not load for " + file);
      if (file === "ledger.html" && (layout.desktopTable !== (width > 480) ||
          layout.mobileRows !== (width <= 480) || layout.wrappingLabels)) {
        throw new Error("Unexpected customer-row layout at " + width + "px");
      }
      await page.screenshot({ path: join(destination, name), fullPage: true });
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
