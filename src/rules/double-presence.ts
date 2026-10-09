import type { Project, WorldTime } from "../types.js";
import { buildCharacterAppearances } from "./collect-appearances.js";
import type { CharacterAppearance } from "./collect-appearances.js";
import type { Issue } from "./issue.js";

/**
 * Flag any character who appears at two different locations at the same world
 * time. Moments have no duration, so "overlap" means identical worldTime.
 */
export function checkDoublePresence(project: Project): Issue[] {
  const byChar = buildCharacterAppearances(project);
  const charNameById = new Map(project.characters.map((c) => [c.id, c.name]));
  const issues: Issue[] = [];

  for (const [charId, appearances] of byChar) {
    const byTime = new Map<WorldTime, CharacterAppearance[]>();
    for (const a of appearances) {
      let group = byTime.get(a.worldTime);
      if (!group) {
        group = [];
        byTime.set(a.worldTime, group);
      }
      group.push(a);
    }

    for (const [wt, group] of byTime) {
      const uniqueLocs = new Set(group.map((a) => a.locationId));
      if (uniqueLocs.size < 2) continue;

      const locNames = [...uniqueLocs]
        .map((id) => project.locations.find((l) => l.id === id)?.name ?? id)
        .join(" and ");

      issues.push({
        rule: "double-presence",
        severity: "error",
        message: `${charNameById.get(charId) ?? charId} is in ${uniqueLocs.size} locations at once (${locNames}) at world time ${wt}`,
        characterId: charId,
        sceneIds: [...new Set(group.map((a) => a.sceneId))],
        momentIds: group.map((a) => a.momentId),
      });
    }
  }

  return issues;
}
