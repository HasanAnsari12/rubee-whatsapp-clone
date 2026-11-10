// ===========================
// components/TypingIndicator.jsx
// ===========================

const TypingIndicator = () => {
  return (
    <div className="flex items-end gap-2 justify-start px-2">
      <div className="relative max-w-[70%] rounded-lg bg-[#1a0d1a] border border-[#2d1525]/80 px-4 py-3 shadow">
        <div className="flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full bg-[#E63E6D] animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-2 w-2 rounded-full bg-[#E63E6D] animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-2 w-2 rounded-full bg-[#E63E6D] animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
