// tools/serve.mjs — zero-dependency static server for local preview.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 8080);
const types = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png", ".ico":"image/x-icon", ".md":"text/plain" };

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url||"/").split("?")[0]);
    if (p === "/") p = "/docs/index.html";
    const file = normalize(join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end("forbidden"); }
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("not found"); }
}).listen(port, () => console.log("CalcGraph preview: http://localhost:" + port + "/"));
