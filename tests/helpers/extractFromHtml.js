import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexHtmlPath = path.resolve(__dirname, "../../index.html");
const html = fs.readFileSync(indexHtmlPath, "utf8");

// Extracts the literal source of `function <name>(...) { ... }` from index.html
// by counting braces, so wrapper tests exercise the actual shipped code
// (not a re-implementation of it) without executing/booting the whole app.
function extractFunctionSource(name) {
  const asyncMarker = `async function ${name}(`;
  const marker = `function ${name}(`;
  let start = html.indexOf(asyncMarker);
  if (start === -1) start = html.indexOf(marker);
  if (start === -1) throw new Error(`function ${name} not found in index.html`);
  const braceStart = html.indexOf("{", start);
  let depth = 0;
  let i = braceStart;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return html.slice(start, i);
}

// Evaluates the named functions from index.html against the given jsdom
// `window`/`document`, returning an object exposing each requested name.
export function loadIndexHtmlFunctions(names) {
  const source = names.map(extractFunctionSource).join("\n\n");
  const body = `${source}\nreturn { ${names.join(", ")} };`;
  // eslint-disable-next-line no-new-func
  const factory = new Function("window", "document", body);
  return factory(window, document);
}
