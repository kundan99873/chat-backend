import express from "express";
import http from "http";
import { Server } from "socket.io";
import connectToMongo from "./config/dbConnection.js";
import SocketManager from "./socket/SocketManager.js";
import cors from "cors";
import userRouter from "./controller/UserController.js";
import cookieParser from "cookie-parser";
import { corsConfig } from "./constants/index.js";
import chatRouter from "./controller/ChatController.js";
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: corsConfig,
});
connectToMongo();

new SocketManager(io);

app.use(cors(corsConfig));
app.use(express.json());
app.use(cookieParser());
// console.log(io);
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/user", userRouter);
app.use("/api/chat", chatRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Page not found", url: req.originalUrl });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
