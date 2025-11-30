import mongoose from "mongoose";

export async function database() {
  const uri = process.env.MONGODB_URI;

  if (!uri) throw new Error("Lỗi đường dẫn kết nối Mongo");

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("Kết nối thành công với Mongo Atlas!");
}
