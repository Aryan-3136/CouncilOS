"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, Undo2, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: number; message: string; action?: { label: string; onAction: () => void } };
type Feedback = { toast: (message: string, action?: Toast["action"]) => void };
const FeedbackContext = createContext<Feedback>({ toast: () => undefined });

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, action?: Toast["action"]) => { const id = Date.now(); setToasts((current) => [...current, { id, message, action }]); window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5000); }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return <FeedbackContext.Provider value={value}>{children}<div className="toast-region" aria-live="polite"><AnimatePresence>{toasts.map((item) => <motion.div className="toast" key={item.id} initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }}><CheckCircle2 size={17} /><span>{item.message}</span>{item.action ? <button onClick={() => { item.action?.onAction(); setToasts((current) => current.filter((toast) => toast.id !== item.id)); }}><Undo2 size={14} /> {item.action.label}</button> : null}<button aria-label="Dismiss notification" onClick={() => setToasts((current) => current.filter((toast) => toast.id !== item.id))}><X size={15} /></button></motion.div>)}</AnimatePresence></div></FeedbackContext.Provider>;
}
export const useFeedback = () => useContext(FeedbackContext);
export function Skeleton({ lines = 3 }: { lines?: number }) { return <div className="skeleton" aria-label="Loading content">{Array.from({ length: lines }, (_, index) => <i key={index} style={{ width: `${index === lines - 1 ? 55 : 100}%` }} />)}</div>; }
