import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastKind = "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

const ToastContext = createContext<{ notify: (text: string, kind?: ToastKind) => void }>({
  notify: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const notify = useCallback((text: string, kind: ToastKind = "success") => {
    seq.current += 1;
    const id = seq.current;
    setItems((prev) => [...prev, { id, kind, text }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 3600);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-wrap">
        {items.map((x) => (
          <div key={x.id} className={`toast toast-${x.kind}`}>
            <span>{x.kind === "success" ? "✓" : "!"}</span>
            {x.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext).notify;
}
