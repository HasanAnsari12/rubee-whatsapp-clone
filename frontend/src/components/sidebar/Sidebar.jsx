// ==================================
// frontend/src/components/Sidebar.jsx
// ==================================

import { useState, useEffect } from "react";
import {
  Search,
  MessageCircleMore,
  MoreVertical,
  LogOut,
  Sparkles,
  Users,
} from "lucide-react";

import UserItem from "./UserItem";
import api from "../../services/api";
import socket from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
import NewGroupModal from "../chat/NewGroupModal";

const Sidebar = ({
  selectedUser,
  setSelectedUser,
  onlineUsers = [],
}) => {
  const { user: authUser, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "direct" | "groups"
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Current logged in user (from AuthContext or fallback)
  const currentUser = authUser || (() => {
    try {
      const u = localStorage.getItem("user");
      return u && u !== "undefined" ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();

  // =========================
  // Fetch Users & Groups
  // =========================
  const fetchGroups = async () => {
    try {
      const res = await api.get("/groups");
      setGroups(res.data || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/users");
        setUsers(res.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
    fetchGroups();

    // Sockets for group updates
    const handleRefreshGroups = () => {
      fetchGroups();
    };

    socket.on("groupUpdated", handleRefreshGroups);
    socket.on("receiveGroupMessage", handleRefreshGroups);

    return () => {
      socket.off("groupUpdated", handleRefreshGroups);
      socket.off("receiveGroupMessage", handleRefreshGroups);
    };
  }, []);

  // =========================
  // Logout
  // =========================
  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="flex h-full flex-col bg-[#1a0d1a] text-[#f0dde7]">
      {/* ========================= */}
      {/* Top Navbar */}
      {/* ========================= */}
      <div className="flex items-center justify-between border-b border-[#2d1525] px-4 py-3">
        {/* Profile */}
        <div className="flex items-center gap-3">
          <img
            src={
              currentUser?.profilePic ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                currentUser?.name || "User"
              )}&background=6d1b45&color=fff`
            }
            alt="profile"
            className="h-11 w-11 rounded-full object-cover"
          />

          <div>
            <h2 className="text-sm font-semibold">
              {currentUser?.name || "User"}
            </h2>

            <p className="text-xs text-[#00a884]">
              Online
            </p>
          </div>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-3 text-[#8696a0]">
          {/* New Group Button */}
          <button
            type="button"
            onClick={() => setIsGroupModalOpen(true)}
            className="rounded-full p-1.5 transition hover:bg-[#2d1525] hover:text-white"
            title="Create New Group"
          >
            <Users size={19} />
          </button>

          {/* New Chat */}
          <MessageCircleMore
            size={20}
            className="cursor-pointer hover:text-white"
          />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="rounded-full p-1 transition hover:bg-[#2d1525]"
          >
            <LogOut
              size={20}
              className="cursor-pointer hover:text-white"
            />
          </button>

          {/* More */}
          <MoreVertical
            size={20}
            className="cursor-pointer hover:text-white"
          />
        </div>
      </div>

      {/* ========================= */}
      {/* Search Bar */}
      {/* ========================= */}
      <div className="border-b border-[#2d1525] bg-[#1a0d1a] p-3">
        <div className="flex items-center gap-3 rounded-xl bg-[#2d1525] px-4 py-3 transition-all duration-300 focus-within:ring-1 focus-within:ring-[#E63E6D]">
          <Search
            size={18}
            className="text-[#8696a0]"
          />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#8696a0]"
          />
        </div>
      </div>

      {/* ========================= */}
      {/* Rubee AI Assistant Entry */}
      {/* ========================= */}
      <div className="border-b border-[#2d1525] p-2">
        <button
          type="button"
          onClick={() =>
            setSelectedUser({
              _id: "rubee-ai",
              name: "Rubee AI Assistant",
              isAI: true,
            })
          }
          className={`flex w-full items-center gap-3 rounded-2xl p-2.5 transition-all duration-200 text-left ${
            selectedUser?.isAI
              ? "bg-gradient-to-r from-[#E63E6D]/20 to-[#7928CA]/20 border border-[#E63E6D]/50 shadow-sm"
              : "hover:bg-[#2d1525]/60 border border-transparent"
          }`}
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E63E6D] to-[#7928CA] shadow-md shadow-[#E63E6D]/30">
            <Sparkles size={20} className="text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#00a884] ring-2 ring-[#1a0d1a]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="truncate text-sm font-semibold text-white flex items-center gap-1.5">
                Rubee AI
                <span className="rounded bg-gradient-to-r from-[#E63E6D] to-[#7928CA] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                  Gemini
                </span>
              </h3>
            </div>
            <p className="truncate text-xs text-[#a08096]">
              Ask anything, write, brainstorm & help
            </p>
          </div>
        </button>
      </div>

      {/* ========================= */}
      {/* Filter Tabs */}
      {/* ========================= */}
      <div className="flex items-center gap-2 border-b border-[#2d1525] bg-[#140a14] px-3 py-2">
        {[
          { id: "all", label: "All" },
          { id: "direct", label: "Direct" },
          {
            id: "groups",
            label: "Groups",
            badge: groups.reduce((acc, g) => acc + (g.unreadCount || 0), 0),
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeTab === tab.id
                ? "bg-[#2d1525] text-white border border-[#E63E6D]/40"
                : "text-[#8696a0] hover:text-white"
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="ml-1.5 rounded-full bg-[#E63E6D] px-1.5 py-0.2 text-[9px] font-bold text-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================= */}
      {/* Conversation List (Groups + Contacts) */}
      {/* ========================= */}
      <div className="flex-1 overflow-y-auto">
        {/* Render Groups */}
        {(activeTab === "all" || activeTab === "groups") &&
          groups
            .filter((g) =>
              g.name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((grp) => {
              const isSelected =
                selectedUser?._id === grp._id && selectedUser?.isGroup;
              return (
                <div
                  key={grp._id}
                  onClick={() => setSelectedUser({ ...grp, isGroup: true })}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition border-b border-[#2d1525]/30 ${
                    isSelected ? "bg-[#2d1525]" : "hover:bg-[#201020]"
                  }`}
                >
                  {grp.groupPic ? (
                    <img
                      src={grp.groupPic}
                      alt={grp.name}
                      className="h-11 w-11 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E63E6D] to-[#7928CA] font-bold text-sm text-white shadow-sm">
                      {grp.name?.slice(0, 2).toUpperCase() || "GP"}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="truncate text-sm font-medium text-white flex items-center gap-1.5">
                        {grp.name}
                        <span className="rounded bg-[#2d1525] px-1.5 py-0.2 text-[9px] text-[#00D4FF] border border-[#00D4FF]/30">
                          Group
                        </span>
                      </h4>
                      {grp.unreadCount > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E63E6D] px-1 text-[10px] font-bold text-white">
                          {grp.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#8696a0]">
                      {grp.lastMessage?.text
                        ? `${grp.lastMessage.senderId?.name || "Member"}: ${grp.lastMessage.text}`
                        : grp.description || `${grp.members?.length || 0} members`}
                    </p>
                  </div>
                </div>
              );
            })}

        {/* Render Direct Contacts */}
        {(activeTab === "all" || activeTab === "direct") &&
          (() => {
            const filteredUsers = users.filter((u) => {
              const q = searchQuery.toLowerCase();
              return (
                u.name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q)
              );
            });

            if (
              filteredUsers.length === 0 &&
              searchQuery &&
              activeTab === "direct"
            ) {
              return (
                <div className="p-4 text-center text-sm text-[#8696a0]">
                  No contacts found
                </div>
              );
            }

            return filteredUsers.map((user) => (
              <UserItem
                key={user._id}
                user={{
                  ...user,
                  image:
                    user.profilePic ||
                    "https://i.pravatar.cc/150?img=12",
                  online: onlineUsers.includes(user._id),
                }}
                isActive={selectedUser?._id === user._id && !selectedUser?.isGroup}
                onClick={() => setSelectedUser(user)}
              />
            ));
          })()}
      </div>

      {/* New Group Modal */}
      <NewGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onGroupCreated={(newGrp) => {
          fetchGroups();
          setSelectedUser({ ...newGrp, isGroup: true });
        }}
      />
    </div>
  );
};

export default Sidebar;