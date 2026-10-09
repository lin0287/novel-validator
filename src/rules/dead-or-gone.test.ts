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
});
