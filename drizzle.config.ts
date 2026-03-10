import { defineConfig } from "drizzle-kit";

const defaultLocal = process.env.DATABASE_URL || "mysql://attendance:attendance123@localhost:3306/attendance";

if (!process.env.DATABASE_URL) {
  console.warn(`drizzle: DATABASE_URL not set, using default local: ${defaultLocal}`);
}

const dialect = defaultLocal.startsWith("mysql://") || defaultLocal.startsWith("mariadb://")
  ? "mysql"
  : "postgresql";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect,
  dbCredentials: {
    url: defaultLocal,
  },
});
