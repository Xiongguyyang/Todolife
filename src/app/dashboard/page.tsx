"use client";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Task } from "@/types/task";
import { BookOpen, Clock, Zap, Target, CheckCircle } from "lucide-react";

interface Idea {
    id: number;
    ideatext: string;
}

interface StudySession {
    id: number;
    duration: number; // in centiseconds
    timestamp: string;
    videoName: string;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
}

function formatDuration(centis: number) {
    const totalSeconds = Math.floor(centis / 100);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// ── Study Stats ──────────────────────────────────────────────────────────────
function StudyStats({ sessions }: { sessions: StudySession[] }) {
    const totalCentis = sessions.reduce((acc, s) => acc + s.duration, 0);
    const recent = [...sessions].reverse().slice(0, 3);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-700 dark:text-white flex items-center gap-2">
                    <BookOpen size={20} className="text-blue-500" /> Study Stats
                </h2>
                <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">
                    Total: {formatDuration(totalCentis)}
                </div>
            </div>

            {sessions.length === 0 ? (
                <p className="text-gray-400 text-sm italic">No study sessions recorded yet. Head to Study Hub to start!</p>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Recent Sessions</p>
                    {recent.map((s) => (
                        <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <Clock size={16} className="text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{s.videoName}</p>
                                <p className="text-xs text-gray-400">{new Date(s.timestamp).toLocaleDateString()}</p>
                            </div>
                            <span className="text-sm font-mono font-bold text-amber-600">{formatDuration(s.duration)}</span>
                        </div>
                    ))}
                </div>
            )}
            <a href="/settimepage" className="text-xs text-blue-500 hover:underline mt-1 block">
                Open Study Hub →
            </a>
        </div>
    );
}

