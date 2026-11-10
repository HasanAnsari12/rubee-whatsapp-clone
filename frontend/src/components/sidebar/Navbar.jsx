// ===========================
// components/Navbar.jsx
// ===========================

import { MessageCircleMore, MoreVertical, LogOut } from "lucide-react";

const Navbar = ({ onLogout }) => {
  const user = (() => {
    try {
      const data = localStorage.getItem("user");
      return data && data !== "undefined" ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="flex items-center justify-between border-b border-[#2d1525] bg-[#1a0d1a] px-4 py-3">
      {/* Profile */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={user?.profilePic || `https://i.pravatar.cc/150?u=${user?._id || "default"}`}
            alt="profile"
            className="h-11 w-11 rounded-full object-cover ring-2 ring-[#E63E6D]/30"
          />
          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1a0d1a] bg-[#E63E6D]" />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#f0dde7]">
            {user?.name || "User"}
          </h2>
          <p className="text-xs text-[#E63E6D]">● Online</p>
        </div>
      </div>

      {/* Icons */}
      <div className="flex items-center gap-3 text-[#a08096]">
        {/* Rubee Logo badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E63E6D] to-[#FF5C87] px-3 py-1">
          <span className="text-xs font-black text-white">Rubee</span>
        </div>

        {/* New Chat */}
        <MessageCircleMore
          size={20}
          className="cursor-pointer hover:text-[#E63E6D] transition-colors"
        />

        {/* Logout */}
        <button
          onClick={onLogout}
          className="rounded-full p-1 transition hover:bg-[#2d1525]"
          title="Logout"
        >
          <LogOut
            size={20}
            className="cursor-pointer hover:text-[#E63E6D] transition-colors"
          />
        </button>

        {/* More */}
        <MoreVertical
          size={20}
          className="cursor-pointer hover:text-[#E63E6D] transition-colors"
        />
      </div>
    </div>
  );
};

export default Navbar;
