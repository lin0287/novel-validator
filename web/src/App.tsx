import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project, Scene, Character, Item, Location } from "@engine/types.js";
import type { Issue } from "@engine/rules/issue.js";
import { loadProject, loadSceneTexts, saveProject, saveSceneTexts } from "./lib/store";
import { runAllChecks } from "./lib/runChecks";
import Sidebar from "./components/Sidebar";
import SceneEditor from "./components/SceneEditor";
import IssuesPanel from "./components/IssuesPanel";
import ProfileEditor, { type ProfileKind } from "./components/ProfileEditor";

export type AppSelection =
  | { kind: "scene"; sceneId: string }
  | { kind: "profile"; profileKind: ProfileKind; entityId: string }
  | null;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [project, setProject] = useState<Project>(() => loadProject());
  const [sceneTexts, setSceneTexts] = useState<Record<string, string>>(() => loadSceneTexts());
  const [selection, setSelection] = useState<AppSelection>(null);

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
    if (selection?.kind !== "scene") return null;
    for (const ch of project.chapters) {
      const found = ch.scenes.find((s) => s.id === selection.sceneId);
      if (found) return found;
    }
    return null;
  }, [project, selection]);

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

  // Profile CRUD
  const handleCreateProfile = useCallback((kind: ProfileKind) => {
    const id = `${kind.slice(0, 4)}-${uid()}`;
    let updated: Project;
    if (kind === "character") {
      const newChar: Character = { id, name: "New Character" };
      updated = { ...project, characters: [...project.characters, newChar] };
    } else if (kind === "item") {
      const newItem: Item = { id, name: "New Item", kind: "item" };
      updated = { ...project, items: [...project.items, newItem] };
    } else {
      const newLoc: Location = { id, name: "New Location" };
      updated = { ...project, locations: [...project.locations, newLoc] };
    }
    setProject(updated);
    setSelection({ kind: "profile", profileKind: kind, entityId: id });
  }, [project]);

  const handleDeleteProfile = useCallback((kind: ProfileKind, id: string) => {
    let updated: Project;
    if (kind === "character") {
      updated = { ...project, characters: project.characters.filter((c) => c.id !== id) };
    } else if (kind === "item") {
      updated = { ...project, items: project.items.filter((i) => i.id !== id) };
    } else {
      updated = { ...project, locations: project.locations.filter((l) => l.id !== id) };
    }
    setProject(updated);
    // Deselect if the deleted entity was selected
    if (
      selection?.kind === "profile" &&
      selection.profileKind === kind &&
      selection.entityId === id
    ) {
      setSelection(null);
    }
  }, [project, selection]);

  const selectedSceneId =
    selection?.kind === "scene" ? selection.sceneId : null;

  return (
    <div className="app-layout">
      <Sidebar
        project={project}
        selection={selection}
        issuesByScene={issuesByScene}
        onSelectScene={(id) => setSelection({ kind: "scene", sceneId: id })}
        onSelectProfile={(kind, id) =>
          setSelection({ kind: "profile", profileKind: kind, entityId: id })
        }
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
      />

      <main className="app-editor">
        {selection?.kind === "profile" ? (
          <ProfileEditor
            key={`${selection.profileKind}-${selection.entityId}`}
            profileKind={selection.profileKind}
            entityId={selection.entityId}
            project={project}
            onProjectChange={setProject}
          />
        ) : selectedScene ? (
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
            <p>Select a scene or codex entry from the sidebar.</p>
          </div>
        )}
      </main>

      <IssuesPanel
        issues={issues}
        project={project}
        selectedSceneId={selectedSceneId}
        onSelectScene={(id) => setSelection({ kind: "scene", sceneId: id })}
      />
    </div>
  );
}
