import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Project, Route } from "../types.js";
import { checkImpossibleTravel, shortestTravelTime } from "./impossible-travel.js";

const storyPath = join(import.meta.dirname, "../../data/sample-story.json");
const story = JSON.parse(readFileSync(storyPath, "utf-8")) as Project;

describe("shortestTravelTime", () => {
  const routes: Route[] = story.routes;

  it("same location is 0", () => {
    expect(shortestTravelTime("loc-ashvale", "loc-ashvale", routes)).toBe(0);
  });

  it("direct edge uses fastest mode", () => {
    // Ashvale → Ridgepath: foot=480, horse=180 → fastest=180
    expect(shortestTravelTime("loc-ashvale", "loc-ridgepath", routes)).toBe(180);
  });

  it("two-hop path via Ridgepath: Ironport → Ashvale = 360 min", () => {
    // Ironport → Ridgepath (horse 180) → Ashvale (horse 180) = 360
    expect(shortestTravelTime("loc-ironport", "loc-ashvale", routes)).toBe(360);
  });

  it("two-hop path via Ridgepath: Ashvale → Ironport = 360 min", () => {
    expect(shortestTravelTime("loc-ashvale", "loc-ironport", routes)).toBe(360);
  });

  it("Ironport → Omel direct by ship = 360 min (faster than via Ridgepath)", () => {
    // Direct: ship=360. Via Ridgepath+Ashvale: 180+720=900.
    expect(shortestTravelTime("loc-ironport", "loc-omel", routes)).toBe(360);
  });

  it("returns null for a location with no connecting routes", () => {
    const isolated = [...routes, { fromId: "loc-unknown", toId: "loc-ashvale", travelTime: {} }];
    expect(shortestTravelTime("loc-ashvale", "loc-unknown", isolated)).toBeNull();
  });

  it("returns null when route list is empty", () => {
    expect(shortestTravelTime("loc-ashvale", "loc-ironport", [])).toBeNull();
  });

  it("returns null when only outgoing edges from 'from' exist but do not reach 'to'", () => {
    const dead: Route[] = [
      { fromId: "loc-a", toId: "loc-b", travelTime: { foot: 60 } },
      { fromId: "loc-b", toId: "loc-c", travelTime: { foot: 60 } },
    ];
    // loc-d is completely disconnected
    expect(shortestTravelTime("loc-a", "loc-d", dead)).toBeNull();
  });

  it("prefers multi-hop when it is faster than a direct edge", () => {
    const edged: Route[] = [
      { fromId: "loc-a", toId: "loc-b", travelTime: { foot: 1000 } }, // direct but slow
      { fromId: "loc-a", toId: "loc-c", travelTime: { horse: 10 } },
      { fromId: "loc-c", toId: "loc-b", travelTime: { horse: 10 } }, // via c: 20
    ];
    expect(shortestTravelTime("loc-a", "loc-b", edged)).toBe(20);
  });

  it("handles a cyclic route graph without looping forever", () => {
    const cyclic: Route[] = [
      { fromId: "loc-a", toId: "loc-b", travelTime: { foot: 60 } },
      { fromId: "loc-b", toId: "loc-a", travelTime: { foot: 60 } }, // cycle
      { fromId: "loc-b", toId: "loc-c", travelTime: { foot: 120 } },
    ];
    expect(shortestTravelTime("loc-a", "loc-c", cyclic)).toBe(180);
  });
});

