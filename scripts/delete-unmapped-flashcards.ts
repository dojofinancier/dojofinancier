/**
 * Script to delete flashcards that are not mapped to modules
 * This is useful when flashcards were uploaded before modules were created
 * 
 * Usage: tsx scripts/delete-unmapped-flashcards.ts [courseCode]
 * Example: tsx scripts/delete-unmapped-flashcards.ts NEGP
 */

import { prisma } from "../lib/prisma";

async function deleteUnmappedFlashcards(courseCode?: string) {
  try {
    console.log("Finding unmapped flashcards...\n");

    // Find the course
    let course;
    if (courseCode) {
      // Try to find by code first
      course = await prisma.course.findUnique({
        where: { code: courseCode },
      });
      
      // If not found by code, try to find by title (case-insensitive partial match)
      if (!course) {
        const courses = await prisma.course.findMany({
          where: {
            title: {
              contains: courseCode,
              mode: "insensitive",
            },
          },
        });
        
        if (courses.length === 0) {
          console.error(`❌ No course found with code or title containing: ${courseCode}`);
          return;
        }
        
        if (courses.length > 1) {
          console.log(`⚠️  Found ${courses.length} courses matching "${courseCode}":`);
          courses.forEach((c) => {
            console.log(`   - ${c.code || "N/A"}: ${c.title}`);
          });
          console.error("\n❌ Please specify the exact course code to avoid ambiguity.");
          return;
        }
        
        course = courses[0];
      }
    } else {
      // If no course code provided, show all courses with unmapped flashcards
      console.log("No course specified. Finding all courses with unmapped flashcards...\n");
      
      const coursesWithUnmapped = await prisma.course.findMany({
        where: {
          flashcards: {
            some: {
              moduleId: null,
            },
          },
        },
        include: {
          _count: {
            select: {
              flashcards: {
                where: {
                  moduleId: null,
                },
              },
            },
          },
        },
        orderBy: {
          code: "asc",
        },
      });

      if (coursesWithUnmapped.length === 0) {
        console.log("✅ No courses found with unmapped flashcards.");
        return;
      }

      console.log("Courses with unmapped flashcards:\n");
      coursesWithUnmapped.forEach((c) => {
        console.log(`   ${c.code || "N/A"}: ${c.title} - ${c._count.flashcards} unmapped flashcards`);
      });
      console.log("\n💡 Please specify a course code to delete unmapped flashcards for that course.");
      console.log("   Example: tsx scripts/delete-unmapped-flashcards.ts NEGP");
      return;
    }

    if (!course) {
      console.error(`❌ Course not found: ${courseCode}`);
      return;
    }

    console.log(`📚 Course: ${course.code || "N/A"} - ${course.title}\n`);

    // Count unmapped flashcards
    const unmappedCount = await prisma.flashcard.count({
      where: {
        courseId: course.id,
        moduleId: null,
      },
    });

    if (unmappedCount === 0) {
      console.log("✅ No unmapped flashcards found for this course.");
      return;
    }

    console.log(`📊 Found ${unmappedCount} unmapped flashcards\n`);

    // Show a sample of flashcards (first 5)
    const sampleFlashcards = await prisma.flashcard.findMany({
      where: {
        courseId: course.id,
        moduleId: null,
      },
      take: 5,
      select: {
        id: true,
        front: true,
        back: true,
        createdAt: true,
      },
    });

    console.log("Sample of flashcards to be deleted (first 5):");
    sampleFlashcards.forEach((card, index) => {
      const frontPreview = card.front.substring(0, 50) + (card.front.length > 50 ? "..." : "");
      console.log(`   ${index + 1}. ${frontPreview}`);
    });
    if (unmappedCount > 5) {
      console.log(`   ... and ${unmappedCount - 5} more\n`);
    } else {
      console.log();
    }

    // Also check if there are any study sessions or smart review items linked to these flashcards
    const flashcardIds = await prisma.flashcard.findMany({
      where: {
        courseId: course.id,
        moduleId: null,
      },
      select: {
        id: true,
      },
    });

    const ids = flashcardIds.map((f) => f.id);

    const studySessionsCount = await prisma.flashcardStudySession.count({
      where: {
        flashcardId: {
          in: ids,
        },
      },
    });

    const smartReviewItemsCount = await prisma.smartReviewItem.count({
      where: {
        flashcardId: {
          in: ids,
        },
      },
    });

    if (studySessionsCount > 0 || smartReviewItemsCount > 0) {
      console.log("⚠️  WARNING: These flashcards have related data:");
      if (studySessionsCount > 0) {
        console.log(`   - ${studySessionsCount} study session(s) will be deleted (cascade)`);
      }
      if (smartReviewItemsCount > 0) {
        console.log(`   - ${smartReviewItemsCount} smart review item(s) will be deleted (cascade)`);
      }
      console.log();
    }

    // Delete the flashcards
    console.log("🗑️  Deleting unmapped flashcards...\n");

    const result = await prisma.flashcard.deleteMany({
      where: {
        courseId: course.id,
        moduleId: null,
      },
    });

    console.log(`✅ Successfully deleted ${result.count} unmapped flashcards`);
    console.log("✨ Cleanup completed!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get course code from command line arguments
const courseCode = process.argv[2];

// Run the cleanup
deleteUnmappedFlashcards(courseCode)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  });



