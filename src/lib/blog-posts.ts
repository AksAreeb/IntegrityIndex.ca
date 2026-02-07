/**
 * Blog posts for IntegrityIndex.ca — technical and civic articles.
 * Add new posts here; used by /blog (feed) and /blog/[slug] (article pages).
 */

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  datePublished: string; // ISO 8601
  dateModified?: string;
  author: string;
  /** First post is featured */
  featured?: boolean;
  content: string;
}

export const BLOG_AUTHOR = "The Team";
export const BLOG_PUBLISHER = "Integrity Index";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-we-audit-parliamentary-conflicts",
    title: "How We Audit Parliamentary Conflicts",
    excerpt:
      "The Pulse - Our flagship feature. An automated conflict auditor that helps citizens understand when their representatives may have a financial interest in the legislation they are shaping.",
    datePublished: "2026-02-06T10:00:00Z",
    dateModified: "2026-02-06T10:00:00Z",
    author: BLOG_AUTHOR,
    featured: true,
    content: `
      <p>Introducing, The Pulse - Our flagship feature. An automated conflict auditor that helps citizens understand when their representatives may have a financial interest in the legislation they are shaping.</p>

      <h2>Committee to Sector Scanning</h2>
      <p>Our system maintains a mapping of all Parliamentary Committees to economic sectors. So let's say your MP is part of the Committee of Banking and Fintech, but they also hold disclosed assets in that committee's sector, we flag that as a high risk conflict. </p>
      
      <h2>Data Sources</h2>
      <p>All information is pulled directory from the Parliament's Ethics Commissioner and the Ontario Legislative Assembly. Trade tickers, asset descripts and material change reports are cross referenced against active bills and mandates.</p>

      <h2>Why Does This Matter?</h2>
      <p>Citizens deserve to know when their elected officials' portfolios are overlapping with their public duties. The Pulse is solely for objective data transparency and public information, not as a personal or political critique. IntegrityIndex is, and will continue to remain Non-Partisan.</p>
      `.trim(),
  },
  {
    slug: "a-guide-to-understanding-financial-disclosures",
    title: "A Guide to Understanding Financial Disclosures",
    excerpt:
      "MPs and MPPs must file financial disclosures. This guide explains what they mean, where to find them and how to spot potential conflicts of interest.",
    datePublished: "2026-02-05T14:00:00Z",
    dateModified: "2026-02-05T14:00:00Z",
    author: BLOG_AUTHOR,
    featured: false,
    content: `
      <p>Every elected official in Canada is required to disclose certain financial interests. But what do these disclosures mean? And how can you use them to hold your representatives accountable?</p>

      <h2>What Gets Disclosed</h2>
      <p>Federal MPs and provincial MPPs must report assets, liabilities, outside employment and gifts. Material changes, such as buying or selling stocks, must be reported within specified timeframes. These reports are filed with the Conflict of Interest and Ethics Commissioner (Federal) or the Integrity Commissioner (Ontario).</p>

      <h2>Where to Find Them</h2>
      <p>Parliament publishes a <a href="https://prciec-rpccie.parl.gc.ca/">Public Registry</a> of declarations. We aggregates this data and add context, mapping assets to sectors, comparing holdings across ridings and flagging overlaps with legislative activity.</p>

      <h2>Red Flags to Watch</h2>
      <p>Look for representatives who hold stocks in companies affected by bills they vote on. A member of the Finance Committee holding bank stocks, or an Environment Committee member with oil and gas holdings, may have a conflict. Our Pulse feature automates this check for you.</p>

      <h2>Your Right to Know</h2>
      <p>As a constituent, you have a right to know how these investments align with local issues. Use our <a href="/my-riding">My Riding</a> tool to audit your federal and provincial representatives in one place.</p>
    `.trim(),
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}
