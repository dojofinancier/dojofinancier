import { prisma } from "../lib/prisma";

async function addLaunchDateColumns() {
  try {
    console.log("Adding launch_date columns to courses and cohorts tables...");

    // Add launch_date to courses table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "courses" 
      ADD COLUMN IF NOT EXISTS "launch_date" TIMESTAMP(3);
    `);
    console.log("✅ Added launch_date to courses table");

    // Add launch_date to cohorts table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cohorts" 
      ADD COLUMN IF NOT EXISTS "launch_date" TIMESTAMP(3);
    `);
    console.log("✅ Added launch_date to cohorts table");

    console.log("✅ Migration complete!");
  } catch (error) {
    console.error("❌ Error adding columns:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addLaunchDateColumns();
