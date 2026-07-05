const { Pool } = require("pg");
const pool = new Pool({ connectionString: "postgresql://postgres:PasswordKeramat123@192.168.1.41:5432/yeahtube" });
pool.query("SELECT 1")
  .then(() => { console.log("DB connection successful!"); process.exit(0); })
  .catch((e) => { console.error("DB connection failed:", e); process.exit(1); });
