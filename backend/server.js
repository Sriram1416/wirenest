import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./authRoutes.js";
import adminRoutes from "./adminRoutes.js";
import cartRoutes from "./cartRoutes.js";
import orderRoutes from "./orderRoutes.js";
import wishlistRoutes from "./wishlistRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/wishlist", wishlistRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "WireNest Backend is Live!" });
});

// Keep-alive ping endpoint (called by frontend & self-pinger)
app.get("/ping", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);

  // Self-ping every 14 minutes to prevent Render free-tier spin-down (15 min timeout)
  const SELF_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
  setInterval(async () => {
    try {
      const res = await fetch(`${SELF_URL}/ping`);
      console.log(`🏓 Keep-alive ping: ${res.status}`);
    } catch (e) {
      console.warn('Keep-alive ping failed:', e.message);
    }
  }, 14 * 60 * 1000); // every 14 minutes
});
