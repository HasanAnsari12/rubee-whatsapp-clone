// ==========================================================
// backend/controllers/groupController.js
// Complete WhatsApp-style Group Conversations Controller
// ==========================================================

const mongoose = require("mongoose");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

/**
 * POST /api/groups
 * Create a new group conversation
 */
const createGroup = async (req, res) => {
  try {
    const { name, description, members = [], groupPic } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    // Deduplicate members and ensure creator is member + admin
    const memberSet = new Set(
      members
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => id.toString())
    );
    memberSet.add(req.user._id.toString());

    const group = await Chat.create({
      name: name.trim(),
      description: (description || "").trim(),
      groupPic: groupPic || "",
      isGroup: true,
      admin: req.user._id,
      members: Array.from(memberSet),
    });

    const populatedGroup = await Chat.findById(group._id)
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic");

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create group" });
  }
};

/**
 * GET /api/groups
 * Fetch all groups the authenticated user belongs to (with unread count)
 */
const getGroups = async (req, res) => {
  try {
    const groups = await Chat.find({
      isGroup: true,
      members: req.user._id,
    })
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic")
      .populate({
        path: "lastMessage",
        populate: { path: "senderId", select: "name profilePic" },
      })
      .sort({ updatedAt: -1 });

    // Compute unread count for each group
    const groupsWithUnread = await Promise.all(
      groups.map(async (grp) => {
        const unreadCount = await Message.countDocuments({
          groupId: grp._id,
          senderId: { $ne: req.user._id },
          seenBy: { $ne: req.user._id },
        });

        return {
          ...grp.toObject(),
          unreadCount,
        };
      })
    );

    res.status(200).json(groupsWithUnread);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch groups" });
  }
};

/**
 * GET /api/groups/:groupId
 * Get details and member list of a group
 */
const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Chat.findById(groupId)
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic");

    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Membership check
    const isMember = group.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to view this group" });
    }

    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch group details" });
  }
};

/**
 * PUT /api/groups/:groupId
 * Update group name, description or group photo (Admin-only)
 */
const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, groupPic } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Chat.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Admin-only check
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only group admins can update group details" });
    }

    if (name && name.trim()) group.name = name.trim();
    if (typeof description === "string") group.description = description.trim();
    if (groupPic) group.groupPic = groupPic;

    await group.save();

    const updated = await Chat.findById(groupId)
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic");

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to update group" });
  }
};

/**
 * POST /api/groups/:groupId/members
 * Add participants to group (Admin-only)
 */
const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds = [] } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Chat.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Admin-only check
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only group admins can add members" });
    }

    const memberSet = new Set(group.members.map((m) => m.toString()));
    memberIds.forEach((id) => {
      if (mongoose.Types.ObjectId.isValid(id)) {
        memberSet.add(id.toString());
      }
    });

    group.members = Array.from(memberSet);
    await group.save();

    const updated = await Chat.findById(groupId)
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic");

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to add members" });
  }
};

/**
 * DELETE /api/groups/:groupId/members/:memberId
 * Remove participant from group (Admin-only)
 */
const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ message: "Invalid group or member ID" });
    }

    const group = await Chat.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Admin-only check
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only group admins can remove members" });
    }

    if (group.admin.toString() === memberId.toString()) {
      return res.status(400).json({ message: "Admin cannot be removed. Transfer admin or delete group." });
    }

    group.members = group.members.filter((m) => m.toString() !== memberId.toString());
    await group.save();

    const updated = await Chat.findById(groupId)
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic");

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to remove member" });
  }
};

/**
 * POST /api/groups/:groupId/leave
 * Member leaves the group
 */
const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Chat.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(400).json({ message: "You are not a member of this group" });
    }

    // Remove user from members
    group.members = group.members.filter(
      (m) => m.toString() !== req.user._id.toString()
    );

    // If leaving user was admin
    if (group.admin.toString() === req.user._id.toString()) {
      if (group.members.length > 0) {
        // Reassign admin to next remaining member
        group.admin = group.members[0];
      } else {
        // If no members remain, delete group and its messages
        await Message.deleteMany({ groupId: group._id });
        await Chat.findByIdAndDelete(group._id);
        return res.status(200).json({ message: "Group deleted as all members left" });
      }
    }

    await group.save();
    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to leave group" });
  }
};

/**
 * DELETE /api/groups/:groupId
 * Delete group and all messages (Admin-only)
 */
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Chat.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Admin-only check
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only group admins can delete the group" });
    }

    await Message.deleteMany({ groupId: group._id });
    await Chat.findByIdAndDelete(group._id);

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to delete group" });
  }
};

/**
 * GET /api/groups/:groupId/messages
 * Get message history for a group (Members-only)
 */
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Chat.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Membership check
    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to read group messages" });
    }

    const messages = await Message.find({ groupId })
      .populate("senderId", "name email profilePic")
      .populate("replyTo")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch group messages" });
  }
};

/**
 * POST /api/groups/:groupId/messages
 * Send a message to a group (Members-only)
 */
const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, fileUrl, fileType, audioUrl, replyTo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Chat.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Membership check
    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not authorized to send messages to this group" });
    }

    if (!text?.trim() && !fileUrl && !audioUrl) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const message = await Message.create({
      senderId: req.user._id,
      receiverId: null,
      groupId: group._id,
      text: (text || "").trim(),
      fileUrl: fileUrl || "",
      fileType: fileType || "",
      audioUrl: audioUrl || "",
      replyTo: replyTo || null,
      seenBy: [req.user._id],
    });

    group.lastMessage = message._id;
    await group.save();

    const populated = await Message.findById(message._id)
      .populate("senderId", "name email profilePic")
      .populate("replyTo");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to send group message" });
  }
};

/**
 * PUT /api/groups/:groupId/seen
 * Mark all group messages as seen by current user
 */
const markGroupSeen = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Chat.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Membership check
    const isMember = group.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Message.updateMany(
      {
        groupId: group._id,
        seenBy: { $ne: req.user._id },
      },
      {
        $addToSet: { seenBy: req.user._id },
      }
    );

    res.status(200).json({ message: "Group messages marked as seen" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to mark seen" });
  }
};

module.exports = {
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
};

