import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/database.js";

dotenv.config();

import { initZoneSocket } from "./socket/zone.js";

// users
import authRouter from "./router/users/user.js";
import eventsRouter from "./router/users/events.js";
import userLayoutRouter from "./router/users/layout.js";
import zoneRouter from "./router/users/zone.js";

// admins
import adminRouter from "./router/admins/admins.js";
import eventRouter from "./router/admins/events.js";
import userRouter from "./router/admins/user.js";
import adminLayoutRouter from "./router/admins/layout.js";
import categoriesRouter from "./router/admins/categories.js"
import { ChatSocket } from "./socket/chat_ai.js";


const app = express();
const httpServer = createServer(app);

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use("/api/users", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/layout", userLayoutRouter);
app.use("/api/zone", zoneRouter);

app.use("/api/admin/users", userRouter);
app.use("/api/admin/auth", adminRouter);
app.use("/api/admin/events", eventRouter);
app.use("/api/admin/layout", adminLayoutRouter);
app.use("/api/admin/categories", categoriesRouter);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initZoneSocket(io);
ChatSocket(io);
await connectDB();


const PORT = process.env.PORT ;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
