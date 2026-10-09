import { useCallback } from "react";
import type { Project, Character, Location, Item, ItemKind } from "@engine/types.js";

export type ProfileKind = "character" | "item" | "location";

interface Props {
  profileKind: ProfileKind;
  entityId: string;
  project: Project;
  onProjectChange: (p: Project) => void;
}

const KIND_LABELS: Record<ProfileKind, string> = {
  character: "Character",
  item: "Item",
  location: "Location",
};

export default function ProfileEditor({ profileKind, entityId, project, onProjectChange }: Props) {
  const updateCharacter = useCallback(
    (updates: Partial<Character>) => {
      onProjectChange({
        ...project,
        characters: project.characters.map((c) =>
          c.id === entityId ? { ...c, ...updates } : c,
        ),
      });
    },
    [project, entityId, onProjectChange],
  );

  const updateLocation = useCallback(
    (updates: Partial<Location>) => {
      onProjectChange({
        ...project,
        locations: project.locations.map((l) =>
          l.id === entityId ? { ...l, ...updates } : l,
        ),
      });
    },
    [project, entityId, onProjectChange],
  );

  const updateItem = useCallback(
    (updates: Partial<Item>) => {
      onProjectChange({
        ...project,
        items: project.items.map((i) => (i.id === entityId ? { ...i, ...updates } : i)),
      });
    },
    [project, entityId, onProjectChange],
  );

  if (profileKind === "character") {
    const char = project.characters.find((c) => c.id === entityId);
    if (!char) return <div className="no-scene"><p>Character not found.</p></div>;

    return (
      <div className="profile-editor">
        <div className="profile-editor-header">
          <span className="profile-kind-badge">Character</span>
          <h2 className="profile-name">{char.name || "Unnamed"}</h2>
        </div>

        <div className="meta-section">
          <div className="meta-row">
            <label>Name</label>
            <input
              type="text"
              value={char.name}
              placeholder="Character name"
              onChange={(e) => updateCharacter({ name: e.target.value })}
            />
          </div>

          <div className="meta-row">
            <label>Aliases</label>
            <input
              type="text"
              value={(char.aliases ?? []).join(", ")}
              placeholder="Comma-separated aliases"
              onChange={(e) =>
                updateCharacter({
                  aliases: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div className="meta-row meta-row-tall">
            <label>Description</label>
            <textarea
              value={char.description ?? ""}
              placeholder="A brief description of this character"
              rows={3}
              onChange={(e) => updateCharacter({ description: e.target.value })}
            />
          </div>

          <div className="meta-row meta-row-tall">
            <label>Notes</label>
            <textarea
              value={char.notes ?? ""}
              placeholder="Private notes — story secrets, arc reminders, continuity flags"
              rows={4}
              onChange={(e) => updateCharacter({ notes: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  if (profileKind === "location") {
    const loc = project.locations.find((l) => l.id === entityId);
    if (!loc) return <div className="no-scene"><p>Location not found.</p></div>;

    const parentOptions = project.locations.filter((l) => l.id !== entityId);

    return (
      <div className="profile-editor">
        <div className="profile-editor-header">
          <span className="profile-kind-badge">Location</span>
          <h2 className="profile-name">{loc.name || "Unnamed"}</h2>
        </div>

        <div className="meta-section">
          <div className="meta-row">
            <label>Name</label>
            <input
              type="text"
              value={loc.name}
              placeholder="Location name"
              onChange={(e) => updateLocation({ name: e.target.value })}
            />
          </div>

          <div className="meta-row">
            <label>Parent</label>
            <select
              value={loc.parentId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                const next = { ...loc };
                if (val) next.parentId = val;
                else delete next.parentId;
                onProjectChange({
                  ...project,
                  locations: project.locations.map((l) => (l.id === entityId ? next : l)),
                });
              }}
            >
              <option value="">— none —</option>
              {parentOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="meta-row meta-row-tall">
            <label>Description</label>
            <textarea
              value={loc.description ?? ""}
              placeholder="A brief description of this location"
              rows={3}
              onChange={(e) => updateLocation({ description: e.target.value })}
            />
          </div>

          <div className="meta-row meta-row-tall">
            <label>Notes</label>
            <textarea
              value={loc.notes ?? ""}
              placeholder="Private notes — geography details, lore, continuity flags"
              rows={4}
              onChange={(e) => updateLocation({ notes: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  // item
  const item = project.items.find((i) => i.id === entityId);
  if (!item) return <div className="no-scene"><p>Item not found.</p></div>;

  return (
    <div className="profile-editor">
      <div className="profile-editor-header">
        <span className="profile-kind-badge">{item.kind === "equipment" ? "Equipment" : "Item"}</span>
        <h2 className="profile-name">{item.name || "Unnamed"}</h2>
      </div>

      <div className="meta-section">
        <div className="meta-row">
          <label>Name</label>
          <input
            type="text"
            value={item.name}
            placeholder="Item name"
            onChange={(e) => updateItem({ name: e.target.value })}
          />
        </div>

        <div className="meta-row">
          <label>Kind</label>
          <select
            value={item.kind}
            onChange={(e) => updateItem({ kind: e.target.value as ItemKind })}
          >
            <option value="item">Item</option>
            <option value="equipment">Equipment</option>
          </select>
        </div>

        <div className="meta-row">
          <label>Initial owner</label>
          <select
            value={item.initialOwnerId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              const next = { ...item };
              if (val) next.initialOwnerId = val;
              else delete next.initialOwnerId;
              onProjectChange({
                ...project,
                items: project.items.map((i) => (i.id === entityId ? next : i)),
              });
            }}
          >
            <option value="">— none —</option>
            {project.characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="meta-row meta-row-tall">
          <label>Description</label>
          <textarea
            value={item.description ?? ""}
            placeholder="A brief description of this item"
            rows={3}
            onChange={(e) => updateItem({ description: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export { KIND_LABELS };
