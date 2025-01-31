import express from "express";
import userModal from "../schema/userSchema.js";
import jwt from "jsonwebtoken";
const router = express.Router();
import dotenv from "dotenv";
import verifyToken from "../middleware/verifyToken.js";
import mongoose from "mongoose";
import Chat from "../schema/chatSchema.js";
import Message from "../schema/messageSchema.js";
dotenv.config();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const existingUser = await userModal.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    await userModal
      .create({
        username,
        email,
        password,
      })
      .then(() => {
        return res.json({ message: "User registered successfully" });
      })
      .catch((err) => {
        return res.status(400).json({ message: err.message });
      });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }
    const user = await userModal.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const userRole = user.isAdmin ? "admin" : "user";
    const accessToken = jwt.sign(
      { id: user._id, role: userRole },
      process.env.ACCESS_SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );
    const refreshToken = jwt.sign(
      { id: user._id, role: userRole },
      process.env.REFRESH_SECRET_KEY,
      {
        expiresIn: "7d",
      }
    );

    await userModal.updateOne(
      { _id: user._id },
      { $set: { refreshToken: refreshToken, isActive: true } }
    );

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .json({
        status: true,
        message: "Logged in successfully",
        isAdmin: user.isAdmin,
      });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/authenticate", verifyToken, (req, res) => {
  try {
    const user = req.User;
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (req.User.role === "admin") {
      return res
        .status(200)
        .json({ success: true, message: "User authenticated", isAdmin: true });
    }

    return res
      .status(200)
      .json({ success: true, message: "User authenticated", isAdmin: false });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/refresh-token", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res
        .status(403)
        .json({ success: false, message: "No refresh token provided" });
    }
    let decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET_KEY);
    const user = await userModal.findById(decoded.id);
    if (!user || !user.isActive) {
      return res
        .status(403)
        .json({ success: false, message: "User not found or inactive" });
    }
    const accessToken = jwt.sign(
      { id: user._id, role: userRole },
      process.env.ACCESS_SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );
    const newrefreshToken = jwt.sign(
      { id: user._id, role: userRole },
      process.env.REFRESH_SECRET_KEY,
      {
        expiresIn: "7d",
      }
    );

    await userModal.updateOne(
      { _id: user._id },
      { $set: { refreshToken: newrefreshToken } }
    );

    return res
      .status(200)
      .cookie("refreshToken", newrefreshToken, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .json({
        status: true,
        message: "Token updated successfully",
      });
  } catch (err) {
    return res
      .status(403)
      .json({ success: false, message: "No refresh token provided" });
  }
});

router.post("/logout", verifyToken, async (req, res) => {
  try {
    const user = req.User;
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    await userModal.updateOne(
      { _id: user.id },
      { $set: { refreshToken: null, isActive: false, lastActive: Date.now() } }
    );
    return res
      .status(200)
      .clearCookie("refreshToken")
      .clearCookie("accessToken")
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/login-user-details", verifyToken, async (req, res) => {
  try {
    const user = req.User;
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Unaunthenticate User" });
    }
    const userDetails = await userModal.findById(req.User.id);
    return res.status(200).json({
      success: true,
      message: "User login details fetched successfully",
      data: {
        username: userDetails.username,
        email: userDetails.email,
        id: req.User.id,
      },
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/all-users-chat", verifyToken, async (req, res) => {
  try {
    const loggedInUserId = req.User.id;

    const users = await userModal.find(
      { _id: { $ne: loggedInUserId } },
      { _id: 1, username: 1, email: 1 }
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/all-users", verifyToken, async (req, res) => {
  try {
    const loggedInUserId = req.User.id;
    const { search } = req.query;

    // Build the filter for searching users
    const userFilter = {
      _id: { $ne: loggedInUserId },
      ...(search && { username: { $regex: search, $options: "i" } }),
    };

    // Fetch users matching the filter
    const users = await userModal.find(userFilter, {
      _id: 1,
      username: 1,
      email: 1,
    });

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    // Fetch chat details for the filtered users
    const userChats = await Promise.all(
      users.map(async (user) => {
        const chat = await Chat.findOne({
          participants: { $all: [loggedInUserId, user._id] },
        });

        if (!chat) {
          return {
            userId: user._id,
            username: user.username,
            chatId: null,
            lastMessage: "Start Chat...",
            unreadMessagesCount: 0,
          };
        }

        const chatId = chat._id;

        const lastMessage = await Message.findOne({ chatId })
          .sort({ timestamp: -1 })
          .exec();

        const unreadMessagesCount = await Message.countDocuments({
          chatId,
          senderId: user._id,
          isSeen: false,
        });

        return {
          userId: user._id,
          username: user.username,
          chatId,
          lastMessage: lastMessage ? lastMessage.message : "No messages yet",
          unreadMessagesCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "User chats fetched successfully",
      data: userChats,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/get-user-details/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const loggedInUserId = req.User.id;

    const isValidObjectId = mongoose.Types.ObjectId.isValid(userId);
    if (!isValidObjectId) {
      return res.status(400).json({ message: "Invalid user IDs" });
    }
    console.log({ userId, loggedInUserId });
    if (!userId || userId === loggedInUserId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const user = await userModal.findById(userId, {
      _id: 1,
      username: 1,
      email: 1,
      isActive: 1,
      lastActive: 1,
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: user,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
