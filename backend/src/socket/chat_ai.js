import { pool } from "../config/database.js";

export const ChatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("chat", (data) => {
      /*
        data = {
          sender: 'user',
          message: 'Xin chào',
          eventId?: 1
        }
      */
      io.emit("user-chat", {
        id: Date.now(),
        type: data.sender,
        content: data.message
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
