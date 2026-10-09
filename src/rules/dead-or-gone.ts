import type { CharacterId, MomentId, Project, SceneId, WorldTime } from "../types.js";
import { buildCharacterAppearances } from "./collect-appearances.js";
import type { Issue } from "./issue.js";

interface DeathRecord {
  worldTime: WorldTime;
  sceneId: SceneId;
  momentId: MomentId;
}

/** Collect the earliest DEATH event per character across all moments. */
function collectDeaths(project: Project): Map<CharacterId, DeathRecord> {
  const deaths = new Map<CharacterId, DeathRecord>();

  for (const chapter of project.chapters) {
    for (const scene of chapter.scenes) {
      for (const moment of scene.moments) {
        for (const event of moment.events ?? []) {
          if (event.type !== "DEATH") continue;
          const charId = event.entityId as CharacterId;
          const existing = deaths.get(charId);
          if (!existing || event.worldTime < existing.worldTime) {
            deaths.set(charId, {
              worldTime: event.worldTime,
              sceneId: scene.id,
              momentId: moment.id,
            });
          }
        }
      }
    }
  }

  return deaths;
}

/** Build a lookup from scene id to its flashback/dream flags. */
function buildSceneFlags(project: Project): Map<SceneId, { flashback: boolean; dream: boolean }> {
  const map = new Map<SceneId, { flashback: boolean; dream: boolean }>();
  for (const chapter of project.chapters) {
    for (const scene of chapter.scenes) {
      map.set(scene.id, { flashback: scene.flashback ?? false, dream: scene.dream ?? false });
    }
  }
  return map;
}

/**
 * Flag any appearance of a character in a non-flashback, non-dream scene
 * at a world time strictly after that character's DEATH event.
 *
 * One issue is emitted per offending moment, naming both the death moment
 * and the ghost appearance for easy navigation.
 */
export function checkDeadOrGone(project: Project): Issue[] {
  const deaths = collectDeaths(project);
  if (deaths.size === 0) return [];

  const appearances = buildCharacterAppearances(project);
  const sceneFlags = buildSceneFlags(project);
  const charNameById = new Map(project.characters.map((c) => [c.id, c.name]));
  const issues: Issue[] = [];

  for (const [charId, death] of deaths) {
    const charAppearances = appearances.get(charId) ?? [];

    for (const a of charAppearances) {
      if (a.worldTime <= death.worldTime) continue;

      const flags = sceneFlags.get(a.sceneId);
      if (flags?.flashback || flags?.dream) continue;

      issues.push({
        rule: "dead-or-gone",
        severity: "error",
        message: `${charNameById.get(charId) ?? charId} appears at world time ${a.worldTime} but died at ${death.worldTime}`,
        characterId: charId,
        sceneIds: [death.sceneId, a.sceneId],
        momentIds: [death.momentId, a.momentId],
      });
    }
  }

  return issues;
}
