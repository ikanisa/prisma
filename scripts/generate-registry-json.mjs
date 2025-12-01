#!/usr/bin/env node
import fs from "node:fs";
import yaml from "js-yaml";

const registryYaml = fs.readFileSync("agents.registry.yaml", "utf8");
const registry = yaml.load(registryYaml);

fs.writeFileSync(
  "agents.registry.json",
  JSON.stringify(registry, null, 2),
  "utf8"
);

console.log("✓ Generated agents.registry.json from agents.registry.yaml");
