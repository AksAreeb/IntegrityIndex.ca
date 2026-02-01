/**
 * Mock data layer for IntegrityIndex.ca
 * Realistic names and bill references for layout testing
 */

export type Jurisdiction = "FEDERAL" | "PROVINCIAL";

export interface MemberProfile {
  id: string;
  name: string;
  riding: string;
  jurisdiction: Jurisdiction;
  party: string;
  executiveSummary: {
    attendancePercent: number;
    integrityScore: number;
  };
  assets: Asset[];
  legislativeHistory: VoteRecord[];
  industryDistribution: IndustryShare[];
  preOfficeAssets: Asset[];
}

export interface Asset {
  id: string;
  type: "Stocks" | "Real Estate" | "Trusts" | "Other";
  description: string;
  industryTags: string[];
  estimatedValue?: string;
  disclosureDate: string;
}

export interface VoteRecord {
  id: string;
  billId: string;
  billTitle: string;
  vote: "Yea" | "Nay" | "Abstained";
  date: string;
  outcome: string;
}

export interface IndustryShare {
  sector: string;
  percentage: number;
  value: number;
}

export interface LobbyistMeeting {
  industry: string;
  meetingCount: number;
}

export interface BillSummary {
  billId: string;
  title: string;
  plainLanguage: string;
  publicInterestPoints: string[];
  corporateInterestPoints: string[];
}

const FEDERAL_BILLS: { id: string; title: string }[] = [
  { id: "C-11", title: "Online Streaming Act" },
  { id: "C-18", title: "Online News Act" },
  { id: "C-21", title: "An Act to amend certain Acts and to make certain consequential amendments" },
  { id: "C-27", title: "Digital Charter Implementation Act" },
  { id: "S-5", title: "Strengthening Environmental Protection for a Healthier Canada Act" },
];

const ONTARIO_BILLS: { id: string; title: string }[] = [
  { id: "Bill 23", title: "More Homes Built Faster Act" },
  { id: "Bill 124", title: "Protecting a Sustainable Public Sector for Future Generations Act" },
  { id: "Bill 148", title: "Fair Workplaces, Better Jobs Act" },
  { id: "Bill 97", title: "Helping Homebuyers, Protecting Tenants Act" },
];

const INDUSTRY_TAGS = [
  "#Telecommunications",
  "#Energy",
  "#Banking",
  "#RealEstate",
  "#Pharmaceuticals",
  "#Mining",
  "#Transportation",
  "#Technology",
  "#Agriculture",
  "#Insurance",
];

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function generateAssets(count: number, prefix: string): Asset[] {
  const types: Asset["type"][] = ["Stocks", "Real Estate", "Trusts", "Other"];
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-asset-${i}`,
    type: types[i % types.length],
    description:
      i % 4 === 0
        ? "Equity holdings in registered retirement account"
        : i % 4 === 1
          ? "Residential property, primary residence"
          : i % 4 === 2
            ? "Family trust (blind trust)"
            : "Mutual fund units",
    industryTags: pick(INDUSTRY_TAGS, 1 + (i % 3)),
    estimatedValue: i % 3 === 0 ? "$50,000 - $100,000" : undefined,
    disclosureDate: "2024-01-15",
  }));
}

function generateVotes(ridingId: string, jurisdiction: Jurisdiction): VoteRecord[] {
  const bills =
    jurisdiction === "FEDERAL" ? FEDERAL_BILLS : ONTARIO_BILLS;
  return bills.slice(0, 5).map((b, i) => ({
    id: `${ridingId}-vote-${i}`,
    billId: b.id,
    billTitle: b.title,
    vote: (["Yea", "Nay", "Abstained"] as const)[i % 3],
    date: `2024-${String(10 - i).padStart(2, "0")}-15`,
    outcome: i % 2 === 0 ? "Passed" : "Defeated",
  }));
}

function generateIndustryDistribution(): IndustryShare[] {
  const sectors = [
    "Telecommunications",
    "Energy",
    "Financial Services",
    "Real Estate",
    "Technology",
    "Healthcare",
    "Transportation",
    "Mining",
  ];
  const values = [12, 18, 22, 15, 8, 10, 7, 8];
  const total = values.reduce((a, b) => a + b, 0);
  return sectors.map((sector, i) => ({
    sector,
    percentage: Math.round((values[i] / total) * 100),
    value: values[i] * 10000,
  }));
}

const MOCK_NAMES = [
  "Jennifer McCullough",
  "David Chen",
  "Marie-Claire Bouchard",
  "Robert Thompson",
  "Amanda Foster",
  "Michael Okonkwo",
  "Sarah Kim",
  "James Wilson",
];

export function getMemberProfile(ridingId: string): MemberProfile {
  const id = ridingId.toLowerCase().replace(/\s+/g, "-");
  const nameIndex = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const name = MOCK_NAMES[nameIndex % MOCK_NAMES.length];
  const jurisdiction: Jurisdiction = id === "ontario" ? "PROVINCIAL" : "FEDERAL";

  return {
    id,
    name,
    riding: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    jurisdiction,
    party: jurisdiction === "FEDERAL" ? "Liberal" : "Progressive Conservative",
    executiveSummary: {
      attendancePercent: 87 + (nameIndex % 12),
      integrityScore: 62 + (nameIndex % 35),
    },
    assets: generateAssets(6, id),
    legislativeHistory: generateVotes(id, jurisdiction),
    industryDistribution: generateIndustryDistribution(),
    preOfficeAssets: generateAssets(4, `${id}-pre`),
  };
}

export const LOBBYIST_HEATMAP_DATA: LobbyistMeeting[] = [
  { industry: "Oil & Gas", meetingCount: 47 },
  { industry: "Pharmaceuticals", meetingCount: 42 },
  { industry: "Telecommunications", meetingCount: 38 },
  { industry: "Banking & Finance", meetingCount: 35 },
  { industry: "Real Estate", meetingCount: 31 },
  { industry: "Technology", meetingCount: 28 },
  { industry: "Mining", meetingCount: 24 },
  { industry: "Transportation", meetingCount: 21 },
  { industry: "Agriculture", meetingCount: 18 },
  { industry: "Retail", meetingCount: 15 },
];

export const BILL_SUMMARIES: BillSummary[] = [
  {
    billId: "C-11",
    title: "Online Streaming Act",
    plainLanguage:
      "This bill updates Canada's broadcasting rules to include streaming services like Netflix and Disney+ under federal regulation, requiring them to contribute to Canadian content.",
    publicInterestPoints: [
      "Increases funding for Canadian film, television, and music",
      "Requires streaming platforms to showcase Canadian content",
      "Supports Indigenous and minority-language programming",
    ],
    corporateInterestPoints: [
      "Adds compliance costs for international streaming platforms",
      "May affect algorithmic recommendations and user experience",
      "Creates regulatory uncertainty for digital-first companies",
    ],
  },
  {
    billId: "Bill 23",
    title: "More Homes Built Faster Act",
    plainLanguage:
      "Ontario legislation aimed at accelerating housing development by reducing development charges, limiting municipal review powers, and changing conservation authority roles.",
    publicInterestPoints: [
      "Intended to increase housing supply and affordability",
      "Streamlines approval processes for new construction",
      "Exempts some affordable housing from development fees",
    ],
    corporateInterestPoints: [
      "Reduces municipal revenue from development charges",
      "Benefits large developers with expedited approvals",
      "Limits public input on land-use decisions",
    ],
  },
];

export function getBillSummary(billId: string): BillSummary | undefined {
  return BILL_SUMMARIES.find(
    (b) => b.billId.toLowerCase() === billId.toLowerCase()
  );
}
