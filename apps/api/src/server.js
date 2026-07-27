import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function main() {
  await connectDatabase();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Nyasa API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((error) => {
  console.error("Failed to start Nyasa API", error);
  process.exit(1);
});
