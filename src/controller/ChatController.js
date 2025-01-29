import { Router } from "express";
import mongoose from "mongoose";
import Message from "../schema/messageSchema.js";

const router = Router();

router.get("/get-messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 15 } = req.query;

    if (!id) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    if (!isValidObjectId) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum <= 0 || limitNum <= 0) {
      return res
        .status(400)
        .json({ message: "Page and limit must be positive integers" });
    }

    // Query to find messages with pagination
    const chatData = await Message.find({ chatId: id })
      .sort({ timestamp: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate("senderId", "username")
      .exec();

    if (!chatData || chatData.length === 0) {
      return res
        .status(404)
        .json({ message: "No messages found for this chat", data: [] });
    }

    const totalMessages = await Message.countDocuments({ chatId: id });
    const formattedMessages = chatData.reverse().map((message) => ({
      message: message.message,
      senderId: message.senderId._id.toString(),
      timestamp: message.timestamp,
      username: message.senderId.username,
      isSeen: message.isSeen,
    }));

    // Send paginated response
    res.json({
      success: true,
      data: formattedMessages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore: pageNum * limitNum < totalMessages,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/seen-messages", async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing chat ID" });
    }

    const updateResult = await Message.updateMany(
      { chatId, senderId: userId, isSeen: false },
      { $set: { isSeen: true } }
    );

    console.log(updateResult);

    return res.json({
      success: true,
      message: "Messages marked as seen",
      updatedCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
