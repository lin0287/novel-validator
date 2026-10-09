import type { Project } from "@engine/types.js";
import type { Issue } from "@engine/rules/issue.js";

interface Props {
  project: Project;
  selectedSceneId: string | null;
  issuesByScene: Map<string, Issue[]>;
  onSelectScene: (id: string) => void;
}

export default function Sidebar({ project, selectedSceneId, issuesByScene, onSelectScene }: Props) {
  function errorCount(sceneId: string) {
    return issuesByScene.get(sceneId)?.filter((i) => i.severity === "error").length ?? 0;
  }
  function warnCount(sceneId: string) {
    return issuesByScene.get(sceneId)?.filter((i) => i.severity === "warning").length ?? 0;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{project.title}</span>
      </div>
      <nav className="sidebar-nav">
        {project.chapters.map((ch) => (
          <div key={ch.id} className="chapter">
            <div className="chapter-label">
              Ch. {ch.order} · {ch.title ?? "Untitled"}
            </div>
            {ch.scenes.map((sc) => {
              const errs = errorCount(sc.id);
              const warns = warnCount(sc.id);
              return (
                <button
                  key={sc.id}
                  className={`scene-item${sc.id === selectedSceneId ? " active" : ""}`}
                  onClick={() => onSelectScene(sc.id)}
                >
                  <span className="scene-title">{sc.title ?? `Scene ${sc.order}`}</span>
                  <span className="scene-badges">
                    {errs > 0 && <span className="badge error">{errs}</span>}
                    {warns > 0 && <span className="badge warn">{warns}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
