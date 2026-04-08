"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Task, TaskCounts } from "@/types/task";

export function useTaskCounts(): TaskCounts {
  const [counts, setCounts] = useState<TaskCounts>({
    total: 0,
    pending: 0,
    completed: 0,
  });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const compute = () => {
      if (!user) return;
      const key = `tasks_${user.email}`;
      try {
        const tasks: Task[] = JSON.parse(localStorage.getItem(key) || "[]");
        const total = tasks.length;
        const completed = tasks.filter((t) => t.completed).length;
        const pending = total - completed;
        setCounts({ total, pending, completed });
      } catch {
        setCounts({ total: 0, pending: 0, completed: 0 });
      }
    };
    compute();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("tasks")) compute();
    };
    const onUpdated = () => compute();

    window.addEventListener("storage", onStorage);
    window.addEventListener("tasksUpdated", onUpdated as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tasksUpdated", onUpdated as EventListener);
    };
  }, [user]);

  return counts;
}
