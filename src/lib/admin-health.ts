import { prisma } from "@/lib/prisma";

const OPEN_NORTH_URL = "https://represent.opennorth.ca/postcodes/K1A0B1/";
const FINNHUB_URL = "https://finnhub.io/api/v1/quote";
const LEGISINFO_URL = "https://www.parl.ca/legisinfo/en/overview/xml";

export interface HealthStatus {
  openNorth: boolean;
  finnhub: boolean;
  legisinfo: boolean;
  lastSuccessfulSync: string | null;
}

async function ping(
  url: string,
  options?: RequestInit
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
        ...(options?.headers as Record<string, string>),
      },
    });
    return res.ok;
  } catch (e) {
    console.error("[admin-health]: check failed", e);
    return false;
  }
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const token = process.env.FINNHUB_API_KEY ?? "";
  const finnhubUrl = `${FINNHUB_URL}?symbol=AAPL&token=${encodeURIComponent(token)}`;

  const [openNorth, finnhub, legisinfo, status] = await Promise.all([
    ping(OPEN_NORTH_URL, { method: "GET" }),
    token ? ping(finnhubUrl, { method: "GET" }) : Promise.resolve(false),
    ping(LEGISINFO_URL, {
      method: "GET",
      headers: { Accept: "application/xml, text/xml" },
    }),
    prisma.appStatus.findUnique({
      where: { id: 1 },
      select: { lastSuccessfulSyncAt: true },
    }),
  ]);

  return {
    openNorth,
    finnhub,
    legisinfo,
    lastSuccessfulSync: status?.lastSuccessfulSyncAt
      ? status.lastSuccessfulSyncAt.toISOString()
      : null,
  };
}

export async function setLastSuccessfulSync(): Promise<void> {
  await prisma.appStatus.upsert({
    where: { id: 1 },
    create: { id: 1, lastSuccessfulSyncAt: new Date() },
    update: { lastSuccessfulSyncAt: new Date() },
  });
}
