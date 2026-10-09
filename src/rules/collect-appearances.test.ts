import { describe, expect, it } from "vitest";
import type { Chapter, Project } from "../types.js";
import { buildCharacterAppearances } from "./collect-appearances.js";

const BASE_CALENDAR = {
  monthNames: ["Frost", "Thaw", "Bloom", "Harvest"],
  daysPerMonth: [30, 30, 30, 30],
  minutesPerDay: 1440,
};

function makeProject(chapters: Chapter[]): Project {
  return {
    id: "proj-test",
    title: "Test",
    characters: [],
    locations: [],
    items: [],
    routes: [],
    chapters,
    calendar: BASE_CALENDAR,
  };
}

describe("buildCharacterAppearances", () => {
  it("returns an empty map for a project with no chapters", () => {
    const result = buildCharacterAppearances(makeProject([]));
    expect(result.size).toBe(0);
  });

  it("returns an empty map when scenes have no characters", () => {
    const project = makeProject([
      {
        id: "ch-1",
        projectId: "proj-test",
        order: 1,
        scenes: [
          {
            id: "sc-1",
            chapterId: "ch-1",
            order: 1,
            moments: [
              {
                id: "mom-1",
                sceneId: "sc-1",
                worldTime: 100,
                locationId: "loc-a",
                characterIds: [],
              },
            ],
          },
        ],
      },
    ]);
    expect(buildCharacterAppearances(project).size).toBe(0);
  });

  it("collects a single character from a single moment", () => {
    const project = makeProject([
      {
        id: "ch-1",
        projectId: "proj-test",
        order: 1,
        scenes: [
          {
            id: "sc-1",
            chapterId: "ch-1",
            order: 1,
            moments: [
              {
                id: "mom-1",
                sceneId: "sc-1",
                worldTime: 500,
                locationId: "loc-a",
                characterIds: ["char-a"],
              },
            ],
          },
        ],
      },
    ]);
    const result = buildCharacterAppearances(project);
    expect(result.size).toBe(1);
    const appearances = result.get("char-a")!;
    expect(appearances).toHaveLength(1);
    expect(appearances[0]).toMatchObject({
      characterId: "char-a",
      worldTime: 500,
      locationId: "loc-a",
      sceneId: "sc-1",
      momentId: "mom-1",
    });
  });

  it("collects multiple characters from the same moment", () => {
    const project = makeProject([
      {
        id: "ch-1",
        projectId: "proj-test",
        order: 1,
        scenes: [
          {
            id: "sc-1",
            chapterId: "ch-1",
            order: 1,
            moments: [
              {
                id: "mom-1",
                sceneId: "sc-1",
                worldTime: 200,
                locationId: "loc-a",
                characterIds: ["char-a", "char-b", "char-c"],
              },
            ],
          },
        ],
      },
    ]);
    const result = buildCharacterAppearances(project);
    expect(result.size).toBe(3);
    expect(result.get("char-a")).toHaveLength(1);
    expect(result.get("char-b")).toHaveLength(1);
    expect(result.get("char-c")).toHaveLength(1);
  });

  it("sorts appearances by worldTime ascending regardless of scene order", () => {
    const project = makeProject([
      {
        id: "ch-1",
        projectId: "proj-test",
        order: 1,
        scenes: [
          {
            id: "sc-later",
            chapterId: "ch-1",
            order: 2,
            moments: [
              {
                id: "mom-later",
                sceneId: "sc-later",
                worldTime: 9000,
                locationId: "loc-b",
                characterIds: ["char-a"],
              },
            ],
          },
          {
            id: "sc-earlier",
            chapterId: "ch-1",
            order: 1,
            moments: [
              {
                id: "mom-earlier",
                sceneId: "sc-earlier",
                worldTime: 1000,
                locationId: "loc-a",
                characterIds: ["char-a"],
              },
            ],
          },
        ],
      },
    ]);
    const appearances = buildCharacterAppearances(project).get("char-a")!;
    expect(appearances).toHaveLength(2);
    expect(appearances[0]!.worldTime).toBe(1000);
    expect(appearances[1]!.worldTime).toBe(9000);
  });

  it("sorts appearances across chapters", () => {
    const project = makeProject([
      {
        id: "ch-2",
        projectId: "proj-test",
        order: 2,
        scenes: [
          {
            id: "sc-ch2",
            chapterId: "ch-2",
            order: 1,
            moments: [
              {
                id: "mom-ch2",
                sceneId: "sc-ch2",
                worldTime: 5000,
                locationId: "loc-b",
                characterIds: ["char-a"],
              },
            ],
          },
        ],
      },
      {
        id: "ch-1",
        projectId: "proj-test",
        order: 1,
        scenes: [
          {
            id: "sc-ch1",
            chapterId: "ch-1",
            order: 1,
            moments: [
              {
                id: "mom-ch1",
                sceneId: "sc-ch1",
                worldTime: 100,
                locationId: "loc-a",
                characterIds: ["char-a"],
              },
            ],
          },
        ],
      },
    ]);
    const appearances = buildCharacterAppearances(project).get("char-a")!;
    expect(appearances[0]!.worldTime).toBe(100);
    expect(appearances[1]!.worldTime).toBe(5000);
  });

  it("accumulates all moments for a character who appears many times", () => {
    const moments = Array.from({ length: 5 }, (_, i) => ({
      id: `mom-${i}`,
      sceneId: "sc-1",
      worldTime: i * 100,
      locationId: "loc-a",
      characterIds: ["char-a"],
    }));
    const project = makeProject([
      {
        id: "ch-1",
        projectId: "proj-test",
        order: 1,
        scenes: [{ id: "sc-1", chapterId: "ch-1", order: 1, moments }],
      },
    ]);
    expect(buildCharacterAppearances(project).get("char-a")).toHaveLength(5);
  });

  it("does not include characters not present in any moment", () => {
    const project = makeProject([
      {
        id: "ch-1",
        projectId: "proj-test",
        order: 1,
        scenes: [
          {
            id: "sc-1",
            chapterId: "ch-1",
            order: 1,
            moments: [
              {
                id: "mom-1",
                sceneId: "sc-1",
                worldTime: 100,
                locationId: "loc-a",
                characterIds: ["char-present"],
              },
            ],
          },
        ],
      },
    ]);
    const result = buildCharacterAppearances(project);
    expect(result.has("char-present")).toBe(true);
    expect(result.has("char-absent")).toBe(false);
  });

  it("records correct sceneId and momentId on each appearance", () => {
    const project = makeProject([
      {
        id: "ch-1",
        projectId: "proj-test",
        order: 1,
        scenes: [
          {
            id: "sc-alpha",
            chapterId: "ch-1",
            order: 1,
            moments: [
              {
                id: "mom-alpha-1",
                sceneId: "sc-alpha",
                worldTime: 1000,
                locationId: "loc-a",
                characterIds: ["char-a"],
              },
            ],
          },
          {
            id: "sc-beta",
            chapterId: "ch-1",
            order: 2,
            moments: [
              {
                id: "mom-beta-1",
                sceneId: "sc-beta",
                worldTime: 2000,
                locationId: "loc-b",
                characterIds: ["char-a"],
              },
            ],
          },
        ],
      },
    ]);
    const appearances = buildCharacterAppearances(project).get("char-a")!;
    expect(appearances[0]).toMatchObject({ sceneId: "sc-alpha", momentId: "mom-alpha-1" });
    expect(appearances[1]).toMatchObject({ sceneId: "sc-beta", momentId: "mom-beta-1" });
  });
});
