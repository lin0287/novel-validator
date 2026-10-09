import type { LocationId, Project, Route } from "../types.js";
import { buildCharacterAppearances } from "./collect-appearances.js";
import type { Issue } from "./issue.js";

/**
 * Dijkstra over the route graph, using the fastest available travel mode on
 * each edge. Returns the shortest travel time in minutes, or null if the two
 * locations are not connected by any path in the routes.
 */
export function shortestTravelTime(
  from: LocationId,
  to: LocationId,
  routes: Route[],
): number | null {
  if (from === to) return 0;

  const dist = new Map<LocationId, number>();
  dist.set(from, 0);

  // [cost, nodeId] — sorted by cost ascending each iteration (small graph, fine)
  const queue: [number, LocationId][] = [[0, from]];

  while (queue.length > 0) {
    queue.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
    const entry = queue.shift();
    if (!entry) break;
    const [cost, node] = entry;

    if (node === to) return cost;
    if (cost > (dist.get(node) ?? Infinity)) continue;

    for (const route of routes) {
      if (route.fromId !== node) continue;
      const times = (Object.values(route.travelTime) as (number | undefined)[]).filter(
        (v): v is number => v !== undefined,
      );
      if (times.length === 0) continue;
      const edgeCost = Math.min(...times);
      const newCost = cost + edgeCost;
      if (newCost < (dist.get(route.toId) ?? Infinity)) {
        dist.set(route.toId, newCost);
        queue.push([newCost, route.toId]);
      }
    }
  }

  return null; // no path
}

/**
 * Flag any character whose consecutive appearances (sorted by world time) are
 * in different locations with a time gap smaller than the shortest known route
 * between those locations.
 *
 * Pairs at identical world times are skipped — those are caught by the
 * double-presence rule.
 */
export function checkImpossibleTravel(project: Project): Issue[] {
  const byChar = buildCharacterAppearances(project);
  const charNameById = new Map(project.characters.map((c) => [c.id, c.name]));
  const issues: Issue[] = [];

  for (const [charId, appearances] of byChar) {
    for (let i = 0; i < appearances.length - 1; i++) {
      const a = appearances[i]!;
      const b = appearances[i + 1]!;

      if (a.locationId === b.locationId) continue;
      const gap = b.worldTime - a.worldTime;
      if (gap <= 0) continue; // same time: double-presence handles this

      const minTravel = shortestTravelTime(a.locationId, b.locationId, project.routes);
      if (minTravel === null || gap >= minTravel) continue;

      const fromName =
        project.locations.find((l) => l.id === a.locationId)?.name ?? a.locationId;
      const toName =
        project.locations.find((l) => l.id === b.locationId)?.name ?? b.locationId;

      issues.push({
        rule: "impossible-travel",
        severity: "error",
        message: `${charNameById.get(charId) ?? charId} travels ${fromName} → ${toName} in ${gap} min but the fastest route takes ${minTravel} min`,
        characterId: charId,
        sceneIds: [...new Set([a.sceneId, b.sceneId])],
        momentIds: [a.momentId, b.momentId],
      });
    }
  }

  return issues;
}
