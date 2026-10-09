import { useState } from "react";
import type { Project } from "@engine/types.js";
import type { Issue } from "@engine/rules/issue.js";
import type { ProfileKind } from "./ProfileEditor";
import type { AppSelection } from "../App";

interface Props {
  project: Project;
  selection: AppSelection;
  issuesByScene: Map<string, Issue[]>;
  onSelectScene: (id: string) => void;
  onSelectProfile: (kind: ProfileKind, id: string) => void;
  onCreateProfile: (kind: ProfileKind) => void;
  onDeleteProfile: (kind: ProfileKind, id: string) => void;
  onAddChapter: () => void;
  onAddScene: (chapterId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onRenameChapter: (chapterId: string, title: string) => void;
}

const PROFILE_SECTIONS: { kind: ProfileKind; label: string }[] = [
  { kind: "character", label: "Characters" },
  { kind: "item", label: "Items & Equipment" },
  { kind: "location", label: "Locations" },
];

export default function Sidebar({
  project,
  selection,
  issuesByScene,
  onSelectScene,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
  onAddChapter,
  onAddScene,
  onDeleteScene,
  onRenameChapter,
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function errorCount(sceneId: string) {
    return issuesByScene.get(sceneId)?.filter((i) => i.severity === "error").length ?? 0;
  }
  function warnCount(sceneId: string) {
    return issuesByScene.get(sceneId)?.filter((i) => i.severity === "warning").length ?? 0;
  }

  function entitiesFor(kind: ProfileKind) {
    if (kind === "character") return project.characters.map((c) => ({ id: c.id, name: c.name }));
    if (kind === "item") return project.items.map((i) => ({ id: i.id, name: i.name }));
    return project.locations.map((l) => ({ id: l.id, name: l.name }));
  }

  const selectedSceneId =
    selection?.kind === "scene" ? selection.sceneId : null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{project.title}</span>
      </div>

      {/* Chapters & scenes */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">
          Manuscript
          <button
            className="profile-add-btn"
            onClick={onAddChapter}
            title="Add chapter"
          >
            +
          </button>
        </div>
        {project.chapters.map((ch) => (
          <div key={ch.id} className="chapter">
            <div className="chapter-label">
              <span className="chapter-num">Ch. {ch.order}</span>
              <input
                className="chapter-title-input"
                value={ch.title ?? ""}
                placeholder="Untitled"
                onChange={(e) => onRenameChapter(ch.id, e.target.value)}
              />
              <button
                className="profile-add-btn"
                onClick={() => onAddScene(ch.id)}
                title="Add scene"
              >
                +
              </button>
            </div>
            {ch.scenes.map((sc) => {
              const errs = errorCount(sc.id);
              const warns = warnCount(sc.id);
              return (
                <div
                  key={sc.id}
                  className={`scene-item${sc.id === selectedSceneId ? " active" : ""}`}
                >
                  <button
                    className="scene-item-label"
                    onClick={() => onSelectScene(sc.id)}
                  >
                    <span className="scene-title">{sc.title ?? `Scene ${sc.order}`}</span>
                    <span className="scene-badges">
                      {errs > 0 && <span className="badge error">{errs}</span>}
                      {warns > 0 && <span className="badge warn">{warns}</span>}
                    </span>
                  </button>
                  <button
                    className="profile-item-delete"
                    onClick={() => onDeleteScene(sc.id)}
                    title="Delete scene"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Profiles */}
      <div className="sidebar-profiles">
        <div className="sidebar-section-label">Codex</div>
        {PROFILE_SECTIONS.map(({ kind, label }) => {
          const entities = entitiesFor(kind);
          const isCollapsed = collapsed.has(kind);
          return (
            <div key={kind} className="profile-group">
              <div className="profile-group-header">
                <button
                  className="profile-group-toggle"
                  onClick={() => toggleCollapse(kind)}
                  title={isCollapsed ? "Expand" : "Collapse"}
                >
                  <span className={`collapse-arrow${isCollapsed ? " collapsed" : ""}`}>▾</span>
                  {label}
                  <span className="profile-count">{entities.length}</span>
                </button>
                <button
                  className="profile-add-btn"
                  onClick={() => onCreateProfile(kind)}
                  title={`Add ${kind}`}
                >
                  +
                </button>
              </div>
              {!isCollapsed && (
                <div className="profile-list">
                  {entities.length === 0 ? (
                    <div className="profile-empty">None yet</div>
                  ) : (
                    entities.map((e) => {
                      const isActive =
                        selection?.kind === "profile" &&
                        selection.profileKind === kind &&
                        selection.entityId === e.id;
                      return (
                        <div
                          key={e.id}
                          className={`profile-item${isActive ? " active" : ""}`}
                        >
                          <button
                            className="profile-item-label"
                            onClick={() => onSelectProfile(kind, e.id)}
                          >
                            {e.name || "Unnamed"}
                          </button>
                          <button
                            className="profile-item-delete"
                            onClick={() => onDeleteProfile(kind, e.id)}
                            title={`Delete ${e.name}`}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
