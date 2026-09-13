require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const authRoutes = require("./src/routes/auth");
const whatsappRoutes = require("./src/routes/whatsapp");
const { initSocket } = require("./src/socket/index");

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",");

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// --- REST routes ---
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/wa", whatsappRoutes);

// --- 404 + error handling ---
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Something went wrong on our end." });
});

// --- Socket.io ---
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});
app.set("io", io);
initSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`WhatsApp-clone backend listening on port ${PORT}`);
});
