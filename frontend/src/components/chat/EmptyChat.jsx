import { Lock, MessageCircle } from "lucide-react";

const EmptyChat = () => {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#0b141a] text-center text-white"
    >

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Logo */}
        <div className="mb-8 flex h-44 w-44 items-center justify-center rounded-full bg-[#1f2c34] shadow-2xl">
          <MessageCircle
            size={90}
            className="text-[#00a884]"
            strokeWidth={1.5}
          />
        </div>

        {/* Heading */}
        <h1 className="mb-4 text-5xl font-light tracking-wide text-[#e9edef]">
          WhatsApp Web
        </h1>

        {/* Description */}
        <p className="max-w-lg text-center text-base leading-8 text-[#8696a0]">
          Send and receive messages without keeping your phone online.
          <br />
          Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
        </p>

        {/* Bottom Line */}
        <div className="mt-10 flex items-center gap-2 text-sm text-[#8696a0]">
          <Lock size={16} />
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default EmptyChat;