"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Task } from "@/types/task";
import {
  Bot,
  Send,
  Loader2,
  MessageSquare,
  FileText,
  ListTodo,
  AlertCircle,
} from "lucide-react";

type Mode = "chat" | "summarize" | "tasks";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MODES: {
  id: Mode;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  hint: string;
}[] = [
    {
      id: "chat",
      label: "Chat",
      icon: MessageSquare,
      placeholder: "Ask me anything about your tasks or productivity...",
      hint: "I'll use your task data as context.",
    },
    {
      id: "summarize",
      label: "Summarize",
      icon: FileText,
      placeholder: "Paste any text here and I'll summarize it...",
      hint: "I'll return 3–5 concise bullet points.",
    },
    {
      id: "tasks",
      label: "Suggest Tasks",
      icon: ListTodo,
      placeholder: "Describe your goal (e.g. 'finish my project this week')...",
      hint: "I'll break it into actionable tasks with priorities.",
    },
  ];

function buildSystemPrompt(mode: Mode, tasks: Task[]): string {
  if (mode === "chat") {
    const pending = tasks.filter((t) => !t.completed);
    const done = tasks.filter((t) => t.completed).sort((a, b) => {
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });
    const pendingCtx =
      pending.length > 0
        ? `Pending tasks (${pending.length} total):\n${pending
          .map(
            (t) =>
              `- [${t.type ?? "general"}] ${t.title}${t.priority ? ` (${t.priority} priority)` : ""}${t.date ? `, due ${t.date}` : ""}${t.description ? `, note: ${t.description}` : ""}`
          )
          .join("\n")}`
        : "No pending tasks.";
    const doneCtx =
      done.length > 0
        ? `\nCompleted tasks (${done.length} total):\n${done
          .map(
            (t) =>
              `- [${t.type ?? "general"}] ${t.title}${t.completedAt ? `, completed ${new Date(t.completedAt).toLocaleDateString()}` : ""}`
          )
          .join("\n")}`
        : "";
    return `You are a helpful productivity assistant. Be concise and practical.\n\nUser task data:\n${pendingCtx}${doneCtx}`;
  }
  if (mode === "summarize") {
    return "You are a summarization assistant. When given text, return 3 to 5 clear bullet points in plain language. Output only the bullet points, no introduction.";
  }
  return "You are a productivity coach. When given a goal, break it into numbered actionable tasks. Label each with a priority: High, Medium, or Low. Be concise.";
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("chat");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let email: string | null = null;

    const fetchTasks = async (userEmail: string) => {
      try {
        const res = await fetch(`/api/tasks?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        setTasks(data.tasks ?? []);
      } catch {
        setTasks([]);
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.email) {
        email = user.email;
        fetchTasks(user.email);
      }
    });

    const onUpdated = () => { if (email) fetchTasks(email); };
    window.addEventListener("tasksUpdated", onUpdated);

    return () => {
      unsub();
      window.removeEventListener("tasksUpdated", onUpdated);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setMessages([]);
    setError(null);
    setInput("");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const systemPrompt = buildSystemPrompt(mode, tasks);
      const history = [...messages, userMessage];

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai",
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `Error ${res.status}`);

      setMessages((prev) => [...prev, { role: "assistant", content: data.result }]);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const currentMode = MODES.find((m) => m.id === mode)!;

  return (
    <div className="w-full min-h-screen bg-sky-950 font-serif flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-3 sm:px-5 py-4 sm:py-6 flex flex-col gap-4 flex-1">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="shrink-0 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
            <Bot size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">Agent</h1>
            <p className="text-xs text-gray-400">Free · No API key required</p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-gray-800/60 rounded-xl border border-gray-700/50">
          {MODES.map(({ id, label, icon: Icon }) => {
            const isActive = mode === id;
            return (
              <button
                key={id}
                onClick={() => handleModeChange(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-150
                  ${isActive
                    ? "bg-amber-400/15 text-amber-400 border border-amber-400/25 shadow-sm"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
              >
                <Icon size={13} className="shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto hide-scrollbar min-h-[40vh] max-h-[calc(100vh-320px)]">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center">
              <div className="p-4 rounded-full bg-gray-800/60 border border-gray-700">
                <currentMode.icon size={28} className="text-amber-400" />
              </div>
              <p className="text-gray-300 font-semibold text-sm">{currentMode.label} mode</p>
              <p className="text-gray-500 text-xs max-w-xs">{currentMode.hint}</p>
              {mode === "chat" && tasks.length > 0 && (
                <p className="text-xs text-amber-400/70">
                  {tasks.filter((t) => !t.completed).length} pending · {tasks.filter((t) => t.completed).length} completed
                </p>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mt-0.5">
                  <Bot size={14} className="text-amber-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                  ? "bg-amber-400/15 text-white border border-amber-400/20 rounded-br-sm"
                  : "bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-sm"
                  }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="shrink-0 w-7 h-7 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
                <Bot size={14} className="text-amber-400" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-gray-800 border border-gray-700 flex items-center gap-2">
                <Loader2 size={14} className="text-amber-400 animate-spin" />
                <span className="text-xs text-gray-400">Thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 items-end p-2 bg-gray-800/60 rounded-2xl border border-gray-700/50 focus-within:border-amber-400/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentMode.placeholder}
            rows={2}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-500 outline-none px-2 py-1 max-h-36 hide-scrollbar"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="shrink-0 p-2.5 rounded-xl bg-amber-400 text-gray-900 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-600">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
