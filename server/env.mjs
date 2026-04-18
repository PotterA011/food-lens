import { existsSync } from "node:fs";

const envFile = ".env";

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
