import path from "node:path";

export const testDbUrl = `file:${path.resolve("test.db").replace(/\\/g, "/")}`;