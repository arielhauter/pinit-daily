"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

type ToastType = "success" | "error";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
  visible: boolean;
};

type ToastContextValue = {
  showToast: (message: string, type: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const id = nextId++;
      setToasts((prev) => [
        ...prev,
        { id, message, type, visible: true },
      ]);

      const fadeTimer = setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, visible: false } : t
          )
        );
      }, 2500);

      const removeTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, 3000);

      timersRef.current.set(id, removeTimer);
      timersRef.current.set(id + 0.5, fadeTimer);
    },
    []
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 pb-4 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full max-w-md rounded-xl px-5 py-4 text-center font-bold text-lg shadow-lg transition-all duration-500 ${
              toast.visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            } ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
