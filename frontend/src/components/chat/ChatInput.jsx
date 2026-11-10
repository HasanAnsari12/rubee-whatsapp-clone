import { useRef, useState } from "react";
import {
  Smile,
  Send,
  Paperclip,
  Mic,
  Square,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import socket from "../../services/socket";

const ChatInput = ({ onSendMessage, selectedUser }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ==============================
  // Send Message
  // ==============================
  const handleSend = () => {
    if (!message.trim() && !selectedFile) return;

    onSendMessage({
      text: message,
      file: selectedFile,
    });

    // Stop typing event
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?._id && selectedUser?._id) {
      socket.emit("stopTyping", {
        senderId: user._id,
        receiverId: selectedUser._id,
      });
    }

    // Reset state
    setMessage("");
    setSelectedFile(null);
    setShowEmojiPicker(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==============================
  // Emoji Click
  // ==============================
  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  // ==============================
  // File Select
  // ==============================
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // ==============================
  // Typing Event
  // ==============================
  const handleTyping = (e) => {
    const value = e.target.value;
    setMessage(value);

    const user = JSON.parse(localStorage.getItem("user"));

    if (!user?._id || !selectedUser?._id) return;

    socket.emit("typing", {
      senderId: user._id,
      receiverId: selectedUser._id,
    });

    clearTimeout(window.typingTimeout);

    window.typingTimeout = setTimeout(() => {
      socket.emit("stopTyping", {
        senderId: user._id,
        receiverId: selectedUser._id,
      });
    }, 1000);
  };

  // ==============================
  // Start Recording
  // ==============================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        const audioFile = new File(
          [audioBlob],
          `voice-${Date.now()}.webm`,
          {
            type: "audio/webm",
          }
        );

        // Send recorded audio
        onSendMessage({
          text: "",
          file: audioFile,
          audioBlob: audioBlob,
        });
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      alert("Microphone access denied.");
    }
  };

  // ==============================
  // Stop Recording
  // ==============================
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="relative border-t border-[#2a3942] bg-[#202c33] p-4">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50">
          <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" />
        </div>
      )}

      {/* Selected File Name */}
      {selectedFile && (
        <div className="mb-2 text-sm text-[#00a884]">
          📎 {selectedFile.name}
        </div>
      )}

      {/* Recording Status */}
      {isRecording && (
        <div className="mb-2 text-sm text-red-400">
          🎤 Recording...
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-[#8696a0] hover:text-white"
        >
          <Smile size={24} />
        </button>

        {/* File Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-[#8696a0] hover:text-white"
        >
          <Paperclip size={24} />
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Message Input */}
        <input
          type="text"
          value={message}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message"
          className="flex-1 rounded-full bg-[#2a3942] px-4 py-3 text-white outline-none placeholder:text-[#8696a0]"
        />

        {/* Mic Button */}
        <button
          type="button"
          onClick={
            isRecording ? stopRecording : startRecording
          }
          className={`rounded-full p-3 text-white ${
            isRecording
              ? "bg-red-500 hover:bg-red-600"
              : "bg-[#2a3942] hover:bg-[#3b4a54]"
          }`}
        >
          {isRecording ? (
            <Square size={20} />
          ) : (
            <Mic size={20} />
          )}
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          className="rounded-full bg-[#00a884] p-3 text-white hover:bg-[#06cf9c]"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;