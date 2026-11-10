// ==========================================================
// frontend/src/components/chat/GroupChatWindow.jsx
// Dedicated WhatsApp-style Group Chat Window
// ==========================================================

import { useState, useEffect, useRef } from "react";
import {
  Users,
  Send,
  Paperclip,
  Mic,
  ArrowLeft,
  MoreVertical,
  X,
  UserPlus,
  UserMinus,
  Shield,
  LogOut,
  Trash2,
  CheckCheck,
} from "lucide-react";
import api from "../../services/api";
import socket from "../../services/socket";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";

const SENDER_COLORS = [
  "#00D4FF",
  "#FF5C87",
  "#00E676",
  "#FFB300",
  "#E040FB",
  "#00E5FF",
  "#FF6D00",
];

const getSenderColor = (userId = "") => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
};

const GroupChatWindow = ({ group, onBack, onGroupUpdated }) => {
  const [messages, setMessages] = useState([]);
  const [groupDetails, setGroupDetails] = useState(group);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState([]);

  const messagesEndRef = useRef(null);

  const currentUserId = (() => {
    try {
      const u = localStorage.getItem("user");
      return u && u !== "undefined" ? JSON.parse(u)?._id : null;
    } catch {
      return null;
    }
  })();

  const isAdmin =
    groupDetails.admin?._id === currentUserId ||
    groupDetails.admin === currentUserId;

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load group details and messages
  useEffect(() => {
    if (!group?._id) return;

    fetchGroupDetails();
    fetchGroupMessages();
    markGroupMessagesAsSeen();

    // Socket: Join group room
    socket.emit("joinGroupRoom", { groupId: group._id });

    // Socket Listeners
    const handleReceiveGroupMessage = (newMsg) => {
      if (newMsg.groupId === group._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        markGroupMessagesAsSeen();
      }
    };

    const handleUserGroupTyping = ({ groupId, senderName }) => {
      if (groupId === group._id) {
        setTypingUsers((prev) =>
          prev.includes(senderName) ? prev : [...prev, senderName]
        );
      }
    };

    const handleUserGroupStopTyping = ({ groupId, senderName }) => {
      if (groupId === group._id) {
        setTypingUsers((prev) => prev.filter((name) => name !== senderName));
      }
    };

    const handleGroupUpdated = ({ groupId }) => {
      if (groupId === group._id) {
        fetchGroupDetails();
        if (onGroupUpdated) onGroupUpdated();
      }
    };

    socket.on("receiveGroupMessage", handleReceiveGroupMessage);
    socket.on("userGroupTyping", handleUserGroupTyping);
    socket.on("userGroupStopTyping", handleUserGroupStopTyping);
    socket.on("groupUpdated", handleGroupUpdated);

    return () => {
      socket.emit("leaveGroupRoom", { groupId: group._id });
      socket.off("receiveGroupMessage", handleReceiveGroupMessage);
      socket.off("userGroupTyping", handleUserGroupTyping);
      socket.off("userGroupStopTyping", handleUserGroupStopTyping);
      socket.off("groupUpdated", handleGroupUpdated);
    };
  }, [group?._id]);

  const fetchGroupDetails = async () => {
    try {
      const res = await api.get(`/groups/${group._id}`);
      setGroupDetails(res.data);
    } catch (err) {
      console.error("Failed to load group details:", err);
    }
  };

  const fetchGroupMessages = async () => {
    try {
      const res = await api.get(`/groups/${group._id}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Failed to fetch group messages:", err);
    }
  };

  const markGroupMessagesAsSeen = async () => {
    try {
      await api.put(`/groups/${group._id}/seen`);
    } catch (err) {
      console.error("Error marking group seen:", err);
    }
  };

  // Send message to group
  const handleSendMessage = async (data) => {
    if (!data.text?.trim() && !data.file && !data.audioBlob) return;

    try {
      let fileUrl = "";
      let fileType = "";
      let audioUrl = "";

      if (data.audioBlob) {
        const uploadForm = new FormData();
        uploadForm.append("file", data.audioBlob, "voice.webm");
        const uploadRes = await api.post("/upload", uploadForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        audioUrl = uploadRes.data.url;
      } else if (data.file) {
        const uploadForm = new FormData();
        uploadForm.append("file", data.file);
        const uploadRes = await api.post("/upload", uploadForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        fileUrl = uploadRes.data.url;
        fileType = uploadRes.data.fileType;
      }

      const res = await api.post(`/groups/${group._id}/messages`, {
        text: data.text || "",
        fileUrl,
        fileType,
        audioUrl,
        replyTo: replyingTo ? replyingTo._id : null,
      });

      // Broadcast via socket
      socket.emit("sendGroupMessage", res.data);
      setReplyingTo(null);

      // Local update
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      console.error("Error sending group message:", err);
      alert("Failed to send message to group.");
    }
  };

  // Admin: Remove member
  const handleRemoveMember = async (memberId) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await api.delete(`/groups/${group._id}/members/${memberId}`);
      socket.emit("groupUpdated", { groupId: group._id });
      fetchGroupDetails();
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    }
  };

  // Admin: Add members modal trigger
  const openAddMembers = async () => {
    try {
      const res = await api.get("/users");
      const currentMemberIds = (groupDetails.members || []).map((m) =>
        m._id ? m._id.toString() : m.toString()
      );
      setAllUsers((res.data || []).filter((u) => !currentMemberIds.includes(u._id)));
      setSelectedToAdd([]);
      setShowAddMembersModal(true);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  // Admin: Add members submit
  const handleAddMembersSubmit = async () => {
    if (selectedToAdd.length === 0) return;
    try {
      await api.post(`/groups/${group._id}/members`, {
        memberIds: selectedToAdd,
      });
      socket.emit("groupUpdated", { groupId: group._id });
      setShowAddMembersModal(false);
      fetchGroupDetails();
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add members");
    }
  };

  // Leave Group
  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      await api.post(`/groups/${group._id}/leave`);
      socket.emit("groupUpdated", { groupId: group._id });
      if (onGroupUpdated) onGroupUpdated();
      if (onBack) onBack();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to leave group");
    }
  };

  const membersList = groupDetails.members || [];

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
              aria-label="Back to groups"
            >
              <ArrowLeft size={22} />
            </button>
          )}

          <div
            onClick={() => setShowInfoDrawer(true)}
            className="flex items-center gap-3 cursor-pointer"
          >
            {groupDetails.groupPic ? (
              <img
                src={groupDetails.groupPic}
                alt={groupDetails.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E63E6D] to-[#7928CA] font-bold text-white shadow-md">
                {groupDetails.name?.slice(0, 2).toUpperCase() || "GP"}
              </div>
            )}

            <div>
              <h2 className="font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                {groupDetails.name}
              </h2>
              <p className="text-xs text-[#8696a0]">
                {typingUsers.length > 0
                  ? `${typingUsers.join(", ")} typing...`
                  : `${membersList.length} participants`}
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3 text-[#8696a0]">
          <button
            type="button"
            onClick={() => setShowInfoDrawer((prev) => !prev)}
            className="rounded-full p-2 transition hover:bg-[#2d1525] hover:text-white"
            title="Group Info"
          >
            <Users size={20} />
          </button>
        </div>
      </div>

      {/* ================= Messages Area + Info Drawer ================= */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] p-4 md:p-6">
          {messages.map((message) => {
            const isSender =
              String(message.senderId?._id || message.senderId) ===
              String(currentUserId);
            const senderName = message.senderId?.name || "Participant";
            const senderColor = getSenderColor(
              String(message.senderId?._id || message.senderId)
            );

            return (
              <div
                key={message._id}
                className={`flex flex-col ${
                  isSender ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`group relative max-w-[78%] rounded-2xl px-4 py-2.5 shadow transition-all duration-200 ${
                    isSender
                      ? "bg-gradient-to-br from-[#E63E6D] to-[#C2185B] text-white rounded-tr-none"
                      : "bg-[#1a0d1a] text-white border border-[#2d1525]/80 rounded-tl-none"
                  }`}
                >
                  {/* Sender Name in Group Chat */}
                  {!isSender && (
                    <div
                      className="text-xs font-bold mb-1"
                      style={{ color: senderColor }}
                    >
                      {senderName}
                    </div>
                  )}

                  {/* Text Message */}
                  {message.text && (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.text}
                    </p>
                  )}

                  {/* Audio Voice Note */}
                  {message.audioUrl && (
                    <div className="my-1">
                      <audio controls src={message.audioUrl} className="max-w-xs" />
                    </div>
                  )}

                  {/* Image Attachment */}
                  {message.fileUrl && message.fileType?.startsWith("image/") && (
                    <img
                      src={message.fileUrl}
                      alt="Attachment"
                      className="mt-2 max-w-full rounded-xl"
                    />
                  )}

                  {/* File Download */}
                  {message.fileUrl &&
                    !message.fileType?.startsWith("image/") &&
                    !message.fileType?.startsWith("audio/") && (
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-xs text-blue-300 underline"
                      >
                        📎 Download Attachment
                      </a>
                    )}

                  {/* Timestamp & Read Info */}
                  <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-gray-300">
                    <span>
                      {new Date(message.createdAt || Date.now()).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                    {isSender && (
                      <CheckCheck
                        size={14}
                        className={
                          (message.seenBy?.length || 0) > 1
                            ? "text-blue-400"
                            : "text-gray-400"
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Group Info Drawer */}
        {showInfoDrawer && (
          <div className="absolute inset-y-0 right-0 z-20 flex w-80 flex-col border-l border-[#2d1525] bg-[#1a0d1a] shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#2d1525] p-4 bg-[#140a14]">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users size={18} className="text-[#E63E6D]" />
                Group Details
              </h3>
              <button
                type="button"
                onClick={() => setShowInfoDrawer(false)}
                className="rounded-full p-1 text-[#8696a0] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Group Banner */}
            <div className="p-6 text-center border-b border-[#2d1525]">
              {groupDetails.groupPic ? (
                <img
                  src={groupDetails.groupPic}
                  alt={groupDetails.name}
                  className="mx-auto h-20 w-20 rounded-full object-cover shadow-lg border border-[#E63E6D]/30 mb-3"
                />
              ) : (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#E63E6D] to-[#7928CA] font-bold text-2xl text-white shadow-lg mb-3">
                  {groupDetails.name?.slice(0, 2).toUpperCase() || "GP"}
                </div>
              )}

              <h4 className="text-lg font-bold text-white">{groupDetails.name}</h4>
              <p className="text-xs text-[#a08096] mt-1">
                {groupDetails.description || "No description provided"}
              </p>
            </div>

            {/* Participants Section */}
            <div className="p-4 flex-1">
              <div className="flex items-center justify-between mb-3 text-xs text-[#8696a0]">
                <span>{membersList.length} Participants</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openAddMembers}
                    className="flex items-center gap-1 text-[#E63E6D] hover:underline"
                  >
                    <UserPlus size={14} /> Add
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {membersList.map((m) => {
                  const mId = m._id ? m._id.toString() : m.toString();
                  const isThisAdmin =
                    groupDetails.admin?._id === mId ||
                    groupDetails.admin === mId;

                  return (
                    <div
                      key={mId}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#201020]/60 border border-[#2d1525]"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            m.profilePic ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              m.name || "Member"
                            )}&background=6d1b45&color=fff`
                          }
                          alt="member"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-xs font-medium text-white flex items-center gap-1.5">
                            {m.name || "Member"}
                            {mId === currentUserId && (
                              <span className="text-[10px] text-[#8696a0]">(You)</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#8696a0]">{m.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isThisAdmin && (
                          <span className="flex items-center gap-1 rounded bg-[#E63E6D]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#E63E6D] border border-[#E63E6D]/30">
                            <Shield size={10} /> Admin
                          </span>
                        )}

                        {isAdmin && !isThisAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(mId)}
                            className="p-1 text-gray-400 hover:text-red-400 transition"
                            title="Remove Member"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leave Group Action */}
            <div className="p-4 border-t border-[#2d1525]">
              <button
                type="button"
                onClick={handleLeaveGroup}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-950/20 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-900/40 transition"
              >
                <LogOut size={16} /> Leave Group
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-[#2d1525] bg-[#1a0d1a] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2d1525] pb-3 mb-3">
              <h4 className="font-semibold text-white text-sm">Add Participants</h4>
              <button
                type="button"
                onClick={() => setShowAddMembersModal(false)}
                className="text-[#8696a0] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 mb-4">
              {allUsers.length === 0 ? (
                <div className="text-center text-xs text-[#8696a0] p-4">
                  All contacts are already in this group.
                </div>
              ) : (
                allUsers.map((u) => {
                  const isSel = selectedToAdd.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() =>
                        setSelectedToAdd((prev) =>
                          isSel
                            ? prev.filter((id) => id !== u._id)
                            : [...prev, u._id]
                        )
                      }
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                        isSel ? "bg-[#2d1525] text-white" : "hover:bg-[#201020] text-[#c0a0b6]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            u.profilePic ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              u.name
                            )}&background=6d1b45&color=fff`
                          }
                          alt={u.name}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                        <div className="text-xs font-medium text-white">{u.name}</div>
                      </div>
                      <input type="checkbox" checked={isSel} readOnly />
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={handleAddMembersSubmit}
              disabled={selectedToAdd.length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-[#E63E6D] to-[#FF5C87] py-2.5 text-xs font-semibold text-white disabled:opacity-50 transition"
            >
              Add Selected ({selectedToAdd.length})
            </button>
          </div>
        </div>
      )}

      {/* ================= Chat Input ================= */}
      <ChatInput
        selectedUser={{ _id: group._id, name: group.name }}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default GroupChatWindow;
