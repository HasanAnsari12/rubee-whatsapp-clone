const UserItem = ({ user, isActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 border-b border-[#2a3942] px-4 py-3 hover:bg-[#2a3942] ${
        isActive ? "bg-[#2a3942]" : ""
      }`}
    >
      {/* Profile Image */}
      <div className="relative">
        <img
          src={user.image}
          alt={user.name}
          className="h-12 w-12 rounded-full object-cover"
        />

        {user.online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#202c33] bg-green-500"></span>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 overflow-hidden">
        <h3 className="truncate font-medium text-white">
          {user.name}
        </h3>

        <p className="truncate text-sm text-[#8696a0]">
          Start chatting...
        </p>
      </div>

      {/* Time */}
      <span className="text-xs text-[#8696a0]">Now</span>
    </div>
  );
};

export default UserItem;