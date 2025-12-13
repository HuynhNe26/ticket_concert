import dotenv from 'dotenv'
import express from "express";
import { connectDB, pool } from "./config/database.js";
dotenv.config()

// users
import userRouter from "./router/users/users.js";

// admins


const app = express();
app.use(express.json());

app.use("/api/users", userRouter);

await connectDB();

const port = process.env.PORT;
app.listen(port, () => 
  console.log(`Server chạy trên cổng ${port}`)
);
