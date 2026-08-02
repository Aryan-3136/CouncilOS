"use client";

import { Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type CommandItem = { id: string; label: string; detail: string; section: string; kind: string };

type Props = {
  items: CommandItem[];
  onClose: () => void;
  onSelect: (item: CommandItem) => void;
  onNewTask: () => void;
  onNewGoal: () => void;
  onNewHabit: () => void;
};

export function CommandPalette({ items, onClose, onSelect, onNewTask, onNewGoal, onNewHabit }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? items.filter((item) => `${item.label} ${item.detail} ${item.section}`.toLowerCase().includes(needle)).slice(0, 8) : items.slice(0, 8);
  }, [items, query]);
  const action = (callback: () => void) => { callback(); onClose(); };
  return <div className="dialog-backdrop command-backdrop" onMouseDown={onClose} role="presentation">
    <section className="dialog command-palette" role="dialog" aria-modal="true" aria-label="Search CouncilOS" onMouseDown={(event) => event.stopPropagation()}>
      <div className="command-search"><Search size={19} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks, projects, goals, habits, notes…" /><button className="icon-button" onClick={onClose} aria-label="Close search"><X size={18} /></button></div>
      <div className="command-actions"><button onClick={() => action(onNewTask)}><Plus size={15} /> New task</button><button onClick={() => action(onNewGoal)}><Plus size={15} /> New goal</button><button onClick={() => action(onNewHabit)}><Plus size={15} /> New habit</button></div>
      <div className="command-results">{results.length ? results.map((item) => <button key={`${item.kind}-${item.id}`} onClick={() => { onSelect(item); onClose(); }}><span><strong>{item.label}</strong><small>{item.detail || item.section}</small></span><em>{item.kind}</em></button>) : <p>No matching records. Try another search.</p>}</div>
      <footer>Esc to close</footer>
    </section>
  </div>;
}
