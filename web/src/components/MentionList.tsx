import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface MentionItem {
  id: string;
  label: string;
  type: "char" | "loc";
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface Props {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

const MentionList = forwardRef<MentionListRef, Props>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  function selectItem(index: number) {
    const item = items[index];
    if (item) command(item);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!items.length) return null;

  return (
    <div className="mention-list">
      {items.map((item, i) => (
        <button
          key={item.id}
          className={`mention-item${i === selectedIndex ? " selected" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            selectItem(i);
          }}
        >
          <span className="mention-type">{item.type === "char" ? "👤" : "📍"}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = "MentionList";
export default MentionList;
