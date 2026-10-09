import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Project, Scene } from "../types.js";
import { checkDeadOrGone } from "./dead-or-gone.js";

const storyPath = join(import.meta.dirname, "../../data/sample-story.json");
const story = JSON.parse(readFileSync(storyPath, "utf-8")) as Project;

describe("checkDeadOrGone", () => {
  it("finds exactly one issue in the sample story", () => {
    expect(checkDeadOrGone(story)).toHaveLength(1);
  });

  it("flags Cress as the offending character", () => {
    const issues = checkDeadOrGone(story);
    expect(issues[0]?.characterId).toBe("char-cress");
  });

  it("names the death scene (sc-04) and the ghost scene (sc-10)", () => {
    const sceneIds = checkDeadOrGone(story)[0]?.sceneIds ?? [];
    expect(sceneIds).toContain("sc-04");
    expect(sceneIds).toContain("sc-10");
  });

  it("names the death moment (mom-04-b) and the ghost moment (mom-10-a)", () => {
    const momentIds = checkDeadOrGone(story)[0]?.momentIds ?? [];
    expect(momentIds).toContain("mom-04-b");
    expect(momentIds).toContain("mom-10-a");
  });

  it("severity is error", () => {
    expect(checkDeadOrGone(story)[0]?.severity).toBe("error");
  });

  it("produces no issues for Lyra or Daron", () => {
    const issues = checkDeadOrGone(story);
    expect(issues.filter((i) => i.characterId === "char-lyra")).toHaveLength(0);
    expect(issues.filter((i) => i.characterId === "char-daron")).toHaveLength(0);
  });

  it("returns no issues when there are no DEATH events", () => {
    const noDeaths: Project = {
      ...story,
      chapters: story.chapters.map((ch) => ({
        ...ch,
        scenes: ch.scenes.map((sc) => ({
          ...sc,
          moments: sc.moments.map((m) => ({
            ...m,
            events: (m.events ?? []).filter((e) => e.type !== "DEATH"),
          })),
        })),
      })),
    };
    expect(checkDeadOrGone(noDeaths)).toHaveLength(0);
  });

  it("exempts appearances in flashback scenes", () => {
    // Mark sc-10 as a flashback — Cress's post-death appearance should be ignored
    const withFlashback: Project = {
      ...story,
      chapters: story.chapters.map((ch) => ({
        ...ch,
        scenes: ch.scenes.map((sc): Scene => (sc.id === "sc-10" ? { ...sc, flashback: true } : sc)),
      })),
    };
    expect(checkDeadOrGone(withFlashback)).toHaveLength(0);
  });

  it("exempts appearances in dream scenes", () => {
    const withDream: Project = {
      ...story,
      chapters: story.chapters.map((ch) => ({
        ...ch,
        scenes: ch.scenes.map((sc): Scene => (sc.id === "sc-10" ? { ...sc, dream: true } : sc)),
      })),
    };
    expect(checkDeadOrGone(withDream)).toHaveLength(0);
  });

  it("does not flag appearances before or at the death worldTime", () => {
    // sc-04 has Cress at worldTimes 519960 and 520080 (the death moment)
    // Neither should generate an issue
    const issues = checkDeadOrGone(story);
    const momentIds = issues.flatMap((i) => i.momentIds);
    expect(momentIds).not.toContain("mom-04-a");
    // mom-04-b is the death moment itself — it appears as the *source* in sceneIds/momentIds
    // but not as a ghost appearance
    const ghostMoments = issues.map((i) => i.momentIds[1]);
    expect(ghostMoments).not.toContain("mom-04-b");
  });

  it("does not flag an appearance at exactly the same worldTime as the death", () => {
    const exactBoundary: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-death",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-death",
                  sceneId: "sc-death",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-cress"],
                  events: [
                    { type: "DEATH", entityId: "char-cress", worldTime: 1000, sceneId: "sc-death" },
                  ],
                },
              ],
            },
            {
              id: "sc-after",
              chapterId: "ch-x",
              order: 2,
              moments: [
                {
                  id: "mom-after",
                  sceneId: "sc-after",
                  worldTime: 1000, // same minute as death — should NOT be flagged
                  locationId: "loc-ashvale",
                  characterIds: ["char-cress"],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(checkDeadOrGone(exactBoundary)).toHaveLength(0);
  });

  it("uses the earliest DEATH when a character has two death events", () => {
    // Two death events at t=1000 and t=2000; only appearances after t=1000 should flag
    const twoDeaths: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-death1",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-d1",
                  sceneId: "sc-death1",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-cress"],
                  events: [
                    { type: "DEATH", entityId: "char-cress", worldTime: 1000, sceneId: "sc-death1" },
                  ],
                },
              ],
            },
            {
              id: "sc-death2",
              chapterId: "ch-x",
              order: 2,
              moments: [
                {
                  id: "mom-d2",
                  sceneId: "sc-death2",
                  worldTime: 2000,
                  locationId: "loc-ashvale",
                  characterIds: [],
                  events: [
                    { type: "DEATH", entityId: "char-cress", worldTime: 2000, sceneId: "sc-death2" },
                  ],
                },
              ],
            },
            {
              id: "sc-ghost",
              chapterId: "ch-x",
              order: 3,
              moments: [
                {
                  id: "mom-ghost",
                  sceneId: "sc-ghost",
                  worldTime: 1500, // after first death (1000) but before second (2000)
                  locationId: "loc-ironport",
                  characterIds: ["char-cress"],
                },
              ],
            },
          ],
        },
      ],
    };
    const issues = checkDeadOrGone(twoDeaths);
    // Should flag the ghost at t=1500 (it's after the earliest death at t=1000)
    expect(issues).toHaveLength(1);
    expect(issues[0]?.momentIds).toContain("mom-ghost");
  });

  it("produces one issue per post-death appearance, not one per character", () => {
    const multiGhost: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-death",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-death",
                  sceneId: "sc-death",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: ["char-cress"],
                  events: [
                    { type: "DEATH", entityId: "char-cress", worldTime: 1000, sceneId: "sc-death" },
                  ],
                },
              ],
            },
            {
              id: "sc-ghost1",
              chapterId: "ch-x",
              order: 2,
              moments: [
                {
                  id: "mom-ghost1",
                  sceneId: "sc-ghost1",
                  worldTime: 2000,
                  locationId: "loc-ironport",
                  characterIds: ["char-cress"],
                },
              ],
            },
            {
              id: "sc-ghost2",
              chapterId: "ch-x",
              order: 3,
              moments: [
                {
                  id: "mom-ghost2",
                  sceneId: "sc-ghost2",
                  worldTime: 3000,
                  locationId: "loc-omel",
                  characterIds: ["char-cress"],
                },
              ],
            },
          ],
        },
      ],
    };
    const issues = checkDeadOrGone(multiGhost);
    expect(issues).toHaveLength(2);
    const ghostMoments = issues.map((i) => i.momentIds.at(-1));
    expect(ghostMoments).toContain("mom-ghost1");
    expect(ghostMoments).toContain("mom-ghost2");
  });

  it("reports issues for multiple dead characters independently", () => {
    const twoDeadChars: Project = {
      ...story,
      chapters: [
        {
          id: "ch-x",
          projectId: story.id,
          order: 1,
          scenes: [
            {
              id: "sc-deaths",
              chapterId: "ch-x",
              order: 1,
              moments: [
                {
                  id: "mom-deaths",
                  sceneId: "sc-deaths",
                  worldTime: 1000,
                  locationId: "loc-ashvale",
                  characterIds: [],
                  events: [
                    { type: "DEATH", entityId: "char-lyra", worldTime: 1000, sceneId: "sc-deaths" },
                    { type: "DEATH", entityId: "char-daron", worldTime: 1000, sceneId: "sc-deaths" },
                  ],
                },
              ],
            },
            {
              id: "sc-ghosts",
              chapterId: "ch-x",
              order: 2,
              moments: [
                {
                  id: "mom-lyra-ghost",
                  sceneId: "sc-ghosts",
                  worldTime: 2000,
                  locationId: "loc-ironport",
                  characterIds: ["char-lyra"],
                },
                {
                  id: "mom-daron-ghost",
                  sceneId: "sc-ghosts",
                  worldTime: 2000,
                  locationId: "loc-ironport",
                  characterIds: ["char-daron"],
                },
              ],
            },
          ],
        },
      ],
    };
    const issues = checkDeadOrGone(twoDeadChars);
    expect(issues).toHaveLength(2);
    const chars = new Set(issues.map((i) => i.characterId));
    expect(chars).toContain("char-lyra");
    expect(chars).toContain("char-daron");
  });

  it("returns no issues for empty project", () => {
    expect(checkDeadOrGone({ ...story, chapters: [] })).toHaveLength(0);
  });
});
