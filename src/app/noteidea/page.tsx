"use client"
import { GiNotebook } from "react-icons/gi";
import { useState, useEffect } from "react";
import { MdDelete, MdEdit, MdCheck, MdClose } from "react-icons/md";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

interface Idea {
    id: number;
    ideatext: string;
}

export default function NooteBook() {
    const [curentideas, setCurentIdeas] = useState({ ideatext: "" });
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [user, setUser] = useState<any>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const storeIdeas = localStorage.getItem(`Ideas_${currentUser.email}`);
                setIdeas(storeIdeas ? JSON.parse(storeIdeas) : []);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const storeIdeas = JSON.parse(localStorage.getItem(`Ideas_${user.email}`) || "[]");
            setIdeas(storeIdeas);
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCurentIdeas((prev) => ({ ...prev, [name]: value }));
    };

    const handleaddIdea = () => {
        if (!curentideas.ideatext.trim()) return;
        if (user) {
            const newIdea = { id: Date.now(), ...curentideas };
            const updatedIdeas = [...ideas, newIdea];
            localStorage.setItem(`Ideas_${user.email}`, JSON.stringify(updatedIdeas));
            setIdeas(updatedIdeas);
            setCurentIdeas({ ideatext: "" });
        } else {
            toast.error("Please login or signup!");
        }
    };

    const handleDelete = (id: number) => {
        const storeIdeas: Idea[] = JSON.parse(localStorage.getItem(`Ideas_${user.email}`) || "[]");
        const updatedIdeas = storeIdeas.filter((idea) => idea.id !== id);
        localStorage.setItem(`Ideas_${user.email}`, JSON.stringify(updatedIdeas));
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("updatedIdeas"));
        }
        setIdeas(updatedIdeas);
    };

    const handleEditStart = (idea: Idea) => {
        setEditingId(idea.id);
        setEditText(idea.ideatext);
    };

    const handleEditSave = (id: number) => {
        if (!editText.trim()) return;
        const storeIdeas: Idea[] = JSON.parse(localStorage.getItem(`Ideas_${user.email}`) || "[]");
        const updatedIdeas = storeIdeas.map((idea) =>
            idea.id === id ? { ...idea, ideatext: editText } : idea
        );
        localStorage.setItem(`Ideas_${user.email}`, JSON.stringify(updatedIdeas));
        setIdeas(updatedIdeas);
        setEditingId(null);
        setEditText("");
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditText("");
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-sky-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-8 font-serif">

            {/* Header */}
            <div className="flex flex-col items-center mb-8" data-aos="fade-down">
                <div className="bg-white dark:bg-gray-800 rounded-full p-4 shadow-md mb-3">
                    <GiNotebook size={48} className="text-sky-400" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Idea Notes</h1>
                <p className="text-sm text-gray-400 mt-1">Capture every thought before it slips away</p>
            </div>

            {/* Input Card */}
            <div className="max-w-2xl mx-auto mb-8" data-aos="zoom-in">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border border-sky-100 dark:border-gray-700">
                    <p className="text-xs font-semibold text-sky-500 uppercase tracking-widest mb-3">New Idea</p>
                    <div className="flex gap-3">
                        <input
                            placeholder="Write your idea here..."
                            type="text"
                            name="ideatext"
                            onChange={handleChange}
                            value={curentideas.ideatext}
                            onKeyDown={(e) => e.key === "Enter" && handleaddIdea()}
                            className="flex-1 bg-gray-50 dark:bg-gray-700 dark:text-white border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 transition-colors"
                        />
                        <button
                            onClick={handleaddIdea}
                            className="px-5 py-3 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-sm font-semibold rounded-xl shadow transition-all"
                        >
                            Keep
                        </button>
                    </div>
                </div>
            </div>

            {/* Notes List */}
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-700 dark:text-white">
                        Your Ideas
                        <span className="ml-2 text-xs font-normal text-gray-400">({ideas.length})</span>
                    </h2>
                </div>

                {ideas.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-gray-300 dark:text-gray-600">
                        <GiNotebook size={64} />
                        <p className="mt-3 text-sm">No ideas yet. Add your first one!</p>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {[...ideas].reverse().map((idea, index) => (
                            <li
                                key={idea.id}
                                className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-all flex items-start gap-4"
                            >
                                <span className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900 text-sky-500 text-xs font-bold shrink-0">
                                    {ideas.length - index}
                                </span>

                                {editingId === idea.id ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <input
                                            autoFocus
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleEditSave(idea.id);
                                                if (e.key === "Escape") handleEditCancel();
                                            }}
                                            className="flex-1 bg-gray-50 dark:bg-gray-700 dark:text-white border-2 border-sky-400 rounded-xl px-3 py-1.5 text-sm focus:outline-none"
                                        />
                                        <button
                                            onClick={() => handleEditSave(idea.id)}
                                            className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-900/50 shrink-0"
                                        >
                                            <MdCheck size={18} className="text-sky-500" />
                                        </button>
                                        <button
                                            onClick={handleEditCancel}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
                                        >
                                            <MdClose size={18} className="text-gray-400" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <p className="flex-1 text-gray-700 dark:text-gray-200 text-sm leading-relaxed break-words">
                                            {idea.ideatext}
                                        </p>
                                        <button
                                            onClick={() => handleEditStart(idea)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/30 shrink-0"
                                        >
                                            <MdEdit size={20} className="text-sky-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(idea.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 shrink-0"
                                        >
                                            <MdDelete size={20} className="text-red-400" />
                                        </button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
