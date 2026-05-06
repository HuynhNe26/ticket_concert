import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { connectDB, pool } from "./config/database.js";
import cookieParser from "cookie-parser";
import cron from "node-cron";

dotenv.config();

// Socket
import { initZoneSocket } from "./socket/user/zone.js";
import { EventSocket } from "./socket/admin/event.js";
import { OrderSocket } from "./socket/admin/order.js";

// users
import authRouter from "./router/users/user.js";
import eventsRouter from "./router/users/events.js";
import userLayoutRouter from "./router/users/layout.js";
import zoneRouter from "./router/users/zone.js";
import cartRoutes from "./router/users/cart.js";
import chatRoutes from "./router/users/chat.js";
import categoryRouter from "./router/users/categories.js";
import checkoutRouter from "./router/users/checkout.js";
import voucherRouteruser from "./router/users/voucher.js"
import ticketRouter from "./router/users/ticket.js"
import agentRoutes from "./router/users/agent.js"
import recommendationsRoutes from "./router/users/recommendations.js"
import orderUserRouter  from "./router/users/order.js"
// admins
import adminRouter from "./router/admins/admins.js";
import eventRouter from "./router/admins/events.js";
import userRouter from "./router/admins/user.js";
import adminLayoutRouter from "./router/admins/layout.js";
import categoriesRouter from "./router/admins/categories.js"
import orderRouter from "./router/admins/orders.js"
import voucherRouter from "./router/admins/voucher.js"
import statisticRouter from "./router/admins/statistic.js";
import TicketQRRouter from "./router/admins/TicketQR.js";
const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://ticketconcert.online",
      "https://www.ticketconcert.online",
      "https://ticket-concert-pi.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  })
);
app.use(cookieParser());

app.use("/api/users", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/layout", userLayoutRouter);
app.use("/api/zone", zoneRouter);
app.use("/api/cart", cartRoutes);
app.use("/api/categories", categoryRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/chat", chatRoutes);
app.use("/api/vouchers", voucherRouteruser)
app.use("/api/my-ticket", ticketRouter);
app.use("/api/agent", agentRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/orders", orderUserRouter);

app.use("/api/admin/users", userRouter);
app.use("/api/admin/auth", adminRouter);
app.use("/api/admin/events", eventRouter);
app.use("/api/admin/layout", adminLayoutRouter);
app.use("/api/admin/categories", categoriesRouter);
app.use("/api/admin/orders", orderRouter);
app.use("/api/admin/vouchers", voucherRouter);
app.use("/api/admin/statistic", statisticRouter);
app.use("/api/admin/ticket-qr", TicketQRRouter);

export const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://ticketconcert.online",
      "https://www.ticketconcert.online",
      "https://ticket-concert-pi.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
  },
});

initZoneSocket(io);
EventSocket(io)
OrderSocket(io)
await connectDB();

cron.schedule("* * * * *", async () => {
  console.log("Cron đang chạy:", new Date());
  try {

    await pool.query(`
      UPDATE events
      SET event_status = true
      WHERE event_start <= NOW()
        AND event_end >= NOW()
        AND event_status = false
    `);

    await pool.query(`
      UPDATE vouchers
      SET voucher_status = true
      WHERE voucher_start <= NOW()
        AND voucher_end >= NOW()
        AND voucher_status = false
    `);

    await pool.query(`
      UPDATE vouchers
      SET voucher_status = false
      WHERE voucher_end < NOW()
        AND voucher_status = true
    `);
  } catch (err) {
    console.error("Lỗi cập nhật event_status:", err);
  }
});

const PORT = process.env.PORT ;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
