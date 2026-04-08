"use client";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Task } from "@/types/task";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteitems";
import { saveTasksToDB } from "@/lib/taskDB";

const getDeadlineUrgency = (date?: string, time?: string) => {
    if (!date) return null;
    const deadline = new Date(`${date}T${time || "23:59"}`).getTime();
    const hoursLeft = (deadline - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft <= 0) return "missed";
    if (hoursLeft <= 1) return "critical";   // ~red
    if (hoursLeft <= 24) return "warning";   // ~orange
    return null;
};

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case "High": return "bg-red-100 text-red-600 border-red-400";
        case "Medium": return "bg-yellow-100 text-yellow-600 border-yellow-400";
        case "Low": return "bg-green-100 text-green-600 border-green-400";
        default: return "bg-gray-100 text-gray-600 border-gray-400";
    }
};

export default function TaskList() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [titledit, setTitleEdit] = useState("");
    const [descritionedit, setDescittionEdit] = useState("");
    const [dateedit, setDateEdit] = useState("");
    const [timeedit, settimeEdit] = useState("");
    const [editPopup, setEditPopup] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [user, setUser] = useState<any>(null);
    const notifiedRef = useRef<Set<string>>(new Set());

    // Register service worker + request periodic background sync
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        const setup = async () => {
            try {
                const reg = await navigator.serviceWorker.register("/sw.js");

                // Ask for notification permission
                const permission = await Notification.requestPermission();
                if (permission !== "granted") return;

                // Register periodic background sync (Chrome/Edge only)
                if ("periodicSync" in reg) {
                    const status = await navigator.permissions.query({
                        name: "periodic-background-sync" as PermissionName,
                    });
                    if (status.state === "granted") {
                        await (reg as any).periodicSync.register("check-task-deadlines", {
                            minInterval: 60 * 60 * 1000, // minimum 1 hour
                        });
                    }
                }
            } catch (err) {
                console.error("SW setup failed:", err);
            }
        };

        setup();
    }, []);

    // Mirror tasks to IndexedDB so the service worker can read them when the tab is closed
    useEffect(() => {
        if (!user?.email || tasks.length === 0) return;
        saveTasksToDB(user.email, tasks).catch(console.error);
    }, [tasks, user]);

    // Check deadlines and fire notifications
    useEffect(() => {
        if (!user || tasks.length === 0) return;

        const checkDeadlines = () => {
            if (!("Notification" in window) || Notification.permission !== "granted") return;

            const now = Date.now();

            tasks.forEach((task) => {
                if (!task.date || task.completed) return;

                const deadlineStr = `${task.date}T${task.time || "23:59"}`;
                const deadline = new Date(deadlineStr).getTime();
                const msLeft = deadline - now;
                if (msLeft <= 0) return;

                const hoursLeft = msLeft / (1000 * 60 * 60);
                const daysLeft = hoursLeft / 24;

                // Deadline tomorrow or within today → alert 1 hour before
                // Deadline more than 3 days away → alert 1 day before
                let thresholdHours: number;
                let notifyKey: string;

                if (daysLeft <= 1) {
                    thresholdHours = 1;
                    notifyKey = `${task.id}_1h`;
                } else if (daysLeft > 3) {
                    thresholdHours = 24;
                    notifyKey = `${task.id}_1d`;
                } else {
                    return;
                }

                if (hoursLeft <= thresholdHours && !notifiedRef.current.has(notifyKey)) {
                    notifiedRef.current.add(notifyKey);
                    new Notification("Task Deadline Approaching", {
                        body: `"${task.title}" is due in less than ${thresholdHours === 1 ? "1 hour" : "24 hours"}!`,
                        icon: "/favicon.ico",
                    });
                }
            });
        };

        checkDeadlines();
        const interval = setInterval(checkDeadlines, 60 * 1000);
        return () => clearInterval(interval);
    }, [tasks, user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const storedTasks = localStorage.getItem(`tasks${currentUser.email}`);
                setTasks(storedTasks ? JSON.parse(storedTasks) : []);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        try {
            const storedTasks: Task[] = JSON.parse(localStorage.getItem(`tasks_${user.email}`) || "[]");
            setTasks(storedTasks.filter((t) => !t.completed));
        } catch (error) {
            console.error("Error loading tasks:", error);
        }
    }, [user]);

    const handleEditClick = (task: Task) => {
        setSelectedTask(task);
        setTitleEdit(task.title);
        setDescittionEdit(task.description || "");
        setDateEdit(task.date || "");
        settimeEdit(task.time || "");
        setEditPopup(true);
    };

    const handleDelete = (id: number) => {
        const storedTasks: Task[] = JSON.parse(localStorage.getItem(`tasks_${user.email}`) || "[]");
        const updatedTasks = storedTasks.filter((task) => task.id !== id);
        localStorage.setItem(`tasks_${user.email}`, JSON.stringify(updatedTasks));
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("tasksUpdated"));
        }
        setTasks(updatedTasks.filter((t) => !t.completed));
    };

    const handleMarkDone = (id: number) => {
        const storedTasks: Task[] = JSON.parse(localStorage.getItem(`tasks_${user.email}`) || "[]");
        const task = storedTasks.find((t) => t.id === id);

        const updatedTasks = storedTasks.map((t) =>
            t.id === id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
        );
        localStorage.setItem(`tasks_${user.email}`, JSON.stringify(updatedTasks));
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("tasksUpdated"));
        }
        setTasks(updatedTasks.filter((t) => !t.completed));

        // Notify if the task was completed before its deadline
        if (
            task?.date &&
            "Notification" in window &&
            Notification.permission === "granted"
        ) {
            const deadlineStr = `${task.date}T${task.time || "23:59"}`;
            const deadline = new Date(deadlineStr).getTime();
            if (deadline > Date.now()) {
                new Notification("Task Completed Early!", {
                    body: `Great job! You finished "${task.title}" before the deadline.`,
                    icon: "/Webicon.png",
                });
            }
        }
    };

    const handleUpdate = (id: number) => {
        const storedTasks: Task[] = JSON.parse(localStorage.getItem(`tasks_${user.email}`) || "[]");
        const updatedTasks = storedTasks.map((task) =>
            task.id === id
                ? { ...task, title: titledit, description: descritionedit, date: dateedit, time: timeedit }
                : task
        );
        localStorage.setItem(`tasks_${user.email}`, JSON.stringify(updatedTasks));
        setTasks(updatedTasks.filter((t) => !t.completed));
        setEditPopup(false);
    };

    return (
        <div className="max-h-[100vh] p-4 sm:p-7 max-w-full hide-scrollbar mx-auto font-serif border-0 border-amber-400 relative overflow-y-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-2 text-center text-amber-600 ">
                Your Task List
            </h1>
            <hr className="bg-amber-400 text-amber-600 w-[96%] mb-5"></hr>

            {editPopup && selectedTask && (
                <div className="fixed top-0 z-10 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded-md w-96 shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">Update Task</h2>
                        <input
                            type="text"
                            placeholder="Title"
                            value={titledit}
                            onChange={(e) => setTitleEdit(e.target.value)}
                            className="border p-2 w-full mb-2"
                        />
                        <textarea
                            placeholder="Description"
                            value={descritionedit}
                            onChange={(e) => setDescittionEdit(e.target.value)}
                            className="border p-2 w-full mb-2"
                        />
                        <input
                            type="date"
                            value={dateedit}
                            onChange={(e) => setDateEdit(e.target.value)}
                            className="border p-2 w-full mb-2"
                        />
                        <input
                            type="time"
                            value={timeedit}
                            onChange={(e) => settimeEdit(e.target.value)}
                            className="border p-2 w-full mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setEditPopup(false)}
                                className="px-3 py-1 bg-gray-400 text-white rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleUpdate(selectedTask.id)}
                                className="px-3 py-1 bg-blue-500 text-white rounded-md"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {tasks.length === 0 ? (
                <p className="text-center text-gray-500">No tasks yet. Add one!</p>
            ) : (
                <ul data-aos="zoom-in-up" className="space-y-4 md:mx-auto md:max-w-3xl">
                    {tasks.map((task) => {
                        const urgency = getDeadlineUrgency(task.date, task.time);
                        return (
                            <li
                                key={task.id}
                                className={`w-full p-5 sm:p-7 shadow-md rounded-xl border-l-4 hover:shadow-xl transition-all duration-200
                                ${urgency === "missed"
                                        ? "bg-gray-100 border-gray-400"
                                        : urgency === "critical"
                                            ? "bg-red-50 border-red-500"
                                            : urgency === "warning"
                                                ? "bg-orange-50 border-orange-400"
                                                : "bg-white border-amber-400"}`}>
                                <div className="flex items-start gap-2">
                                    <h2 className={`text-lg sm:text-xl font-bold break-words flex-1 min-w-0
                                    ${urgency === "missed" ? "text-gray-400 line-through" : urgency === "critical" ? "text-red-700" : urgency === "warning" ? "text-orange-600" : "text-gray-800"}`}>
                                        {task.title}
                                    </h2>
                                    <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border shrink-0 ${getPriorityColor(task.priority || "")}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                <p className={`mt-2 break-words whitespace-normal
                                ${urgency === "missed" ? "text-gray-400" : urgency === "critical" ? "text-red-500" : urgency === "warning" ? "text-orange-500" : "text-gray-600"}`}>
                                    {task.description}
                                </p>
                                {urgency === "missed" && (
                                    <p className="mt-1 text-sm font-semibold text-red-500 tracking-wide">⚠ Missed</p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 mt-3">
                                    <p className={`text-sm ${urgency === "missed" ? "text-gray-300" : urgency === "critical" ? "text-red-400" : urgency === "warning" ? "text-orange-400" : "text-gray-400"}`}>
                                        📅 Due Date:{" "}
                                        <span className={`font-medium font-sans ${urgency === "missed" ? "text-gray-400" : urgency === "critical" ? "text-red-600" : urgency === "warning" ? "text-orange-600" : "text-gray-700"}`}>
                                            {task.date}
                                        </span>
                                    </p>
                                    <p className="flex text-sm border-l-2 pl-3">
                                        Time: <span className="text-sm font-sans ml-1">{task.time}</span>
                                    </p>
                                    <div className="ml-auto flex gap-2">
                                        <button
                                            onClick={() => handleEditClick(task)}
                                            className="cursor-pointer px-3 py-1 bg-sky-500 text-white rounded-md hover:bg-sky-600">update</button>
                                        <button
                                            onClick={() => handleMarkDone(task.id)}
                                            className="cursor-pointer px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600">Done</button>
                                        <ConfirmDeleteButton
                                            itemName={task.title}
                                            itemId={task.id}
                                            onDelete={(id) => handleDelete(id as number)}
                                        />
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
