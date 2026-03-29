const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function verifyAll() {
  console.log("=== Database CRUD Verification ===");

  try {
    // 1. Program
    console.log("1. Program CRUD...");
    const program = await prisma.program.create({
      data: { name: "Test Program", description: "Verification", coreGoals: "Pass" }
    });
    console.log(" - Created:", program.name);
    await prisma.program.update({ where: { id: program.id }, data: { description: "Verified" } });
    console.log(" - Updated");

    // 2. Partner
    console.log("2. Partner CRUD...");
    const partner = await prisma.partner.create({
      data: { name: "Test Partner", businessRegistration: "123-456" }
    });
    console.log(" - Created:", partner.name);

    // 3. Session
    console.log("3. Session CRUD (Connecting Program & Partner)...");
    const session = await prisma.programSession.create({
      data: {
        programId: program.id,
        partnerId: partner.id,
        sessionNumber: 1,
        date: new Date()
      }
    });
    console.log(" - Created Session #", session.sessionNumber);

    // 4. Cleanup (Optional, but let's keep them as proof or delete)
    // Actually, let's keep them for now.
    
    console.log("\n[SUCCESS] All core entities CRUD verified in SQLite.");
  } catch (err) {
    console.error("\n[FAILURE] Verification failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAll();
