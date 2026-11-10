// ==========================================================
// frontend/src/components/call/CallModal.jsx
// Full WhatsApp-styled Active WebRTC Call Window (Audio & Video)
// ==========================================================

import { useEffect, useRef } from "react";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Lock,
} from "lucide-react";
import { useCall } from "../../context/CallContext";

const formatDuration = (totalSeconds = 0) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const CallModal = () => {
  const {
    callState,
    callType,
    callUser,
    callDuration,
    isMuted,
    isVideoOff,
    statusMessage,
    localStream,
    remoteStream,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  // Attach remote stream to video & audio elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (
    callState !== "calling" &&
    callState !== "connecting" &&
    callState !== "connected" &&
    callState !== "ended"
  ) {
    return null;
  }

  const isVideo = callType === "video";
  const userAvatar =
    callUser?.profilePic ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      callUser?.name || "User"
    )}&background=6d1b45&color=fff`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Hidden audio element for remote stream output */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative flex h-full max-h-[850px] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#2d1525] bg-[#140a14] shadow-[0_0_80px_rgba(230,62,109,0.25)]">
        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-5">
          <div className="flex items-center gap-3">
            <img
              src={userAvatar}
              alt={callUser?.name}
              className="h-10 w-10 rounded-full object-cover border border-[#E63E6D]"
            />
            <div>
              <h3 className="font-semibold text-white drop-shadow">
                {callUser?.name || "WhatsApp Contact"}
              </h3>
              <p className="flex items-center gap-1.5 text-xs text-[#00D4FF]">
                <Lock size={12} />
                <span>End-to-end encrypted</span>
              </p>
            </div>
          </div>

          {/* Status / Duration Badge */}
          <div className="rounded-full bg-black/60 backdrop-blur px-3 py-1 text-xs font-medium text-white border border-white/10">
            {callState === "connected"
              ? formatDuration(callDuration)
              : statusMessage || (callState === "calling" ? "Calling..." : "Connecting...")}
          </div>
        </div>

        {/* Video or Audio Main Container */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#0a050d]">
          {isVideo ? (
            <>
              {/* Remote Video Stream */}
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div className="relative flex h-32 w-32 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-[#E63E6D]/20 animate-ping" />
                    <img
                      src={userAvatar}
                      alt={callUser?.name}
                      className="relative h-28 w-28 rounded-full object-cover border-2 border-[#E63E6D] shadow-xl"
                    />
                  </div>
                  <p className="text-sm font-medium text-[#8696a0]">
                    {statusMessage || "Waiting for video stream..."}
                  </p>
                </div>
              )}

              {/* Picture-in-Picture Local Video */}
              <div className="absolute bottom-24 right-5 z-20 h-36 w-28 sm:h-48 sm:w-36 overflow-hidden rounded-2xl border-2 border-[#E63E6D] bg-[#1a0d1a] shadow-2xl">
                {!isVideoOff && localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-[#1a0d1a] text-center p-2 text-xs text-[#8696a0]">
                    <VideoOff size={24} className="mb-1 text-red-400" />
                    <span>Camera off</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Audio Call Layout */
            <div className="flex flex-col items-center justify-center gap-6 p-8">
              <div className="relative flex h-40 w-40 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#E63E6D]/20 animate-ping" />
                <div className="absolute -inset-4 rounded-full border border-[#E63E6D]/40 animate-pulse" />
                <img
                  src={userAvatar}
                  alt={callUser?.name}
                  className="relative h-36 w-36 rounded-full object-cover border-4 border-[#E63E6D] shadow-2xl"
                />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {callUser?.name}
                </h2>
                <p className="text-sm text-[#00D4FF]">
                  {callState === "connected"
                    ? `Audio Call • ${formatDuration(callDuration)}`
                    : statusMessage || "Calling..."}
                </p>
              </div>

              {/* Animated Soundwave simulation for connected state */}
              {callState === "connected" && (
                <div className="flex items-center gap-1.5 h-8">
                  {[40, 70, 90, 60, 100, 50, 80, 45, 95, 65, 35].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-gradient-to-t from-[#E63E6D] to-[#7928CA] animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${(i * 120) % 1000}ms`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="z-20 flex items-center justify-center gap-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6">
          {/* Mute Mic Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg ${
              isMuted
                ? "bg-red-600/90 text-white hover:bg-red-700"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
            }`}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Toggle Video (If video call) */}
          {isVideo && (
            <button
              type="button"
              onClick={toggleVideo}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg ${
                isVideoOff
                  ? "bg-red-600/90 text-white hover:bg-red-700"
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
              }`}
              title={isVideoOff ? "Turn on camera" : "Turn off camera"}
            >
              {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>
          )}

          {/* End Call Button */}
          <button
            type="button"
            onClick={endCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-600/40 transition hover:bg-red-700 active:scale-95"
            title="End Call"
          >
            <PhoneOff size={26} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;

