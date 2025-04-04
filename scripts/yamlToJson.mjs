// Node script used to convert a .yaml file to a .json file
// Call yamlToJson.mjs [input] [output]

import process from "node:process";
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "yaml";

const [, , input, output] = process.argv;
const out = output || `${input.split(".")[0]}.json`;

console.log(`Converting ${input} to ${out}`);

const loadedYaml = parse(readFileSync(input, { encoding: "utf-8" }));
const jsonOutput = JSON.stringify(loadedYaml, null, 2);

writeFileSync(out, jsonOutput);
