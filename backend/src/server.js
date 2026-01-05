import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/database.js";

dotenv.config();

// ================== ROUTERS ==================
// users
import authRouter from "./router/users/user.js";
import eventsRouter from "./router/users/events.js";
import layoutRouter from "./router/users/layout.js";
import zoneRouter from "./router/users/zone.js";

// admins
import adminRouter from "./router/admins/admins.js";
import eventRouter from "./router/admins/events.js";
import userRouter from "./router/admins/user.js";

// import layoutRouter from "./router/admins/layout.js";

// ================== APP ==================
const app = express();
const httpServer = createServer(app);

// ================== MIDDLEWARE ==================
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000", // ❗ FIX CORS
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ================== ROUTES ==================
app.use("/api/users", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/layout", )

app.use("/api/admin/users", userRouter);
app.use("/api/admin/auth", adminRouter);
app.use("/api/admin/events", eventRouter);

// app.use("/api/layout", layoutRouter);

// ================== SOCKET.IO ==================
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

export { io };
const PORT = process.env.PORT;

await connectDB();

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
