import express from "express";
import db from "./database/connection.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  const result = db
    .prepare("SELECT 1 AS connected")
    .get() as { connected: number };

  res.json({
    success: true,
    database: result.connected === 1 ? "connected" : "disconnected"
  });
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});