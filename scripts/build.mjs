import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const standalone = readFileSync(new URL("../src/standalone.js", import.meta.url), "utf8")
  .replace(/^import .*$/m, "");
const source = [
  readFileSync(new URL("../src/detect.js", import.meta.url), "utf8").replace(/^export /gm, ""),
  standalone,
].join("\n");

function encode(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

const strings = [];
function stash(value) {
  const id = strings.push(value) - 1;
  return `__s(${id})`;
}

const stripped = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const rewritten = stripped.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (literal) => {
  const quote = literal[0];
  const raw = literal.slice(1, -1);
  const value = quote === "`"
    ? raw
    : raw.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  if (value.length < 2) return literal;
  return stash(value);
});

const table = strings.map(encode).join("|");
const decoder = `function __s(i){return decodeURIComponent(escape(atob(__t.split("|")[i])))}var __t="${table}";`;
const bundled = `(function(){${decoder}\n${rewritten}\n})();`;

mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("../dist/antiAdBlocker.min.js", import.meta.url), rewritten.replace(/\n{2,}/g, "\n"));
writeFileSync(new URL("../dist/antiAdBlocker.min.ob.js", import.meta.url), bundled);
console.log("wrote dist/antiAdBlocker.min.js and dist/antiAdBlocker.min.ob.js", bundled.length);
