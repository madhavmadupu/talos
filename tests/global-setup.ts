import { execSync } from "node:child_process";
import path from "node:path";

import { testDbUrl } from "./test-db";

export default function setup() {
  execSync("npx prisma db push", {
    cwd: path.resolve("."),
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: "pipe",
  });
}