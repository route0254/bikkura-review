import { cp, mkdir, rm } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);
const files = ["index.html", "privacy.html", "style.css", "app.js", "auth.js", "favicon.svg", "robots.txt", "sitemap.xml", "_headers"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of files) await cp(new URL(file, root), new URL(file, dist));
for (const directory of ["data", "lib"]) await cp(new URL(`${directory}/`, root), new URL(`${directory}/`, dist), { recursive: true });
await cp(new URL("public/og.png", root), new URL("og.png", dist));
console.log("dist/ を作成しました");
