import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Project } from "./types.js";
import { checkDoublePresence, checkImpossibleTravel } from "./rules/index.js";
import type { Issue } from "./rules/index.js";

const filePath = process.argv[2] ?? "data/sample-story.json";
const story = JSON.parse(readFileSync(resolve(filePath), "utf-8")) as Project;

const issues: Issue[] = [
  ...checkDoublePresence(story),
  ...checkImpossibleTravel(story),
];

if (issues.length === 0) {
  console.log("No continuity issues found.");
  process.exit(0);
}

const label = (i: Issue) => `[${i.severity.toUpperCase()}] ${i.rule}`;

for (const issue of issues) {
  console.log(`${label(issue)}: ${issue.message}`);
  console.log(`  scenes : ${issue.sceneIds.join(", ")}`);
  console.log(`  moments: ${issue.momentIds.join(", ")}`);
}

console.log(`\n${issues.length} issue${issues.length === 1 ? "" : "s"} found.`);
process.exit(issues.length > 0 ? 1 : 0);
