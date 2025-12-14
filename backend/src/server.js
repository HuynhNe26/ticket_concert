import express from "express";
import { connectDB, pool } from "./config/database.js";
import dotenv from "dotenv";
import cors from "cors";
// import routes
import authRouter from "./router/auth_route.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// server api
app.use("/api/auth", authRouter);










const PORT = process.env.PORT;
await connectDB();
app.listen(PORT, () => 
  console.log(`Server chạy trên cổng ${PORT}`)
);