describe("checkImpossibleTravel", () => {
  it("finds exactly one issue in the sample story", () => {
    const issues = checkImpossibleTravel(story);
    expect(issues).toHaveLength(1);
  });

  it("flags Daron as the offending character", () => {
    const issues = checkImpossibleTravel(story);
    expect(issues[0]?.characterId).toBe("char-daron");
  });

  it("names the two scenes involved", () => {
    const issues = checkImpossibleTravel(story);
    const sceneIds = issues[0]?.sceneIds ?? [];
    expect(sceneIds).toContain("sc-07");
    expect(sceneIds).toContain("sc-09");
  });

  it("names the two moments involved", () => {
    const issues = checkImpossibleTravel(story);
    const momentIds = issues[0]?.momentIds ?? [];
    expect(momentIds).toContain("mom-07-a");
    expect(momentIds).toContain("mom-09-a");
  });

  it("severity is error", () => {
    const issues = checkImpossibleTravel(story);
    expect(issues[0]?.severity).toBe("error");
  });

  it("message includes gap and minimum travel time", () => {
    const issues = checkImpossibleTravel(story);
    const msg = issues[0]?.message ?? "";
    expect(msg).toContain("1 hour");
    expect(msg).toContain("6 hours");
  });

  it("produces no issues for Lyra or Cress", () => {
    const issues = checkImpossibleTravel(story);
    expect(issues.filter((i) => i.characterId === "char-lyra")).toHaveLength(0);
    expect(issues.filter((i) => i.characterId === "char-cress")).toHaveLength(0);
  });

  it("returns no issues when travel times are sufficient", () => {
    const clean: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-x1",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-x1",
                  sceneId: "sc-x1",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-daron"],
                },
              ],
            },
            {
              id: "sc-x2",
              chapterId: "ch-x",
              order: 2,
              moments: [
                {
                  id: "mom-x2",
                  sceneId: "sc-x2",
                  // 360 min gap exactly meets the Ashvale→Ironport minimum
                  worldTime: 1360,
                  locationId: "loc-ironport",
                  characterIds: ["char-daron"],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(checkImpossibleTravel(clean)).toHaveLength(0);
  });

  it("flags when gap is one minute less than the minimum route", () => {
    // Ashvale→Ironport minimum is 360 min. Gap of 359 should flag.
    const tooFast: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-x1",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-x1",
                  sceneId: "sc-x1",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-daron"],
                },
              ],
            },
            {
              id: "sc-x2",
              chapterId: "ch-x",
              order: 2,
              moments: [
                {
                  id: "mom-x2",
                  sceneId: "sc-x2",
                  worldTime: 1359, // 359 min gap — one short
                  locationId: "loc-ironport",
                  characterIds: ["char-daron"],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(checkImpossibleTravel(tooFast)).toHaveLength(1);
  });

  it("returns no issues when there are no routes defined", () => {
    const noRoutes: Project = {
      ...story,
      routes: [], // remove all routes
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-x1",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-x1",
                  sceneId: "sc-x1",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-daron"],
                },
              ],
            },
            {
              id: "sc-x2",
              chapterId: "ch-x",
              order: 2,
              moments: [
                {
                  id: "mom-x2",
                  sceneId: "sc-x2",
                  worldTime: 1001, // near-instant travel, but no routes to compare against
                  locationId: "loc-ironport",
                  characterIds: ["char-daron"],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(checkImpossibleTravel(noRoutes)).toHaveLength(0);
  });

  it("returns no issues for a character with only one appearance", () => {
    const singleAppearance: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-x1",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-x1",
                  sceneId: "sc-x1",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-daron"],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(checkImpossibleTravel(singleAppearance)).toHaveLength(0);
  });

  it("skips consecutive appearances in the same location", () => {
    const sameLocation: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-x1",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-x1",
                  sceneId: "sc-x1",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-daron"],
                },
              ],
            },
            {
              id: "sc-x2",
              chapterId: "ch-x",
              order: 2,
              moments: [
                {
                  id: "mom-x2",
                  sceneId: "sc-x2",
                  worldTime: 1001, // near-instant but same location
                  locationId: "loc-ashvale",
                  characterIds: ["char-daron"],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(checkImpossibleTravel(sameLocation)).toHaveLength(0);
  });

  it("returns no issues for empty project", () => {
    expect(checkImpossibleTravel({ ...story, chapters: [] })).toHaveLength(0);
  });
});
