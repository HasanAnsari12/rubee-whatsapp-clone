// ==========================================================
// frontend/src/components/call/IncomingCallModal.jsx
// WhatsApp-styled Incoming Call Popup Notification
// ==========================================================

import { Phone, PhoneOff, Video } from "lucide-react";
import { useCall } from "../../context/CallContext";

const IncomingCallModal = () => {
  const { callState, callType, callUser, acceptCall, rejectCall } = useCall();

  if (callState !== "ringing" || !callUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl border border-[#2d1525] bg-[#1a0d1a] p-6 text-center shadow-[0_0_50px_rgba(230,62,109,0.3)]">
        {/* Pulsing Avatar */}
        <div className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#E63E6D]/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full border border-[#E63E6D]/40 animate-pulse" />
          <img
            src={
              callUser.profilePic ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                callUser.name || "Caller"
              )}&background=6d1b45&color=fff`
            }
            alt={callUser.name}
            className="relative h-24 w-24 rounded-full object-cover border-2 border-[#E63E6D] shadow-lg"
          />
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-bold text-white mb-1">{callUser.name}</h3>
        <p className="flex items-center justify-center gap-1.5 text-sm text-[#00D4FF] mb-6">
          {callType === "video" ? (
            <>
              <Video size={16} />
              <span>Incoming Video Call...</span>
            </>
          ) : (
            <>
              <Phone size={16} />
              <span>Incoming Audio Call...</span>
            </>
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-12">
          {/* Decline */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => rejectCall("Call declined")}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition hover:bg-red-700 active:scale-95"
              title="Decline"
            >
              <PhoneOff size={26} />
            </button>
            <span className="text-xs text-[#8696a0]">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={acceptCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00a884] text-white shadow-lg shadow-[#00a884]/40 transition hover:bg-[#02906f] active:scale-95 animate-bounce"
              title="Accept"
            >
              {callType === "video" ? <Video size={26} /> : <Phone size={26} />}
            </button>
            <span className="text-xs text-[#00a884] font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;

