import mongoose from "mongoose";

export async function connectDB() {
  if (!process.env.MONGODB_URI) throw new Error("Lỗi đường dẫn kết nối Mongo");
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Kết nối thành công với Mongo Atlas!");
}
