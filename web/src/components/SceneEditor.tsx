import { useCallback, useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import tippy, { type Instance } from "tippy.js";
import type { Project, Scene, Moment } from "@engine/types.js";
import { fromWorldTime, toWorldTime, formatWorldDate } from "@engine/world-time.js";
import MentionList, { type MentionItem, type MentionListRef } from "./MentionList";
import CharacterPicker from "./CharacterPicker";

interface Props {
  scene: Scene;
  project: Project;
  sceneText: string;
  onSceneChange: (scene: Scene) => void;
  onTextChange: (html: string) => void;
}

type WorldDateField = "year" | "month" | "day" | "hour" | "minute";

function makeDefaultMoment(sceneId: string, project: Project): Moment {
  return {
    id: `mom-${sceneId}-default`,
    sceneId,
    worldTime: 0,
    locationId: project.locations[0]?.id ?? "",
    characterIds: [],
  };
}

export default function SceneEditor({ scene, project, sceneText, onSceneChange, onTextChange }: Props) {
  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const primaryMoment: Moment = scene.moments[0] ?? makeDefaultMoment(scene.id, project);

  const worldDate = fromWorldTime(primaryMoment.worldTime, project.calendar);

  const updateScene = useCallback(
    (updates: Partial<Scene>) => {
      onSceneChange({ ...scene, ...updates } as Scene);
    },
    [scene, onSceneChange],
  );

  const updatePrimaryMoment = useCallback(
    (updates: Partial<Moment>) => {
      const updated: Moment = { ...primaryMoment, ...updates } as Moment;
      const rest = scene.moments.slice(1);
      onSceneChange({ ...scene, moments: [updated, ...rest] });
    },
    [scene, primaryMoment, onSceneChange],
  );

  const handleWorldDateChange = useCallback(
    (field: WorldDateField, raw: string) => {
      const value = parseInt(raw, 10);
      if (isNaN(value)) return;
      const newDate = { ...worldDate, [field]: value };
      updatePrimaryMoment({ worldTime: toWorldTime(newDate, project.calendar) });
    },
    [worldDate, project.calendar, updatePrimaryMoment],
  );

  const mentionExtension = useMemo(() => {
    return Mention.configure({
      HTMLAttributes: { class: "mention" },
      suggestion: {
        items({ query }: { query: string }): MentionItem[] {
          const chars = projectRef.current.characters.map((c) => ({
            id: c.id,
            label: c.name,
            type: "char" as const,
          }));
          const locs = projectRef.current.locations.map((l) => ({
            id: l.id,
            label: l.name,
            type: "loc" as const,
          }));
          return [...chars, ...locs]
            .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8);
        },

        render() {
          let component: ReactRenderer<MentionListRef>;
          let popup: Instance[];

          return {
            onStart(props) {
              component = new ReactRenderer(MentionList, {
                props,
                editor: props.editor,
              });
              if (!props.clientRect) return;
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              }) as unknown as Instance[];
            },

            onUpdate(props) {
              component?.updateProps(props);
              if (props.clientRect) {
                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              }
            },

            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup?.[0]?.hide();
                return true;
              }
              return (component?.ref as MentionListRef | null)?.onKeyDown(props) ?? false;
            },

            onExit() {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      },
    });
  }, []);

  const editor = useEditor({
    extensions: [StarterKit, mentionExtension],
    content: sceneText,
    onUpdate({ editor: ed }) {
      onTextChange(ed.getHTML());
    },
  });

  const maxDay = project.calendar.daysPerMonth[worldDate.month - 1] ?? 30;

  return (
    <div className="scene-editor">
      <div className="meta-section">
        {/* Title */}
        <div className="meta-row">
          <label>Title</label>
          <input
            type="text"
            value={scene.title ?? ""}
            placeholder="Untitled scene"
            onChange={(e) => updateScene({ title: e.target.value })}
          />
        </div>

        {/* Location */}
        <div className="meta-row">
          <label>Location</label>
          <select
            value={primaryMoment.locationId}
            onChange={(e) => updatePrimaryMoment({ locationId: e.target.value })}
          >
            {project.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Characters */}
        <div className="meta-row">
          <label>Characters</label>
          <CharacterPicker
            characters={project.characters}
            selectedIds={primaryMoment.characterIds}
            onChange={(ids) => updatePrimaryMoment({ characterIds: ids })}
          />
        </div>

        {/* World time */}
        <div className="meta-row">
          <label>World time</label>
          <div className="time-inputs">
            <span className="time-field">
              <span>Year</span>
              <input
                type="number"
                value={worldDate.year}
                min={0}
                onChange={(e) => handleWorldDateChange("year", e.target.value)}
              />
            </span>
            <span className="time-field">
              <span>Month</span>
              <select
                value={worldDate.month}
                onChange={(e) => handleWorldDateChange("month", e.target.value)}
              >
                {project.calendar.monthNames.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </span>
            <span className="time-field">
              <span>Day</span>
              <input
                type="number"
                value={worldDate.day}
                min={1}
                max={maxDay}
                onChange={(e) => handleWorldDateChange("day", e.target.value)}
              />
            </span>
            <span className="time-field">
              <span>Hour</span>
              <input
                type="number"
                value={worldDate.hour}
                min={0}
                max={23}
                onChange={(e) => handleWorldDateChange("hour", e.target.value)}
              />
            </span>
            <span className="time-field">
              <span>Min</span>
              <input
                type="number"
                value={worldDate.minute}
                min={0}
                max={59}
                onChange={(e) => handleWorldDateChange("minute", e.target.value)}
              />
            </span>
          </div>
          <span className="time-formatted">
            {formatWorldDate(worldDate, project.calendar)}
          </span>
        </div>

        {/* Flags */}
        <div className="meta-row meta-flags">
          <label>Flags</label>
          <div className="flags">
            <label className="flag-check">
              <input
                type="checkbox"
                checked={scene.flashback ?? false}
                onChange={(e) => updateScene({ flashback: e.target.checked })}
              />
              Flashback
            </label>
            <label className="flag-check">
              <input
                type="checkbox"
                checked={scene.dream ?? false}
                onChange={(e) => updateScene({ dream: e.target.checked })}
              />
              Dream
            </label>
          </div>
        </div>
      </div>

      {/* Prose */}
      <div className="prose-section">
        <div className="prose-label">
          Prose{" "}
          <span className="hint">type @ to mention characters and locations</span>
        </div>
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>
    </div>
  );
}
