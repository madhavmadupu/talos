import { db } from "../src/lib/db";
import { generateUsers, generateTransactions } from "../scripts/generate-data";

const ENDPOINT = process.env.TALOS_ENDPOINT ?? "http://localhost:3000/api/transactions/process";
const USERS = 50;
const TXNS_PER_USER = 10;

async function main() {
  const users = generateUsers(USERS);
  const created: Array<{ id: string } & (typeof users)[number]> = [];
  for (const user of users) {
    created.push(await db.user.create({ data: user }));
  }
  console.log(`Seeded ${created.length} users.`);

  const transactions = generateTransactions(created, TXNS_PER_USER);
  let processed = 0;
  let failed = 0;
  for (const tx of transactions) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tx),
      });
      processed += res.ok ? 1 : 0;
      failed += res.ok ? 0 : 1;
      if (!res.ok) {
        console.warn(`  ${res.status} for user ${tx.userId}: ${(await res.text()).slice(0, 120)}`);
      }
    } catch (error) {
      failed++;
      console.error(`  network error for user ${tx.userId}:`, error instanceof Error ? error.message : error);
    }
    if ((processed + failed) % 100 === 0) {
      console.log(`  progress: ${processed} processed, ${failed} failed`);
    }
  }

  console.log(`Seed complete: ${processed}/${transactions.length} transactions routed through ${ENDPOINT}.`);
  console.log("NOTE: Start the dev server (npm run dev) before seeding so the endpoint is live.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });