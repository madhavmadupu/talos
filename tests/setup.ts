import { afterEach } from "vitest";

import { testDbUrl } from "./test-db";

process.env.DATABASE_URL = testDbUrl;

import { db } from "../src/lib/db";

afterEach(async () => {
  await db.transaction.deleteMany();
  await db.user.deleteMany();
});