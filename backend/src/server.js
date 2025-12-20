import dotenv from 'dotenv'
import express from "express";
import cors from "cors";
import { connectDB, pool } from "./config/database.js";
dotenv.config()

// users
import authRouter from "./router/users/user.js";
import eventsRouter from "./router/users/events.js";

// admins
import adminRouter from "./router/admins/admins.js"
import eventRouter from "./router/admins/events.js"
import userRouter from "./router/admins/user.js"
// import layoutRouter from "./router/admins/layout.js"

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use("/api/users", authRouter);
app.use("/api/events", eventsRouter);

app.use("/api/admin", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/admin/events", eventRouter);
// app.use("/api/layout", layoutRouter);

await connectDB();

const port = process.env.PORT;
app.listen(port, () => 
  console.log(`Server chạy trên cổng ${port}`)
);
