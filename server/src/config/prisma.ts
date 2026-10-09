import { PrismaClient } from "@prisma/client";
import config from "./env";

export const prisma = new PrismaClient({
  datasourceUrl: config.databaseUrl,
  log: ["warn", "error"],
});

export default prisma;
