"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Task } from "@/types/task";
import DoneTaskCard from "@/components/ui/DoneTaskCard";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteitems";
import { CheckCircle2, Briefcase, BookOpen, Zap } from "lucide-react";

type TaskType = "work" | "study" | "activities";

const TASK_TYPES: {
  type: TaskType;
  label: string;
  short: string;
  icon: React.ElementType;
  color: string;
  accent: string;
}[] = [
    { type: "work", label: "Work", short: "Work", icon: Briefcase, color: "text-blue-400", accent: "border-blue-400/50 bg-blue-400/10" },
    { type: "study", label: "Study", short: "Study", icon: BookOpen, color: "text-violet-400", accent: "border-violet-400/50 bg-violet-400/10" },
    { type: "activities", label: "Activities", short: "Acts", icon: Zap, color: "text-amber-400", accent: "border-amber-400/50 bg-amber-400/10" },
  ];

interface TaskTypeColumnProps {
  tasks: Task[];
  type: TaskType;
  label: string;
  icon: React.ElementType;
  color: string;
  selectedType: TaskType;
  onDelete: (id: number) => void;
}

function TaskTypeColumn({ tasks, type, label, icon: Icon, color, selectedType, onDelete }: TaskTypeColumnProps) {
  const filtered = tasks.filter((t) => t.type === type);
  const isVisible = selectedType === type;

  return (
    <div className={`${isVisible ? "flex" : "hidden"} sm:flex flex-col flex-1 min-w-0`}>
      {/* Column header */}
      <div className="flex items-center justify-between px-2.5 py-2 mb-2 rounded-xl bg-gray-800/60 border border-gray-700/50">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon size={15} className={`${color} shrink-0`} />
          <span className={`text-xs sm:text-sm font-bold ${color} truncate`}>{label}</span>
        </div>
        <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 ml-1">
          {filtered.length}
        </span>
      </div>

      {/* Task list — scrollable, adapts height to viewport */}
      <div className="overflow-y-auto hide-scrollbar space-y-2 max-h-[58vh] sm:max-h-[calc(100vh-320px)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 gap-2 rounded-xl border border-dashed border-gray-700 bg-gray-800/30">
            <CheckCircle2 size={24} className="text-gray-600" />
            <p className="text-xs text-gray-500 text-center px-2">No completed {label.toLowerCase()} tasks</p>
          </div>
        ) : (
          filtered.map((task) => (
            <DoneTaskCard key={task.id} task={task} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
}

export default function DoneTasks() {
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);
  const [selectedType, setSelectedType] = useState<TaskType>("work");
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingUser(false);
      if (currentUser) {
        const storedTasks = localStorage.getItem(`tasks_${currentUser.email}`);
        setDoneTasks(storedTasks ? JSON.parse(storedTasks) : []);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadDoneTasks = (userEmail: string) => {
    const storedTasks: Task[] = JSON.parse(localStorage.getItem(`tasks_${userEmail}`) || "[]");
    const completedOnly = storedTasks
      .filter((t) => t.completed)
      .sort((a, b) => {
        const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return tb - ta;
      });
    setDoneTasks(completedOnly);
  };

  useEffect(() => {
    if (loadingUser || !user?.email) return;

    loadDoneTasks(user.email);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "tasks") loadDoneTasks(user.email);
    };
    const onUpdated = () => loadDoneTasks(user.email);

    window.addEventListener("storage", onStorage);
    window.addEventListener("tasksUpdated", onUpdated as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tasksUpdated", onUpdated as EventListener);
    };
  }, [user, loadingUser]);

  const handleDelete = (id: number) => {
    if (!user?.email) return;
    try {
      const storedTasks: Task[] = JSON.parse(localStorage.getItem(`tasks_${user.email}`) || "[]");
      const updatedTasks = storedTasks.filter((t) => t.id !== id);
      localStorage.setItem(`tasks_${user.email}`, JSON.stringify(updatedTasks));
      window.dispatchEvent(new Event("tasksUpdated"));
      loadDoneTasks(user.email);
    } catch (e) {
      console.error("Failed to delete task", e);
    }
  };

  const doClearAll = () => {
    if (!user?.email) return;
    try {
      const storedTasks: Task[] = JSON.parse(localStorage.getItem(`tasks_${user.email}`) || "[]");
      const updatedTasks = storedTasks.filter((t) => !t.completed);
      localStorage.setItem(`tasks_${user.email}`, JSON.stringify(updatedTasks));
      window.dispatchEvent(new Event("tasksUpdated"));
      setDoneTasks([]);
    } catch (e) {
      console.error("Failed to clear completed tasks", e);
    }
  };

  return (
    <div className="w-full min-h-screen bg-sky-950 font-serif">
      <div className="max-w-6xl mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="shrink-0 p-2 sm:p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle2 size={18} className="text-green-400 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-white leading-tight truncate">
                Completed Tasks
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                {doneTasks.length} task{doneTasks.length !== 1 ? "s" : ""} done
              </p>
            </div>
          </div>

          {doneTasks.length > 0 && (
            <div className="shrink-0">
              <ConfirmDeleteButton
                itemName="all completed tasks"
                itemId="all"
                onDelete={() => doClearAll()}
              >
                <span className="hidden sm:inline">Clear All</span>
                <span className="sm:hidden">Clear</span>
              </ConfirmDeleteButton>
            </div>
          )}
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-2">
          {TASK_TYPES.map(({ type, label, short, icon: Icon, color, accent }) => {
            const count = doneTasks.filter((t) => t.type === type).length;
            return (
              <div key={type} className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl border ${accent}`}>
                <Icon size={14} className={`${color} shrink-0`} />
                {/* Show short label on mobile, full on sm+ */}
                <span className="text-[11px] sm:text-xs font-semibold text-gray-300 truncate">
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
                <span className={`ml-auto text-xs sm:text-sm font-bold ${color} shrink-0`}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* ── Mobile tab switcher ── */}
        <div className="flex sm:hidden gap-1 p-1 bg-gray-800/60 rounded-xl border border-gray-700/50">
          {TASK_TYPES.map(({ type, label, icon: Icon, color }) => {
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-150 min-w-0
                  ${isActive ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 active:bg-gray-800"}`}
              >
                <Icon size={13} className={`shrink-0 ${isActive ? color : ""}`} />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Columns / Empty state ── */}
        {doneTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 sm:py-28 gap-4">
            <div className="p-4 sm:p-5 rounded-full bg-gray-800/60 border border-gray-700">
              <CheckCircle2 size={36} className="text-gray-600 sm:w-10 sm:h-10" />
            </div>
            <p className="text-gray-400 text-base sm:text-lg font-medium">No completed tasks yet</p>
            <p className="text-gray-600 text-sm">Complete a task and it will appear here</p>
          </div>
        ) : (
          <section className="flex gap-2 sm:gap-3 lg:gap-4">
            {TASK_TYPES.map(({ type, label, icon, color }) => (
              <TaskTypeColumn
                key={type}
                tasks={doneTasks}
                type={type}
                label={label}
                icon={icon}
                color={color}
                selectedType={selectedType}
                onDelete={handleDelete}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
