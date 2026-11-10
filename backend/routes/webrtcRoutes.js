// ==========================================================
// backend/routes/webrtcRoutes.js
// WebRTC ICE Server & Signaling Configuration
// ==========================================================

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

/**
 * GET /api/webrtc/ice-servers
 * Returns STUN/TURN servers for WebRTC RTCPeerConnection
 * Requires JWT authentication to prevent unauthorized TURN usage
 */
router.get("/ice-servers", protect, (req, res) => {
  try {
    const iceServers = [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ];

    // Optional TURN server configured through environment variables
    if (process.env.TURN_URL) {
      const turnUrls = process.env.TURN_URL.split(",")
        .map((u) => u.trim())
        .filter(Boolean);

      if (turnUrls.length > 0) {
        const turnServer = {
          urls: turnUrls,
        };

        if (process.env.TURN_USERNAME) {
          turnServer.username = process.env.TURN_USERNAME;
        }

        if (process.env.TURN_CREDENTIAL) {
          turnServer.credential = process.env.TURN_CREDENTIAL;
        }

        iceServers.push(turnServer);
      }
    }

    res.status(200).json({
      success: true,
      iceServers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve ICE servers",
    });
  }
});

module.exports = router;

