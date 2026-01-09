import app from "./app.js";
import { env } from "./config/env.js";
import { initDatabase } from "./config/db.js";

async function startServer() {
  await initDatabase();

  app.listen(env.PORT, () => {
    console.log(`API running on port ${env.PORT}`);
  });
}

startServer();