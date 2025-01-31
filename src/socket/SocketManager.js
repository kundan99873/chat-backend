import Chat from "../schema/chatSchema.js";
import Message from "../schema/messageSchema.js";

const userSocketMap = {};

class SocketManager {
  constructor(io) {
    this.io = io;
    this.initialize();
  }

  initialize() {
    this.io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      socket.on("registerUser", ({ userId }) => {
        userSocketMap[userId] = socket.id;
        console.log(`User ${userId} connected with socket ID: ${socket.id}`);
      });

      socket.on("startChat", async ({ participants = [] }) => {
        console.log(
          `Client ${socket.id} wants to start a chat with participants: ${participants}`
        );

        console.log(participants);
        const uniqueParticipants = [...new Set(participants)];

        let chat = await this.getChatByParticipants(uniqueParticipants);
        if (!chat) {
          chat = await this.createChat(uniqueParticipants);
        }

        uniqueParticipants.forEach((participantId) => {
          const participantSocketId = this.getSocketIdForUser(participantId);
          if (participantSocketId) {
            this.io.to(participantSocketId).emit("chatId", chat._id);
          }
        });
      });

      socket.on("newMessage", async (chatId, senderId, message) => {
        console.log(`Message from ${senderId} in chat ${chatId}: ${message}`);

        await this.saveMessage(chatId, senderId, message);

        const chat = await Chat.findById(chatId);
        if (chat) {
          chat.participants.forEach((participantId) => {
            const participantSocketId = this.getSocketIdForUser(participantId);
            if (participantSocketId) {
              this.io
                .to(participantSocketId)
                .emit("newMessage", { senderId, message });
            }
          });
        }
      });

      socket.on("callUser", ({ to, offer, from }) => {
        console.log(`Call initiated from ${from} to ${to}`);
        const participantSocketId = this.getSocketIdForUser(to);
        if (participantSocketId) {
          this.io
            .to(participantSocketId)
            .emit("callIncoming", { from, offer });
        }
      });

      socket.on("answerCall", ({ to, answer, from }) => {
        console.log(`Call initiated from ${from} to ${to}`);
        const participantSocketId = this.getSocketIdForUser(to);
        if (participantSocketId) {
          this.io
            .to(participantSocketId)
            .emit("callAnswered", { from, answer });
        }
      });

      socket.on("iceCandidate", ({ to, candidate, from }) => {
        const participantSocketId = this.getSocketIdForUser(to);
        if (participantSocketId) {
          this.io
            .to(participantSocketId)
            .emit("iceCandidate", { from, candidate });
        }
      });

      socket.on("endCall", ({ to, from }) => {
        console.log(`Call ended from ${from} to ${to}`);
        const participantSocketId = this.getSocketIdForUser(to);
        if (participantSocketId) {
          // Emit to the other user that the call has ended
          this.io.to(participantSocketId).emit("callEnded", { from });
        }
      });


      socket.on("declineCall", ({ to, from }) => {
        console.log(`Call declined from ${from} to ${to}`);
        const participantSocketId = this.getSocketIdForUser(to);
        if (participantSocketId) {
          this.io.to(participantSocketId).emit("callDeclined", { from });
        }
      });
      

      socket.on("disconnect", () => {
        for (let userId in userSocketMap) {
          if (userSocketMap[userId] === socket.id) {
            delete userSocketMap[userId];
            break;
          }
        }
        console.log("Client disconnected:", socket.id);
      });
    });
  }

  async getChatByParticipants(participants) {
    console.log(participants, 107);

    return await Chat.findOne({
      participants: { $all: participants, $size: participants?.length },
    });
  }

  async createChat(participants) {
    const chat = new Chat({ participants });

    console.log({ participants });
    await chat.save();
    console.log("New chat created with ID:", chat._id);
    return chat;
  }

  async saveMessage(chatId, senderId, message) {
    const newMessage = new Message({ chatId, senderId, message });
    await newMessage.save();
    console.log("Message saved to database:", message);
  }

  getSocketIdForUser(userId) {
    return userSocketMap[userId];
  }
}

export default SocketManager;
