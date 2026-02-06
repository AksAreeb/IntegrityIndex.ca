/**
 * One-time script: Remove Member and TradeTicker records for individuals
 * no longer in office in 2026 (Justin Trudeau, Jagmeet Singh).
 * Run: npx tsx scripts/clean-outdated-members.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const NAMES_TO_REMOVE = ["Justin Trudeau", "Jagmeet Singh"];

async function main() {
  for (const name of NAMES_TO_REMOVE) {
    const members = await prisma.member.findMany({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    for (const m of members) {
      const deletedTickers = await prisma.tradeTicker.deleteMany({ where: { memberId: m.id } });
      await prisma.member.delete({ where: { id: m.id } });
      console.log(`Removed member "${m.name}" (${m.id}) and ${deletedTickers.count} TradeTicker record(s).`);
    }
    if (members.length === 0) {
      console.log(`No member found matching "${name}".`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
