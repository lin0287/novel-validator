import { useState, useRef, useEffect, useCallback } from "react";
import type { Character } from "@engine/types.js";

interface Props {
  characters: Character[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function CharacterPicker({ characters, selectedIds, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = characters.filter((c) => selectedIds.includes(c.id));
  const options = characters.filter(
    (c) =>
      !selectedIds.includes(c.id) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    setCursor(0);
  }, [query, open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const add = useCallback(
    (id: string) => {
      onChange([...selectedIds, id]);
      setQuery("");
      inputRef.current?.focus();
    },
    [selectedIds, onChange],
  );

  const remove = useCallback(
    (id: string) => {
      onChange(selectedIds.filter((x) => x !== id));
    },
    [selectedIds, onChange],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(c + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      const picked = options[cursor];
      if (picked) add(picked.id);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (e.key === "Backspace" && query === "" && selected.length > 0) {
      const last = selected[selected.length - 1];
      if (last) remove(last.id);
    }
  }

  return (
    <div className="char-picker" ref={containerRef}>
      <div
        className="char-picker-field"
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {selected.map((c) => (
          <span key={c.id} className="char-chip">
            {c.name}
            <button
              type="button"
              className="char-chip-remove"
              onMouseDown={(e) => {
                e.preventDefault();
                remove(c.id);
              }}
              tabIndex={-1}
              aria-label={`Remove ${c.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="char-picker-input"
          value={query}
          placeholder={selected.length === 0 ? "Add characters…" : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {open && options.length > 0 && (
        <div className="char-picker-dropdown">
          {options.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`char-picker-option${i === cursor ? " active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                add(c.id);
              }}
              onMouseEnter={() => setCursor(i)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
