// ==========================================================
// frontend/src/components/chat/AIChatWindow.jsx
// Dedicated Gemini AI Assistant Chat Interface for Rubee
// ==========================================================

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  History,
  ArrowLeft,
  Copy,
  Check,
  RotateCcw,
  X,
} from "lucide-react";
import api from "../../services/api";

const SUGGESTED_PROMPTS = [
  "💡 Brainstorm creative ideas for my project",
  "✍️ Draft a polite follow-up email",
  "💻 Explain React hooks and state management",
  "🌍 Translate a phrase into multiple languages",
];

const AIChatWindow = ({ onBack }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load conversation list on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get("/ai/history");
      setConversations(res.data || []);
    } catch (err) {
      console.error("Failed to load AI conversations:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load a specific conversation
  const loadConversation = async (conversationId) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.get(`/ai/history/${conversationId}`);
      setCurrentConversationId(conversationId);
      setMessages(res.data?.messages || []);
      setShowHistoryDrawer(false);
    } catch (err) {
      console.error("Failed to load conversation:", err);
      setErrorMessage("Could not load conversation history.");
    } finally {
      setLoading(false);
    }
  };

  // Start a new chat
  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setErrorMessage("");
    setInputMessage("");
    setShowHistoryDrawer(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/history/${convId}`);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (currentConversationId === convId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // Send message
  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if (!textToSend || !textToSend.trim() || loading) return;

    const trimmed = textToSend.trim();
    setLastPrompt(trimmed);
    setInputMessage("");
    setErrorMessage("");

    // Optimistically append user message
    const tempUserMsg = {
      _id: `temp-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.post("/ai/message", {
        conversationId: currentConversationId,
        message: trimmed,
      });

      const { conversationId, userMessage, aiMessage } = res.data;

      if (!currentConversationId && conversationId) {
        setCurrentConversationId(conversationId);
      }

      // Replace temp user message with real one and add AI response
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m._id !== tempUserMsg._id);
        return [...withoutTemp, userMessage, aiMessage];
      });

      // Refresh conversations list in background
      fetchConversations();
    } catch (err) {
      console.error("AI Message error:", err);
      const serverMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to receive response from Gemini AI.";
      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  // Retry last prompt on failure
  const handleRetry = () => {
    if (lastPrompt) {
      // Remove last failed user message if needed
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === "user") {
          return prev.slice(0, -1);
        }
        return prev;
      });
      handleSendMessage(lastPrompt);
    }
  };

  // Handle textarea enter & shift+enter
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy message text to clipboard
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-[#0f0a14] text-white">
      {/* ================= Header ================= */}
      <div className="flex items-center justify-between border-b border-[#2d1525] bg-[#1a0d1a] px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mr-1 rounded-full p-1 text-[#8696a0] hover:text-white md:hidden"
              aria-label="Back to contacts"
            >
              <ArrowLeft size={22} />
            </button>
          )}

          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E63E6D] to-[#7928CA] shadow-md shadow-[#E63E6D]/30">
            <Sparkles size={20} className="text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00a884] ring-2 ring-[#1a0d1a]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white">Rubee AI</h2>
              <span className="rounded-full bg-gradient-to-r from-[#E63E6D]/20 to-[#7928CA]/20 border border-[#E63E6D]/40 px-2 py-0.5 text-[10px] font-bold text-[#E63E6D]">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-[#00a884]">Online • Ready to assist</p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 text-[#8696a0]">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 rounded-xl bg-[#2d1525] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#E63E6D]/30 hover:text-white"
            title="Start New Chat"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryDrawer((prev) => !prev)}
            className={`rounded-full p-2 transition ${showHistoryDrawer
                ? "bg-[#E63E6D] text-white"
                : "hover:bg-[#2d1525] hover:text-white"
              }`}
            title="AI Chat History"
          >
            <History size={18} />
          </button>
        </div>
      </div>

      {/* ================= Main Chat & History Drawer ================= */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] p-4 md:p-6">
          {/* Empty Conversation Welcome State */}
          {messages.length === 0 && (
            <div className="mx-auto my-auto flex max-w-lg flex-col items-center justify-center text-center py-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#E63E6D] to-[#7928CA] shadow-xl shadow-[#E63E6D]/25 mb-4">
                <Sparkles size={32} className="text-white" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                Hello! How can I help you today?
              </h3>
              <p className="text-sm text-[#a08096] mb-6">
                Rubee AI is powered by Google Gemini. Ask questions, brainstorm, write messages, analyze code, and more.
              </p>

              {/* Suggested Prompt Chips */}
              <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="rounded-xl border border-[#2d1525] bg-[#1a0d1a]/80 p-3 text-xs text-[#d1c2cd] transition hover:border-[#E63E6D]/50 hover:bg-[#2d1525]/50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages List */}
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg._id || index}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"
                  }`}
              >
                {/* AI Avatar */}
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E63E6D] to-[#7928CA] shadow-md mt-1">
                    <Sparkles size={14} className="text-white" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow transition ${isUser
                      ? "bg-gradient-to-br from-[#E63E6D] to-[#C2185B] text-white rounded-tr-none"
                      : "bg-[#1a0d1a] border border-[#2d1525] text-[#f0dde7] rounded-tl-none"
                    }`}
                >
                  {/* Bubble Content */}
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Footer & Copy button */}
                  <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400 gap-2">
                    <span>
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>

                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopy(msg._id || index, msg.content)}
                        className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-white"
                        title="Copy to clipboard"
                      >
                        {copiedId === (msg._id || index) ? (
                          <Check size={12} className="text-[#00a884]" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E63E6D] to-[#7928CA] shadow-md">
                <Sparkles size={14} className="text-white animate-spin" />
              </div>
              <div className="rounded-2xl rounded-tl-none border border-[#2d1525] bg-[#1a0d1a] px-4 py-3 shadow flex items-center gap-2">
                <span className="text-xs text-[#a08096]">Rubee AI is thinking</span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E63E6D]" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E63E6D]" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#E63E6D]" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}

          {/* Error Message & Retry */}
          {errorMessage && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300 flex items-center justify-between gap-2">
              <span>⚠️ {errorMessage}</span>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1 rounded-lg bg-red-800/40 px-2.5 py-1 text-xs text-white transition hover:bg-red-700/60"
              >
                <RotateCcw size={12} />
                Retry
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* History Drawer */}
        {showHistoryDrawer && (
          <div className="absolute inset-y-0 right-0 z-20 flex w-72 flex-col border-l border-[#2d1525] bg-[#1a0d1a] shadow-2xl transition-transform duration-300">
            <div className="flex items-center justify-between border-b border-[#2d1525] p-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <History size={16} className="text-[#E63E6D]" />
                Conversations
              </h4>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="rounded-full p-1 text-[#8696a0] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingHistory ? (
                <div className="p-4 text-center text-xs text-[#8696a0]">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8696a0]">
                  No saved conversations yet.
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv._id}
                    onClick={() => loadConversation(conv._id)}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs cursor-pointer transition ${currentConversationId === conv._id
                        ? "bg-[#2d1525] text-white font-medium"
                        : "text-[#a08096] hover:bg-[#2d1525]/50 hover:text-white"
                      }`}
                  >
                    <span className="truncate pr-2">{conv.title || "Chat"}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(e, conv._id)}
                      className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-red-400"
                      title="Delete chat"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= Input Bar ================= */}
      <div className="border-t border-[#2d1525] bg-[#1a0d1a] p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Rubee AI anything... (Enter to send, Shift+Enter for new line)"
            disabled={loading}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl bg-[#2d1525] px-4 py-3 text-sm text-white outline-none placeholder:text-[#8696a0] focus:ring-1 focus:ring-[#E63E6D] disabled:opacity-50"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#E63E6D] to-[#FF5C87] text-white shadow-lg shadow-[#E63E6D]/20 transition hover:opacity-90 disabled:opacity-40"
            title="Send Message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatWindow;

