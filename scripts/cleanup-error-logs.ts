/**
 * Cleanup script for error logs (90-day retention)
 * 
 * This script should be run periodically (e.g., via cron job or scheduled function)
 * to remove error logs older than 90 days.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-error-logs.ts
 * 
 * Or set up as a cron job:
 *   0 2 * * * cd /path/to/project && npx tsx scripts/cleanup-error-logs.ts
 */

import { cleanupOldErrorLogs } from "@/lib/utils/error-logging";

async function main() {
  try {
    console.log("Starting error log cleanup...");
    const deletedCount = await cleanupOldErrorLogs();
    console.log(`✅ Cleanup completed. Deleted ${deletedCount} error log(s) older than 90 days.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

main();

