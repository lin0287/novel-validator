import type { Project } from "@engine/types.js";
import type { Issue, RuleName } from "@engine/rules/issue.js";

const RULE_LABELS: Record<RuleName, string> = {
  "double-presence": "Double Presence",
  "impossible-travel": "Impossible Travel",
  "dead-or-gone": "Dead or Gone",
  "scene-time-order": "Scene Time Order",
};

interface Props {
  issues: Issue[];
  project: Project;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
}

export default function IssuesPanel({ issues, project, selectedSceneId, onSelectScene }: Props) {
  const charName = (id: string) =>
    project.characters.find((c) => c.id === id)?.name ?? id;

  const hasErrors = issues.some((i) => i.severity === "error");

  return (
    <aside className="issues-panel">
      <div className="issues-header">
        <span>Issues</span>
        <span className={`issues-count${hasErrors ? " has-errors" : ""}`}>
          {issues.length}
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="no-issues">✓ No continuity issues found</div>
      ) : (
        <div className="issues-list">
          {issues.map((issue, idx) => {
            const firstScene = issue.sceneIds[0];
            const isActive =
              selectedSceneId !== null && issue.sceneIds.includes(selectedSceneId);
            return (
              <button
                key={idx}
                className={`issue-item${isActive ? " active" : ""}`}
                onClick={() => {
                  if (firstScene) onSelectScene(firstScene);
                }}
              >
                <div className="issue-badge">
                  <span className={`severity-dot ${issue.severity}`} />
                  <span className="rule-label">{RULE_LABELS[issue.rule]}</span>
                </div>
                <p className="issue-message">{issue.message}</p>
                {issue.characterId !== undefined && (
                  <span className="issue-char">{charName(issue.characterId)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}
