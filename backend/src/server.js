import express from "express";
import { connectDB, pool } from "./database.js";

const app = express();

await connectDB();

app.listen(PORT, () => 
  console.log(`Server chạy trên cổng ${{PORT}}`)
);
