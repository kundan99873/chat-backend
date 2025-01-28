import { Router } from "express";
import mongoose from "mongoose";
import Message from "../schema/messageSchema.js";

const router = Router();

router.get("/get-messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    if (!isValidObjectId) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    const chatData = await Message.find({ chatId: id })
      .populate("senderId", "username")
      .exec();

    if (!chatData || chatData.length === 0) {
      return res.status(401).json({ message: "Chat not found", data: [] });
    }

    const formattedMessages = chatData.map((message) => ({
      message: message.message,
      senderId: message.senderId._id.toString(),
      timestamp: message.timestamp,
      username: message.senderId.username,
      isSeen: message.isSeen,
    }));
    res.json({ success: true, data: formattedMessages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/seen-messages", async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or missing chat ID" });
    }

    const updateResult = await Message.updateMany(
      { chatId, isSeen: false },
      { $set: { isSeen: true } }
    );

    console.log(updateResult)

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
