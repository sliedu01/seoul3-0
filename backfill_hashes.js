/**
 * 기존 FileStorage 레코드에 대해 SHA-256 해시값 소급 계산 스크립트
 * 실행: node backfill_hashes.js
 */
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function main() {
  console.log("=== FileStorage SHA-256 해시 소급 계산 시작 ===\n");

  const files = await prisma.fileStorage.findMany({
    where: {
      OR: [{ sha256: null }, { fileSize: null }],
    },
    select: { id: true, fileName: true, data: true },
  });

  console.log(`해시 미등록 파일: ${files.length}건\n`);

  for (const file of files) {
    const buffer = Buffer.from(file.data);
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const fileSize = buffer.length;

    await prisma.fileStorage.update({
      where: { id: file.id },
      data: { sha256, fileSize },
    });

    console.log(`✅ ${file.fileName} — SHA-256: ${sha256.substring(0, 16)}... (${(fileSize / 1024).toFixed(1)}KB)`);
  }

  console.log(`\n=== 완료: ${files.length}건 업데이트됨 ===`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
