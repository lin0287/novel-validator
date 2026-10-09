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
});
