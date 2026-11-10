// ==========================================================
// frontend/src/context/CallContext.jsx
// Complete WebRTC Audio/Video Calling Context & Signaling
// ==========================================================

import { createContext, useContext, useState, useEffect, useRef } from "react";
import socket from "../services/socket";
import api from "../services/api";

const CallContext = createContext(null);

const DEFAULT_ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export const CallProvider = ({ children }) => {
  // Call State: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended'
  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState("video"); // 'audio' | 'video'
  const [callUser, setCallUser] = useState(null); // The other party (caller or callee)
  const [isCaller, setIsCaller] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const durationTimerRef = useRef(null);
  const ringTimeoutRef = useRef(null);
  const ringtoneAudioCtxRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);

  // Expose stream state to trigger UI re-renders when tracks change
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Helper: Play gentle synthesized ring chime for incoming calls
  const startRingingSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      ringtoneAudioCtxRef.current = ctx;

      const playChime = () => {
        if (!ctx || ctx.state === "closed") return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      };

      playChime();
      ringtoneIntervalRef.current = setInterval(playChime, 2000);
    } catch (err) {
      console.warn("AudioContext ringtone warning:", err);
    }
  };

  const stopRingingSound = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (ringtoneAudioCtxRef.current) {
      try {
        ringtoneAudioCtxRef.current.close();
      } catch (e) {}
      ringtoneAudioCtxRef.current = null;
    }
  };

  // Fetch ICE servers from backend
  const getIceServers = async () => {
    try {
      const res = await api.get("/webrtc/ice-servers");
      if (res.data?.iceServers?.length > 0) {
        return res.data.iceServers;
      }
    } catch (err) {
      console.warn("Falling back to default STUN servers:", err);
    }
    return DEFAULT_ICE_SERVERS;
  };

  // Full cleanup of tracks, connections, and timers
  const cleanupCall = () => {
    stopRingingSound();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    remoteStreamRef.current = null;
    iceCandidatesQueue.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
  };

  // Helper: Start Call Duration Timer
  const startDurationTimer = () => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  // Create & configure RTCPeerConnection
  const createPeerConnection = async (targetUserId) => {
    const iceServers = await getIceServers();
    const pc = new RTCPeerConnection({ iceServers });

    // Handle ICE Candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && targetUserId) {
        socket.emit("iceCandidate", {
          to: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    // Handle Remote Track
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        setRemoteStream(event.streams[0]);
      }
    };

    // Handle Connection State
    pc.onconnectionstatechange = () => {
      console.log("WebRTC Connection State:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallState("connected");
        setStatusMessage("");
        stopRingingSound();
        startDurationTimer();
      } else if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        handleEndCall("Connection lost");
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Process queued ICE candidates after remote description is set
  const processQueuedIceCandidates = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Error adding queued ICE candidate:", err);
      }
    }
  };

  // ==========================================
  // INITIATE CALL (Caller side)
  // ==========================================
  const startCall = async (targetUser, type = "video") => {
    if (!targetUser?._id) return;
    if (callState !== "idle") return;

    try {
      setCallUser(targetUser);
      setCallType(type);
      setIsCaller(true);
      setCallState("calling");
      setStatusMessage("Calling...");

      // 1. Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2. Initialize WebRTC PeerConnection
      const pc = await createPeerConnection(targetUser._id);

      // 3. Add local tracks to PeerConnection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 4. Create offer SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 5. Emit callUser via Socket.IO
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      socket.emit("callUser", {
        userToCall: targetUser._id,
        signalData: offer,
        callType: type,
        callerData: {
          _id: currentUser._id,
          name: currentUser.name,
          profilePic: currentUser.profilePic,
        },
      });

      // 6. Ringing timeout (30 seconds)
      ringTimeoutRef.current = setTimeout(() => {
        handleEndCall("No answer");
      }, 30000);
    } catch (err) {
      console.error("Failed to start call:", err);
      alert(
        err.name === "NotAllowedError"
          ? "Microphone/Camera permission denied."
          : `Failed to access media devices: ${err.message}`
      );
      cleanupCall();
      setCallState("idle");
    }
  };

  // ==========================================
  // ACCEPT CALL (Callee side)
  // ==========================================
  const acceptCall = async () => {
    stopRingingSound();
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    setCallState("connecting");
    setStatusMessage("Connecting...");

    try {
      // 1. Acquire media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      // 2. Initialize PeerConnection
      const pc = await createPeerConnection(callUser._id);

      // 3. Add tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 4. Set remote description (caller's offer)
      if (callUser.signal) {
        await pc.setRemoteDescription(new RTCSessionDescription(callUser.signal));
        await processQueuedIceCandidates();
      }

      // 5. Create answer SDP
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 6. Send answer via Socket.IO
      socket.emit("answerCall", {
        to: callUser._id,
        signal: answer,
      });
    } catch (err) {
      console.error("Failed to accept call:", err);
      alert(`Could not start media: ${err.message}`);
      rejectCall("Media error");
    }
  };

  // ==========================================
  // REJECT CALL (Callee declines)
  // ==========================================
  const rejectCall = (reason = "Call declined") => {
    stopRingingSound();
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);

    if (callUser?._id) {
      socket.emit("rejectCall", {
        to: callUser._id,
        reason,
      });
    }

    cleanupCall();
    setCallState("idle");
    setCallUser(null);
  };

  // ==========================================
  // END CALL (Either party hangs up)
  // ==========================================
  const endCall = () => {
    if (callUser?._id) {
      socket.emit("endCall", { to: callUser._id });
    }
    handleEndCall("Call ended");
  };

  const handleEndCall = (message = "Call ended") => {
    setStatusMessage(message);
    setCallState("ended");

    setTimeout(() => {
      cleanupCall();
      setCallState("idle");
      setCallUser(null);
      setStatusMessage("");
    }, 1500);
  };

  // ==========================================
  // MEDIA TOGGLES (Mute / Video Off)
  // ==========================================
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // ==========================================
  // SOCKET SIGNALING LISTENERS
  // ==========================================
  useEffect(() => {
    // 1. Incoming Call Event
    const handleIncomingCall = ({ from, callerName, callerPic, callType: incomingType, signal }) => {
      if (callState !== "idle") {
        // User is currently busy in another call
        return socket.emit("rejectCall", { to: from, reason: "busy" });
      }

      setCallUser({
        _id: from,
        name: callerName,
        profilePic: callerPic,
        signal,
      });
      setCallType(incomingType);
      setIsCaller(false);
      setCallState("ringing");
      startRingingSound();

      // Notify caller that receiver is ringing
      socket.emit("callRinging", { callerId: from });

      // Ringing timeout (30 seconds)
      ringTimeoutRef.current = setTimeout(() => {
        rejectCall("missed");
      }, 30000);
    };

    // 2. Caller receives ringing acknowledgement
    const handleCallRinging = () => {
      setStatusMessage("Ringing...");
    };

    // 3. Caller receives call accepted (Answer SDP)
    const handleCallAccepted = async ({ signal }) => {
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }

      setCallState("connecting");
      setStatusMessage("Connecting...");

      const pc = peerConnectionRef.current;
      if (pc && signal) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          await processQueuedIceCandidates();
        } catch (err) {
          console.error("Error setting remote description on caller:", err);
        }
      }
    };

    // 4. Call Rejected
    const handleCallRejected = ({ reason }) => {
      let msg = "Call declined";
      if (reason === "busy") msg = "User is busy in another call";
      else if (reason === "missed") msg = "Call timed out";
      handleEndCall(msg);
    };

    // 5. Call Ended by remote peer
    const handleCallEnded = ({ reason }) => {
      handleEndCall(reason || "Call ended");
    };

    // 6. Remote user busy
    const handleUserBusy = ({ reason }) => {
      handleEndCall(reason || "User is currently busy");
    };

    // 7. Call failed (offline, unauthorized, etc.)
    const handleCallFailed = ({ reason }) => {
      handleEndCall(reason || "Call failed");
    };

    // 8. ICE Candidate received
    const handleReceiveIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (pc && candidate) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("Error adding incoming ICE candidate:", err);
          }
        } else {
          iceCandidatesQueue.current.push(candidate);
        }
      }
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callRinging", handleCallRinging);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);
    socket.on("userBusy", handleUserBusy);
    socket.on("callFailed", handleCallFailed);
    socket.on("receiveIceCandidate", handleReceiveIceCandidate);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callRinging", handleCallRinging);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      socket.off("callEnded", handleCallEnded);
      socket.off("userBusy", handleUserBusy);
      socket.off("callFailed", handleCallFailed);
      socket.off("receiveIceCandidate", handleReceiveIceCandidate);
    };
  }, [callState]);

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        callUser,
        isCaller,
        callDuration,
        isMuted,
        isVideoOff,
        statusMessage,
        localStream,
        remoteStream,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};

