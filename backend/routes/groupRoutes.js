// ==========================================================
// backend/routes/groupRoutes.js
// Routes for WhatsApp-style Group Conversations
// ==========================================================

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createGroup,
  getGroups,
  getGroupDetails,
  updateGroup,
  addMembers,
  removeMember,
  leaveGroup,
  deleteGroup,
  getGroupMessages,
  sendGroupMessage,
  markGroupSeen,
} = require("../controllers/groupController");

// All group routes require JWT authentication
router.use(protect);

router.post("/", createGroup);
router.get("/", getGroups);
router.get("/:groupId", getGroupDetails);
router.put("/:groupId", updateGroup);
router.post("/:groupId/members", addMembers);
router.delete("/:groupId/members/:memberId", removeMember);
router.post("/:groupId/leave", leaveGroup);
router.delete("/:groupId", deleteGroup);
router.get("/:groupId/messages", getGroupMessages);
router.post("/:groupId/messages", sendGroupMessage);
router.put("/:groupId/seen", markGroupSeen);

module.exports = router;

