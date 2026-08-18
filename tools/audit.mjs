import { readFileSync } from "node:fs";
const html = readFileSync("index.html", "utf8");
const externals = [];
for (const m of html.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)/g)) externals.push(m[1]);
const links = (html.match(/<link[^>]*>/g) || []).length;
const scripts = (html.match(/<script[^>]*src=/g) || []).length;
console.log("external URLs:", externals.length ? externals.join(", ") : "NONE (fully standalone)");
console.log("external <link> tags:", links, "| external <script src> tags:", scripts);
console.log("inline js bytes:", Math.round(html.match(/<script>[\s\S]*?<\/script>/)[0].length / 1024) + " KB");
