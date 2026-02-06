import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/AppShell";

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function RidingPage({ params }: PageProps) {
  const { name } = await params;
  const decoded = decodeURIComponent(name).trim();
  if (!decoded) {
    redirect("/explore");
  }

  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { riding: { equals: decoded, mode: "insensitive" } },
        { id: decoded.toLowerCase().replace(/\s+/g, "-") },
      ],
      jurisdiction: "FEDERAL",
    },
    select: { id: true },
  });

  if (member) {
    redirect(`/member/${member.id}`);
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Riding: {decoded}
        </h1>
        <p className="text-[#64748B] font-sans">
          No representative found for this riding in our database. Try the{" "}
          <a href="/explore" className="text-[#0F172A] underline">
            map
          </a>{" "}
          or{" "}
          <a href="/mps" className="text-[#0F172A] underline">
            representatives list
          </a>
          .
        </p>
      </div>
    </AppShell>
  );
}
