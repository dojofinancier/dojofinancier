import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create course categories
  const categories = [
    {
      name: "Professionnels",
      slug: "professionnels",
      description: "Formations pour les professionnels de la finance",
    },
    {
      name: "Investisseurs",
      slug: "investisseurs",
      description: "Formations pour les investisseurs individuels",
    },
    {
      name: "Entrepreneurs",
      slug: "entrepreneurs",
      description: "Formations pour les entrepreneurs",
    },
  ];

  for (const category of categories) {
    await prisma.courseCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    console.log(`✅ Created/updated category: ${category.name}`);
  }

  console.log("✨ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

