import { faker } from "@faker-js/faker";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export interface GeneratedUser {
  homeCountry: string;
  typicalMonthlySpend: number;
  accountAgeDays: number;
}

export interface GeneratedTransaction {
  userId: string;
  amount: number;
  currency: string;
  merchantCategory: string;
  merchantLocation: string;
  isCardPresent: boolean;
}

const COUNTRIES = ["India", "United States", "United Kingdom", "Germany", "Japan", "Brazil"];
const CURRENCIES = ["INR", "USD", "GBP", "EUR", "JPY", "BRL"];
const CATEGORIES = [
  "groceries",
  "electronics",
  "restaurants",
  "travel",
  "clothing",
  "subscriptions",
  "fuel",
  "entertainment",
];

export function generateUsers(count: number): GeneratedUser[] {
  return Array.from({ length: count }, () => ({
    homeCountry: faker.helpers.arrayElement(COUNTRIES),
    typicalMonthlySpend: faker.number.float({ min: 200, max: 20_000, fractionDigits: 2 }),
    accountAgeDays: faker.number.int({ min: 1, max: 3_650 }),
  }));
}

export function generateTransactions(
  users: Array<GeneratedUser & { id: string }>,
  perUser = 10,
): GeneratedTransaction[] {
  const transactions: GeneratedTransaction[] = [];
  for (const user of users) {
    for (let i = 0; i < perUser; i++) {
      const isOutlier = faker.number.float({ min: 0, max: 1 }) < 0.12;
      const foreign = isOutlier && faker.datatype.boolean();
      const amount = isOutlier
        ? faker.number.float({
            min: user.typicalMonthlySpend * 3,
            max: user.typicalMonthlySpend * 20,
            fractionDigits: 2,
          })
        : faker.number.float({ min: 5, max: user.typicalMonthlySpend * 0.8, fractionDigits: 2 });
      transactions.push({
        userId: user.id,
        amount,
        currency: faker.helpers.arrayElement(CURRENCIES),
        merchantCategory: faker.helpers.arrayElement(CATEGORIES),
        merchantLocation: foreign
          ? faker.helpers.arrayElement(COUNTRIES.filter((c) => c !== user.homeCountry))
          : user.homeCountry,
        isCardPresent: faker.datatype.boolean(),
      });
    }
  }
  return transactions;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const users = generateUsers(50);
  const transactions = generateTransactions(users.map((u, i) => ({ ...u, id: `synthetic-${i}` })));
  const outPath = new URL("./generated-data.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  writeFileSync(outPath, JSON.stringify({ users, transactions }, null, 2));
  console.log(`Wrote ${users.length} users and ${transactions.length} transactions to ${outPath}`);
}