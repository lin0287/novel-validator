import type { CharacterId, LocationId, MomentId, Project, SceneId, WorldTime } from "../types.js";

export interface CharacterAppearance {
  characterId: CharacterId;
  worldTime: WorldTime;
  locationId: LocationId;
  sceneId: SceneId;
  momentId: MomentId;
}

/**
 * Collect every moment each character appears in, grouped by character and
 * sorted by worldTime ascending. Characters with no moments are omitted.
 */
export function buildCharacterAppearances(
  project: Project,
): Map<CharacterId, CharacterAppearance[]> {
  const map = new Map<CharacterId, CharacterAppearance[]>();

  for (const chapter of project.chapters) {
    for (const scene of chapter.scenes) {
      for (const moment of scene.moments) {
        for (const characterId of moment.characterIds) {
          let list = map.get(characterId);
          if (!list) {
            list = [];
            map.set(characterId, list);
          }
          list.push({
            characterId,
            worldTime: moment.worldTime,
            locationId: moment.locationId,
            sceneId: scene.id,
            momentId: moment.id,
          });
        }
      }
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.worldTime - b.worldTime);
  }

  return map;
}
