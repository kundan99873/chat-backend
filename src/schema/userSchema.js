import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Messages" }],
    refreshToken: { type: String, default: null, unique: true, sparse: true },
    isAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    lastActive: { type: Date },
  },
  {
    timestamps: true,
  }
);

const userModal = mongoose.model("User", userSchema);

export default userModal;
