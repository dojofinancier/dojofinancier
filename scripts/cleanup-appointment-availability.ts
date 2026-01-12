/**
 * Cleanup script to remove all existing AppointmentAvailability records
 * Run this after migrating to the new availability rules system
 */

import { prisma } from "../lib/prisma";

async function cleanupAppointmentAvailability() {
  try {
    console.log("Starting cleanup of AppointmentAvailability records...");

    // Count existing records
    const count = await prisma.appointmentAvailability.count();
    console.log(`Found ${count} AppointmentAvailability records to delete`);

    if (count === 0) {
      console.log("No records to delete. Exiting.");
      return;
    }

    // Delete all records
    const result = await prisma.appointmentAvailability.deleteMany({});

    console.log(`Successfully deleted ${result.count} AppointmentAvailability records`);
    console.log("Cleanup completed!");
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupAppointmentAvailability()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  });




