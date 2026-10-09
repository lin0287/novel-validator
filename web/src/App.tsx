import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project, Scene } from "@engine/types.js";
import type { Issue } from "@engine/rules/issue.js";
import { loadProject, loadSceneTexts, saveProject, saveSceneTexts } from "./lib/store";
import { runAllChecks } from "./lib/runChecks";
import Sidebar from "./components/Sidebar";
import SceneEditor from "./components/SceneEditor";
import IssuesPanel from "./components/IssuesPanel";

export default function App() {
  const [project, setProject] = useState<Project>(() => loadProject());
  const [sceneTexts, setSceneTexts] = useState<Record<string, string>>(() => loadSceneTexts());
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Persist on every change
  useEffect(() => {
    saveProject(project);
  }, [project]);

  useEffect(() => {
    saveSceneTexts(sceneTexts);
  }, [sceneTexts]);

  // Run all continuity checks whenever the project changes
  const issues = useMemo<Issue[]>(() => runAllChecks(project), [project]);

  // Map each scene id to the issues that mention it
  const issuesByScene = useMemo<Map<string, Issue[]>>(() => {
    const map = new Map<string, Issue[]>();
    for (const issue of issues) {
      for (const sceneId of issue.sceneIds) {
        const list = map.get(sceneId) ?? [];
        list.push(issue);
        map.set(sceneId, list);
      }
    }
    return map;
  }, [issues]);

  // Find the selected scene object
  const selectedScene = useMemo<Scene | null>(() => {
    if (!selectedSceneId) return null;
    for (const ch of project.chapters) {
      const found = ch.scenes.find((s) => s.id === selectedSceneId);
      if (found) return found;
    }
    return null;
  }, [project, selectedSceneId]);

  const handleSceneChange = useCallback((updated: Scene) => {
    setProject((prev) => ({
      ...prev,
      chapters: prev.chapters.map((ch) => ({
        ...ch,
        scenes: ch.scenes.map((s) => (s.id === updated.id ? updated : s)),
      })),
    }));
  }, []);

  const handleTextChange = useCallback((sceneId: string, html: string) => {
    setSceneTexts((prev) => ({ ...prev, [sceneId]: html }));
  }, []);

  return (
    <div className="app-layout">
      <Sidebar
        project={project}
        selectedSceneId={selectedSceneId}
        issuesByScene={issuesByScene}
        onSelectScene={setSelectedSceneId}
      />

      <main className="app-editor">
        {selectedScene ? (
          <SceneEditor
            key={selectedSceneId}
            scene={selectedScene}
            project={project}
            sceneText={sceneTexts[selectedScene.id] ?? ""}
            onSceneChange={handleSceneChange}
            onTextChange={(html) => handleTextChange(selectedScene.id, html)}
          />
        ) : (
          <div className="no-scene">
            <p>Select a scene from the sidebar to start editing.</p>
          </div>
        )}
      </main>

      <IssuesPanel
        issues={issues}
        project={project}
        selectedSceneId={selectedSceneId}
        onSelectScene={setSelectedSceneId}
      />
    </div>
  );
}
