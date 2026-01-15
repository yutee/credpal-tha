const express = require("express");
const { loadSecrets } = require("./config/secrets");
const { initDb, isDbConnected } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

let appReady = false;

app.use(express.json());

app.get("/health", (req, res) => {
  if (!appReady || !isDbConnected()) {
    return res.status(503).json({
      status: "unhealthy",
      dbConnected: false
    });
  }

  res.status(200).json({
    status: "healthy",
    dbConnected: true
  });
});

app.get("/status", (req, res) => {
  res.json({
    uptime: process.uptime(),
    ready: appReady,
    timestamp: new Date().toISOString()
  });
});

app.post("/process", async (req, res) => {
  res.status(202).json({ message: "Processing accepted" });
});

async function start() {
  try {
    const secrets = await loadSecrets();
    await initDb(secrets.db);

    appReady = true;

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();