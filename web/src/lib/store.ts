import type { Project } from "@engine/types.js";
import sampleStory from "../../../data/sample-story.json";

const PROJECT_KEY = "novel-validator-project";
const TEXTS_KEY = "novel-validator-texts";

export function loadProject(): Project {
  try {
    const stored = localStorage.getItem(PROJECT_KEY);
    if (stored) {
      const p = JSON.parse(stored) as Project;
      // Migrate data saved before the items field existed
      if (!p.items) p.items = [];
      return p;
    }
  } catch {
    // ignore parse errors — fall through to default
  }
  return sampleStory as Project;
}

export function saveProject(project: Project): void {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
  } catch {
    // storage quota exceeded or similar — silently ignore
  }
}

export function loadSceneTexts(): Record<string, string> {
  try {
    const stored = localStorage.getItem(TEXTS_KEY);
    if (stored) return JSON.parse(stored) as Record<string, string>;
  } catch {
    // ignore
  }
  return {};
}

export function saveSceneTexts(texts: Record<string, string>): void {
  try {
    localStorage.setItem(TEXTS_KEY, JSON.stringify(texts));
  } catch {
    // ignore
  }
}
