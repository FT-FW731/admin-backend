import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

prisma.$on("query", (e: { query: any; duration: any }) => {
  console.log(`Query: ${e.query}`);
  console.log(`Duration: ${e.duration} ms`);
});

export default prisma;
