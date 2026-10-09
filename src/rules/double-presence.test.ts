import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Project } from "../types.js";
import { checkDoublePresence } from "./double-presence.js";

const storyPath = join(import.meta.dirname, "../../data/sample-story.json");
const story = JSON.parse(readFileSync(storyPath, "utf-8")) as Project;

describe("checkDoublePresence", () => {
  it("finds exactly one issue in the sample story", () => {
    const issues = checkDoublePresence(story);
    expect(issues).toHaveLength(1);
  });

  it("flags Lyra as the offending character", () => {
    const issues = checkDoublePresence(story);
    expect(issues[0]?.characterId).toBe("char-lyra");
  });

  it("names both scenes (sc-06 and sc-08) in the issue", () => {
    const issues = checkDoublePresence(story);
    const sceneIds = issues[0]?.sceneIds ?? [];
    expect(sceneIds).toContain("sc-06");
    expect(sceneIds).toContain("sc-08");
  });

  it("names both moments (mom-06-b and mom-08-a) in the issue", () => {
    const issues = checkDoublePresence(story);
    const momentIds = issues[0]?.momentIds ?? [];
    expect(momentIds).toContain("mom-06-b");
    expect(momentIds).toContain("mom-08-a");
  });

  it("severity is error", () => {
    const issues = checkDoublePresence(story);
    expect(issues[0]?.severity).toBe("error");
  });

  it("produces no issues for Daron", () => {
    const issues = checkDoublePresence(story);
    expect(issues.filter((i) => i.characterId === "char-daron")).toHaveLength(0);
  });

  it("produces no issues for Cress", () => {
    const issues = checkDoublePresence(story);
    expect(issues.filter((i) => i.characterId === "char-cress")).toHaveLength(0);
  });

  it("returns no issues for a story with no duplicates", () => {
    const clean: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-x",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-x-a",
                  sceneId: "sc-x",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-lyra"],
                },
                {
                  id: "mom-x-b",
                  sceneId: "sc-x",
                  worldTime: 1060,
                  locationId: "loc-ashvale",
                  characterIds: ["char-lyra"],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(checkDoublePresence(clean)).toHaveLength(0);
  });

  it("returns no issues for an empty project", () => {
    const empty: Project = { ...story, chapters: [] };
    expect(checkDoublePresence(empty)).toHaveLength(0);
  });

  it("does not flag same character at same time in the same location", () => {
    // Two moments in the same scene: identical worldTime AND same location → no issue
    const sameLocation: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-x",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-x-a",
                  sceneId: "sc-x",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-lyra"],
                },
                {
                  id: "mom-x-b",
                  sceneId: "sc-x",
                  worldTime: 1000, // same time
                  locationId: "loc-ashvale", // same location
                  characterIds: ["char-lyra"],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(checkDoublePresence(sameLocation)).toHaveLength(0);
  });

  it("flags a character appearing in three different locations at the same time as one issue", () => {
    const threeLocations: Project = {
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
                  characterIds: ["char-lyra"],
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
                  worldTime: 1000,
                  locationId: "loc-ironport",
                  characterIds: ["char-lyra"],
                },
              ],
            },
            {
              id: "sc-x3",
              chapterId: "ch-x",
              order: 3,
              moments: [
                {
                  id: "mom-x3",
                  sceneId: "sc-x3",
                  worldTime: 1000,
                  locationId: "loc-omel",
                  characterIds: ["char-lyra"],
                },
              ],
            },
          ],
        },
      ],
    };
    const issues = checkDoublePresence(threeLocations);
    // One issue per (character, worldTime) group — three locations still = one issue
    expect(issues).toHaveLength(1);
    expect(issues[0]?.characterId).toBe("char-lyra");
    expect(issues[0]?.message).toContain("3 locations");
  });

  it("flags each character independently when multiple have double presence", () => {
    const multiChar: Project = {
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
                  characterIds: ["char-lyra", "char-daron"],
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
                  worldTime: 1000,
                  locationId: "loc-ironport",
                  characterIds: ["char-lyra", "char-daron"],
                },
              ],
            },
          ],
        },
      ],
    };
    const issues = checkDoublePresence(multiChar);
    expect(issues).toHaveLength(2);
    const charIds = new Set(issues.map((i) => i.characterId));
    expect(charIds).toContain("char-lyra");
    expect(charIds).toContain("char-daron");
  });

  it("two characters at same time in different locations does not cross-flag them", () => {
    // Lyra in Ashvale at t=1000, Daron in Ironport at t=1000 — no issue for either
    const differentChars: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-x",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-x",
                  sceneId: "sc-x",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-lyra"],
                },
                {
                  id: "mom-y",
                  sceneId: "sc-x",
                  worldTime: 1000,
                  locationId: "loc-ironport",
                  characterIds: ["char-daron"],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(checkDoublePresence(differentChars)).toHaveLength(0);
  });
});
