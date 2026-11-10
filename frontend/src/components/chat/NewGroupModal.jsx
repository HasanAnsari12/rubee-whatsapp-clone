// ==========================================================
// frontend/src/components/chat/NewGroupModal.jsx
// Modal for creating WhatsApp-style Group Conversations
// ==========================================================

import { useState, useEffect } from "react";
import { X, Users, Check, Upload } from "lucide-react";
import api from "../../services/api";

const NewGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [groupPic, setGroupPic] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setName("");
      setDescription("");
      setSelectedMemberIds([]);
      setGroupPic("");
      setError("");
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setAvailableUsers(res.data || []);
    } catch (err) {
      console.error("Failed to load contacts for group:", err);
    }
  };

  const toggleMember = (userId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handlePicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPic(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.url) {
        setGroupPic(res.data.url);
      }
    } catch (err) {
      console.error("Group pic upload error:", err);
      alert("Failed to upload group image");
    } finally {
      setUploadingPic(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a group name");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.post("/groups", {
        name: name.trim(),
        description: description.trim(),
        members: selectedMemberIds,
        groupPic: groupPic || "",
      });

      if (onGroupCreated) {
        onGroupCreated(res.data);
      }
      onClose();
    } catch (err) {
      console.error("Failed to create group:", err);
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[#2d1525] bg-[#1a0d1a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2d1525] px-6 py-4 bg-[#140a14]">
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <Users size={22} className="text-[#E63E6D]" />
            New Group
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#8696a0] hover:bg-[#2d1525] hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Group Photo + Name Row */}
          <div className="flex items-center gap-4">
            <label className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#2d1525] border border-[#E63E6D]/30 overflow-hidden hover:opacity-80 transition">
              {groupPic ? (
                <img src={groupPic} alt="Group" className="h-full w-full object-cover" />
              ) : (
                <Upload size={20} className="text-[#8696a0]" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePicUpload}
                disabled={uploadingPic}
                className="hidden"
              />
            </label>

            <div className="flex-1">
              <input
                type="text"
                placeholder="Group Subject / Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
                className="w-full rounded-xl bg-[#2d1525] px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#E63E6D] placeholder:text-[#8696a0]"
              />
            </div>
          </div>

          {/* Group Description */}
          <div>
            <textarea
              rows={2}
              placeholder="Group Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={250}
              className="w-full resize-none rounded-xl bg-[#2d1525] px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#E63E6D] placeholder:text-[#8696a0]"
            />
          </div>

          {/* Select Members Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs text-[#8696a0] mb-2 px-1">
              <span>Select Participants ({selectedMemberIds.length} selected)</span>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-2xl bg-[#140a14] p-2 border border-[#2d1525]">
              {availableUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8696a0]">
                  No contacts available.
                </div>
              ) : (
                availableUsers.map((u) => {
                  const isSelected = selectedMemberIds.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleMember(u._id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition ${
                        isSelected
                          ? "bg-[#2d1525] text-white"
                          : "hover:bg-[#201020] text-[#c0a0b6]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            u.profilePic ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              u.name
                            )}&background=6d1b45&color=fff`
                          }
                          alt={u.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-xs font-medium text-white">{u.name}</div>
                          <div className="text-[10px] text-[#8696a0] truncate max-w-[180px]">
                            {u.email}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-lg border transition ${
                          isSelected
                            ? "bg-[#E63E6D] border-[#E63E6D] text-white"
                            : "border-[#8696a0]/40"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-[#E63E6D] to-[#FF5C87] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#E63E6D]/25 transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating Group..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewGroupModal;

