import type { Project } from "@engine/types.js";
import type { Issue } from "@engine/rules/issue.js";
import { checkDoublePresence } from "@engine/rules/double-presence.js";
import { checkImpossibleTravel } from "@engine/rules/impossible-travel.js";
import { checkDeadOrGone } from "@engine/rules/dead-or-gone.js";

export function runAllChecks(project: Project): Issue[] {
  return [
    ...checkDoublePresence(project),
    ...checkImpossibleTravel(project),
    ...checkDeadOrGone(project),
  ];
}
