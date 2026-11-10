import { useEffect, useState } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import api from "../../services/api";
import socket from "../../services/socket";
import { Phone, Video, MoreVertical, X, ArrowLeft } from "lucide-react";
import { useCall } from "../../context/CallContext";

const ChatWindow = ({ selectedUser, onlineUsers = [], onBack }) => {
  const { startCall } = useCall();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const isUserOnline = onlineUsers.includes(selectedUser?._id);

  // ==============================
  // Mark Messages as Seen
  // ==============================
  const markMessagesAsSeen = async () => {
    if (!selectedUser?._id) return;
    try {
      await api.put("/messages/seen", { senderId: selectedUser._id });
      const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (loggedInUser?._id) {
        socket.emit("markSeen", {
          senderId: selectedUser._id,
          receiverId: loggedInUser._id,
        });
      }
    } catch (err) {
      console.error("Error marking messages as seen:", err);
    }
  };

  // ==============================
  // Fetch Messages
  // ==============================
  const fetchMessages = async () => {
    if (!selectedUser?._id) return;

    try {
      const res = await api.get(`/messages/${selectedUser._id}`);
      setMessages(res.data);

      const hasUnseen = res.data.some(
        (m) => String(m.senderId) === String(selectedUser._id) && !m.seen
      );
      if (hasUnseen) {
        markMessagesAsSeen();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // ==============================
  // Load messages when user changes
  // ==============================
  useEffect(() => {
    fetchMessages();
    setIsTyping(false);
    setReplyingTo(null);
  }, [selectedUser]);

  // ==============================
  // Real-time messages + typing + seen + reaction listeners
  // ==============================
  useEffect(() => {
    if (!selectedUser?._id) return;

    const handleReceiveMessage = (newMessage) => {
      if (
        String(newMessage.senderId) === String(selectedUser._id) ||
        String(newMessage.receiverId) === String(selectedUser._id)
      ) {
        setMessages((prev) => [
          ...prev,
          {
            ...newMessage,
            _id: newMessage._id || Date.now().toString(),
          },
        ]);

        if (String(newMessage.senderId) === String(selectedUser._id)) {
          markMessagesAsSeen();
        }
      }
    };

    const handleUserTyping = ({ senderId }) => {
      if (String(senderId) === String(selectedUser._id)) {
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = ({ senderId }) => {
      if (String(senderId) === String(selectedUser._id)) {
        setIsTyping(false);
      }
    };

    const handleMessagesSeen = ({ seenBy }) => {
      if (String(seenBy) === String(selectedUser._id)) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.receiverId) === String(seenBy) ? { ...m, seen: true } : m
          )
        );
      }
    };

    const handleMessageReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        )
      );
    };

    // Register listeners
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStopTyping", handleUserStopTyping);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("messageReaction", handleMessageReaction);

    // Cleanup
    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStopTyping", handleUserStopTyping);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("messageReaction", handleMessageReaction);
    };
  }, [selectedUser]);

  // ==============================
  // Send Message
  // ==============================
  const handleSendMessage = async (data) => {
    if ((!data.text || !data.text.trim()) && !data.file && !data.audioBlob) return;

    try {
      let fileUrl = "";
      let fileType = "";
      let audioUrl = "";

      // Agar audio hai to pehle upload karo
      if (data.audioBlob) {
        const uploadForm = new FormData();
        uploadForm.append("file", data.audioBlob, "voice.webm");
        const uploadRes = await api.post("/upload", uploadForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        audioUrl = uploadRes.data.url;
      } else if (data.file) {
        // Agar file hai to upload karo
        const uploadForm = new FormData();
        uploadForm.append("file", data.file);
        const uploadRes = await api.post("/upload", uploadForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        fileUrl = uploadRes.data.url;
        fileType = uploadRes.data.fileType;
      }

      // JSON body se message bhejo
      const res = await api.post("/messages", {
        receiverId: selectedUser._id,
        text: data.text || "",
        fileUrl,
        fileType,
        audioUrl,
        replyTo: replyingTo ? replyingTo._id : null,
      });

      // Socket.IO se real-time deliver karo
      socket.emit("sendMessage", res.data);

      setReplyingTo(null);

      // Messages refresh karo
      await fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // ==============================
  // No User Selected
  // ==============================
  if (!selectedUser) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0f0a14] text-[#a08096]">
        Select a chat to start messaging
      </div>
    );
  }

  // ==============================
  // UI
  // ==============================
  return (
    <div className="flex h-full w-full flex-col bg-[#0f0a14] text-white">
      {/* Header */}
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
          <img
            src={
              selectedUser.profilePic ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=6d1b45&color=fff`
            }
            alt={selectedUser.name}
            className="h-10 w-10 rounded-full object-cover"
          />

          <div>
            <h2 className="font-medium">{selectedUser.name}</h2>
           <p className="text-xs text-[#8696a0]">
        {isTyping
        ? "typing..."
        : isUserOnline
         ? "online"
         : "offline"}
       </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[#8696a0]">
          <button
            type="button"
            onClick={() => startCall(selectedUser, "video")}
            className="hover:text-white transition"
            title="Start video call"
          >
            <Video size={20} />
          </button>
          <button
            type="button"
            onClick={() => startCall(selectedUser, "audio")}
            className="hover:text-white transition"
            title="Start voice call"
          >
            <Phone size={20} />
          </button>
          <MoreVertical
            size={20}
            className="cursor-pointer hover:text-white"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] p-6">
        {messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={{
              ...message,
              sender:
                String(message.senderId) !==
                String(selectedUser._id),
              seen: !!message.seen,
            }}
            onReply={setReplyingTo}
          />
        ))}
      </div>

      {/* Reply Preview Banner */}
      {replyingTo && (
        <div className="glass-reply-bar flex items-center justify-between px-6 py-3 text-white transition-all duration-300">
          <div className="flex flex-col gap-1 border-l-2 border-[#00D4FF] pl-3">
            <span className="text-xs font-semibold text-[#00D4FF]">
              Replying to {replyingTo.senderId?._id === JSON.parse(localStorage.getItem("user"))?._id ? "yourself" : (replyingTo.senderId?.name || selectedUser.name)}
            </span>
            <span className="text-xs text-gray-400 line-clamp-1 font-mono">
              {replyingTo.text ? replyingTo.text : replyingTo.fileUrl ? (replyingTo.fileType?.startsWith("image/") ? "📷 Image" : "📎 File") : replyingTo.audioUrl ? "🎤 Voice message" : "Message"}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput
        selectedUser={selectedUser}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default ChatWindow;