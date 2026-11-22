import { build } from "esbuild";
await build({ entryPoints: ["src/client.js"], outfile: "dist/client.js", bundle: true, format: "esm", target: "es2022", minify: true, legalComments: "eof" });
