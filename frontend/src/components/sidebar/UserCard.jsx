// ===========================
// components/UserCard.jsx
// ===========================

const UserCard = ({ user, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-200 ${
        isActive
          ? "bg-[#2d1525] border-l-4 border-[#E63E6D]"
          : "hover:bg-[#2d1525]/50"
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <img
          src={user.profilePic || user.image || `https://i.pravatar.cc/150?u=${user._id}`}
          alt={user.name}
          className="h-12 w-12 rounded-full object-cover"
        />
        {/* Online dot */}
        {user.online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#1a0d1a] bg-[#E63E6D] shadow shadow-[#E63E6D]/50" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="truncate text-sm font-semibold text-[#f0dde7]">
            {user.name}
          </h3>
          {user.lastMessageTime && (
            <span className="text-xs text-[#a08096]">
              {user.lastMessageTime}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-[#a08096]">
          {user.online ? (
            <span className="text-[#E63E6D]">● Online</span>
          ) : (
            user.lastMessage || "No messages yet"
          )}
        </p>
      </div>
    </div>
  );
};

export default UserCard;
