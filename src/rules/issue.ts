import type { CharacterId, MomentId, SceneId } from "../types.js";

export type Severity = "error" | "warning";

export type RuleName =
  | "double-presence"
  | "impossible-travel"
  | "dead-or-gone"
  | "scene-time-order";

export interface Issue {
  rule: RuleName;
  severity: Severity;
  message: string;
  characterId?: CharacterId;
  sceneIds: SceneId[];
  momentIds: MomentId[];
  /** Suppressed by the author; survives re-checks. */
  dismissed?: boolean;
}
