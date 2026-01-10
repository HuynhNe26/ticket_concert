import { pool } from "../config/database.js";

export const EventSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("User connected")
        socket.on("event_hot", eventId => {
            console.log(eventId)
        })
    }),

    socket.on("leave_event", eventId => {
        socket.leave("User leave")
    }),

    socket.on("disconnect", () => {
        console.log("User disconnected")
    })
}