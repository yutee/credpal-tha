const { Pool } = require("pg");

let pool;
let connected = false;

async function initDb(dbConfig) {
  pool = new Pool(dbConfig);

  // retry loop – simple and effective
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await pool.query("SELECT 1");
      connected = true;
      console.log("Connected to PostgreSQL");
      break;
    } catch (err) {
      console.error(`DB connection failed (attempt ${attempt})`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (!connected) {
    throw new Error("Could not connect to PostgreSQL");
  }
}

function isDbConnected() {
  return connected;
}

function getPool() {
  return pool;
}

module.exports = {
  initDb,
  isDbConnected,
  getPool
};