import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

import dts from "rollup-plugin-dts";

const config = [
  {
    input: "./src/index.ts",
    output: [{ file: "dist/index.d.ts", format: "es" }],
    plugins: [dts()],
  },
  {
    input: "./src/index.ts",
    output: [{ file: "dist/index.cjs", format: "cjs" }],
    plugins: [typescript(), nodeResolve()],
  },
  {
    input: "./src/index.ts",
    output: [{ file: "dist/index.mjs", format: "es" }],
    plugins: [typescript(), nodeResolve()],
  },
];

export default config;
