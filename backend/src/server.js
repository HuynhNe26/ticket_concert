import dotenv from 'dotenv'
import express from "express";
import cors from "cors";
import { connectDB, pool } from "./config/database.js";
dotenv.config()

// users
import authRouter from "./router/users/user.js";

// admins
import adminRouter from "./router/admins/admins.js"

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use("/api/users", authRouter);

app.use("/api/admin", adminRouter);

await connectDB();

const port = process.env.PORT;
app.listen(port, () => 
  console.log(`Server chạy trên cổng ${port}`)
);
