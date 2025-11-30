import "dotenv/config";
import express from "express";
import { database } from "./config/database.js";
import cors from "cors";

const PORT = process.env.PORT

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

database()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server đang chạy trên cổng ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to database:", error);
    process.exit(1); 
  });