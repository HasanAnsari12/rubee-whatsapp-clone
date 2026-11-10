// ===========================
// components/SearchBar.jsx
// ===========================

import { Search } from "lucide-react";

const SearchBar = ({ value, onChange, placeholder = "Search or start new chat" }) => {
  return (
    <div className="border-b border-[#2d1525] bg-[#1a0d1a] p-3">
      <div className="flex items-center gap-3 rounded-xl bg-[#2d1525] px-4 py-3 transition-all duration-300 focus-within:ring-1 focus-within:ring-[#E63E6D]">
        <Search size={18} className="text-[#a08096] shrink-0" />
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#a08096]"
        />
      </div>
    </div>
  );
};

export default SearchBar;
