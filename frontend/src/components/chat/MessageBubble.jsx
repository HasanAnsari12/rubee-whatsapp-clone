import { useState, useEffect } from "react";
import { Check, CheckCheck, CornerUpLeft } from "lucide-react";
import api from "../../services/api";
import socket from "../../services/socket";

const MessageBubble = ({ message, onReply }) => {
  const isSender = message.sender;
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState(message.reactions || []);

  useEffect(() => {
    setReactions(message.reactions || []);
  }, [message.reactions]);

  // Add reaction
  const handleReaction = async (emoji) => {
    try {
      const res = await api.put(`/messages/${message._id}/reaction`, {
        emoji,
      });

      if (res.data?.reactions) {
        setReactions(res.data.reactions);
        const otherUserId = isSender ? message.receiverId : message.senderId;
        if (otherUserId) {
          socket.emit("sendReaction", {
            messageId: message._id,
            reactions: res.data.reactions,
            receiverId: otherUserId,
          });
        }
      }

      // Reaction picker hide kar do
      setShowReactions(false);
    } catch (error) {
      console.error("Reaction error:", error);
    }
  };

  const handleScrollToOriginal = (replyId) => {
    if (!replyId) return;
    const element = document.getElementById(`msg-${replyId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      
      // Add visual highlight
      element.classList.add("reply-highlight");
      setTimeout(() => {
        element.classList.remove("reply-highlight");
      }, 1500);
    }
  };

  return (
    <div
      id={`msg-${message._id}`}
      className={`group flex items-center gap-2 ${
        isSender ? "justify-end flex-row-reverse" : "justify-start"
      }`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      <div
        className={`relative max-w-[70%] rounded-lg px-4 py-2 shadow transition-all duration-300 ${
          isSender
            ? "bg-gradient-to-br from-[#E63E6D] to-[#C2185B] text-white"
            : "bg-[#1a0d1a] text-white border border-[#2d1525]/80"
        }`}
      >
        {/* Reply Preview inside the Bubble */}
        {message.replyTo && (
          <div
            onClick={() => handleScrollToOriginal(message.replyTo._id || message.replyTo)}
            className="glass-reply-preview mb-2 cursor-pointer p-2 text-xs border-l-2 transition hover:bg-black/30"
          >
            <div className="font-semibold text-[#00D4FF]">
              {message.replyTo.senderId?._id === JSON.parse(localStorage.getItem("user"))?._id
                ? "You"
                : (message.replyTo.senderId?.name || "User")}
            </div>
            <div className="text-gray-300 line-clamp-1 font-mono">
              {message.replyTo.text ? message.replyTo.text : message.replyTo.fileUrl ? (message.replyTo.fileType?.startsWith("image/") ? "📷 Image" : "📎 File") : message.replyTo.audioUrl ? "🎤 Voice message" : "Message"}
            </div>
          </div>
        )}

        {/* Text Message */}
        {message.text && message.text.trim() && (
          <p className="whitespace-pre-wrap break-words">
            {message.text}
          </p>
        )}

        {/* Voice Message */}
        {(message.audioUrl || (message.fileUrl && message.fileType?.startsWith("audio/"))) && (
          <div className="mb-2">
            <audio
              controls
              src={message.audioUrl || message.fileUrl}
              className="max-w-xs"
            />
          </div>
        )}

        {/* Image Preview */}
        {message.fileUrl &&
          message.fileType?.startsWith("image/") && (
            <img
              src={message.fileUrl}
              alt="Shared file"
              className="mt-2 max-w-full rounded-lg"
            />
          )}

        {/* Non-Image & Non-Audio File */}
        {message.fileUrl &&
          !message.fileType?.startsWith("image/") &&
          !message.fileType?.startsWith("audio/") && (
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-blue-300 underline"
            >
              📎 Download File
            </a>
          )}

        {/* Reaction Picker - only on hover */}
        {showReactions && (
          <div className="absolute -top-12 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-[#1a0d1a] border border-[#2d1525]/60 px-3 py-2 shadow-lg">
            {["👍", "❤️", "😂", "🔥", "😮"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-lg transition hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Show Saved Reactions */}
        {reactions &&
          reactions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {reactions.map((reaction, index) => (
                <span
                  key={index}
                  className="rounded-full bg-[#2a3942] px-2 py-1 text-sm"
                >
                  {reaction.emoji}
                </span>
              ))}
            </div>
          )}

        {/* Seen Status */}
        {isSender && (
          <div className="mt-1 flex justify-end text-xs text-gray-300">
            {message.seen ? (
              <CheckCheck
                size={16}
                className="text-blue-400"
              />
            ) : (
              <Check size={16} />
            )}
          </div>
        )}
      </div>

      {/* Reply Action Button */}
      <button
        onClick={() => onReply(message)}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full bg-[#1a0d1a]/80 backdrop-blur border border-white/10 hover:bg-[#E63E6D]/30 text-gray-400 hover:text-white"
        title="Reply"
      >
        <CornerUpLeft size={16} />
      </button>
    </div>
  );
};

export default MessageBubble;