// ── Pomodoro Timer ──────────────────────────────────────────────────────────
function PomodoroTimer({ tasks }: { tasks: Task[] }) {
    const DURATION = 25 * 60;
    const [secondsLeft, setSecondsLeft] = useState(DURATION);
    const [running, setRunning] = useState(false);
    const [focusTask, setFocusTask] = useState("");
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (running) {
            intervalRef.current = window.setInterval(() => {
                setSecondsLeft((s) => {
                    if (s <= 1) {
                        clearInterval(intervalRef.current!);
                        setRunning(false);
                        if ("Notification" in window && Notification.permission === "granted") {
                            new Notification("🍅 Pomodoro Done!", { body: "Great focus session! Time for a break." });
                        }
                        return DURATION;
                    }
                    return s - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [running]);

    const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
    const seconds = (secondsLeft % 60).toString().padStart(2, "0");
    const progress = ((DURATION - secondsLeft) / DURATION) * 100;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 flex flex-col gap-3">
            <h2 className="text-lg font-bold text-gray-700 dark:text-white">⏱ Focus Timer</h2>
            <select
                value={focusTask}
                onChange={(e) => setFocusTask(e.target.value)}
                className="border rounded-lg p-2 text-sm text-gray-600 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            >
                <option value="">Select task to focus on...</option>
                {tasks.map((t) => (
                    <option key={t.id} value={t.title}>{t.title}</option>
                ))}
            </select>
            {focusTask && (
                <p className="text-xs text-amber-600 font-medium truncate">Focusing: {focusTask}</p>
            )}
            <div className="text-5xl font-mono text-center text-gray-800 dark:text-white py-2">
                {minutes}:{seconds}
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div
                    className="bg-amber-400 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-center text-xs text-gray-400">25-min Pomodoro session</p>
            <div className="flex gap-2 justify-center">
                <button
                    onClick={() => setRunning(true)}
                    disabled={running}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-40 text-sm transition-colors"
                >Start</button>
                <button
                    onClick={() => setRunning(false)}
                    disabled={!running}
                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg disabled:opacity-40 text-sm transition-colors"
                >Pause</button>
                <button
                    onClick={() => { setRunning(false); setSecondsLeft(DURATION); }}
                    className="px-4 py-2 bg-red-400 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
                >Reset</button>
            </div>
        </div>
    );
}

// ── Weekly Chart ─────────────────────────────────────────────────────────────
function WeeklyChart({ tasks }: { tasks: Task[] }) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const counts = days.map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + mondayOffset + i);
        const dateStr = d.toISOString().split("T")[0];
        return tasks.filter((t) => t.completedAt?.startsWith(dateStr)).length;
    });

    const max = Math.max(...counts, 1);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
            <h2 className="text-lg font-bold text-gray-700 dark:text-white mb-4">📈 Weekly Progress</h2>
            <div className="flex items-end gap-2 h-28">
                {days.map((day, i) => (
                    <div key={day} className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{counts[i] || ""}</span>
                        <div
                            className="w-full bg-amber-400 rounded-t transition-all"
                            style={{ height: `${(counts[i] / max) * 100}%`, minHeight: counts[i] > 0 ? "6px" : "2px", opacity: counts[i] > 0 ? 1 : 0.15 }}
                        />
                        <span className="text-xs text-gray-400">{day}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Dashboard Page ───────────────────────────────────────────────────────────
export default function Dashboard() {
    const [user, setUser] = useState<any>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [studySessions, setStudySessions] = useState<StudySession[]>([]);
    const [streak, setStreak] = useState(0);

    const todayStr = new Date().toISOString().split("T")[0];

    const loadData = (email: string) => {
        const storedTasks: Task[] = JSON.parse(localStorage.getItem(`tasks_${email}`) || "[]");
        setTasks(storedTasks);
        setIdeas(JSON.parse(localStorage.getItem(`Ideas_${email}`) || "[]"));
        setStudySessions(JSON.parse(localStorage.getItem(`study_sessions_${email}`) || "[]"));
        
        // Compute streak
        let s = 0;
        const d = new Date();
        while (true) {
            const ds = d.toISOString().split("T")[0];
            if (!storedTasks.some((t) => t.completedAt?.startsWith(ds))) break;
            s++;
            d.setDate(d.getDate() - 1);
        }
        setStreak(s);
    };

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            if (u) loadData(u.email!);
        });
        const onUpdate = () => { if (user?.email) loadData(user.email); };
        window.addEventListener("tasksUpdated", onUpdate);
        return () => { unsub(); window.removeEventListener("tasksUpdated", onUpdate); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pendingTasks = tasks.filter((t) => !t.completed);
    const completedTasks = tasks.filter((t) => t.completed);
    const todayTasks = pendingTasks.filter((t) => t.date === todayStr);
    const completedToday = completedTasks.filter((t) => t.completedAt?.startsWith(todayStr));
    const overdueTasks = pendingTasks.filter((t) => {
        if (!t.date) return false;
        return new Date(`${t.date}T${t.time || "23:59"}`).getTime() < Date.now();
    });

    const handleMarkDone = (id: number) => {
        const stored: Task[] = JSON.parse(localStorage.getItem(`tasks_${user.email}`) || "[]");
        const updated = stored.map((t) =>
            t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
        );
        localStorage.setItem(`tasks_${user.email}`, JSON.stringify(updated));
        window.dispatchEvent(new Event("tasksUpdated"));
        setTasks(updated);
    };

    const displayName = user?.displayName || user?.email?.split("@")[0] || "there";

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 font-serif">

            {/* 1 — Greeting + Quick Add */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {getGreeting()}, {displayName} 👋
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                </div>
                <a
                    href="/newtasks"
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                    <span className="text-lg leading-none">+</span> Add a Task
                </a>
            </div>

            {/* 2 — Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                {[
                    { icon: <CheckCircle size={20} className="text-green-500" />, label: "Completed Today", value: completedToday.length, color: "text-green-500" },
                    { icon: <Clock size={20} className="text-amber-500" />, label: "Pending", value: pendingTasks.length, color: "text-amber-500" },
                    { icon: <Zap size={20} className="text-orange-500" />, label: "Day Streak", value: streak, color: "text-orange-500" },
                    { icon: <Target size={20} className="text-blue-500" />, label: "Due Today", value: todayTasks.length, color: "text-blue-500" },
                ].map((card, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex flex-col gap-1">
                        <span className="text-2xl">{card.icon}</span>
                        <span className={`text-3xl font-bold ${card.color}`}>{card.value}</span>
                        <span className="text-xs text-gray-400">{card.label}</span>
                    </div>
                ))}
            </div>

            {/* 3 — Today's Tasks + Study Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                    <h2 className="text-lg font-bold text-gray-700 dark:text-white mb-3">📅 Today's Tasks</h2>
                    {todayTasks.length === 0 ? (
                        <p className="text-gray-400 text-sm">No tasks due today. Enjoy your day!</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {todayTasks.map((t) => (
                                <li key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                    <button
                                        onClick={() => handleMarkDone(t.id)}
                                        className="w-5 h-5 rounded-full border-2 border-amber-400 hover:bg-amber-400 shrink-0 transition"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{t.title}</p>
                                        {t.time && <p className="text-xs text-gray-400">{t.time}</p>}
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                        t.priority?.toLowerCase() === "high" ? "bg-red-100 text-red-600" :
                                        t.priority?.toLowerCase() === "medium" ? "bg-yellow-100 text-yellow-600" :
                                        "bg-green-100 text-green-600"
                                    }`}>{t.priority}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <StudyStats sessions={studySessions} />
            </div>

            {/* 4 — Pomodoro + Weekly Chart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <PomodoroTimer tasks={pendingTasks} />
                <WeeklyChart tasks={tasks} />
            </div>

            {/* 5 — Notes Preview */}
            <div className="grid grid-cols-1 gap-4 mb-5">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                    <h2 className="text-lg font-bold text-gray-700 dark:text-white mb-3">💡 Recent Notes</h2>
                    {ideas.length === 0 ? (
                        <p className="text-gray-400 text-sm">No notes yet.</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {[...ideas].reverse().slice(0, 3).map((idea) => (
                                <li key={idea.id} className="text-sm text-gray-600 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl truncate">
                                    💡 {idea.ideatext}
                                </li>
                            ))}
                        </ul>
                    )}
                    <a href="/noteidea" className="text-xs text-amber-500 hover:underline mt-3 block">
                        View all notes →
                    </a>
                </div>
            </div>

            {/* 6 — Overdue Tasks */}
            {overdueTasks.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl shadow p-5">
                    <h2 className="text-lg font-bold text-red-600 mb-3">⚠️ Overdue Tasks</h2>
                    <ul className="flex flex-col gap-2">
                        {overdueTasks.map((t) => (
                            <li key={t.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-red-100 dark:border-red-800">
                                <span className="text-xl shrink-0">⏰</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{t.title}</p>
                                    <p className="text-xs text-red-400">Due: {t.date} {t.time}</p>
                                </div>
                                <button
                                    onClick={() => handleMarkDone(t.id)}
                                    className="text-xs px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg shrink-0 transition-colors"
                                >Done</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
