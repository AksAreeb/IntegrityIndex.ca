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

export const BLOG_AUTHOR = "Integrity Index Team";
export const BLOG_PUBLISHER = "Integrity Index";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-we-use-ai-to-audit-parliamentary-conflicts",
    title: "How we use AI to Audit Parliamentary Conflicts",
    excerpt:
      "The Pulse—our automated conflict auditor—maps parliamentary committees to economic sectors and flags when MPs hold assets in sectors they legislate on. Here's how it works.",
    datePublished: "2026-02-06T10:00:00Z",
    dateModified: "2026-02-06T10:00:00Z",
    author: BLOG_AUTHOR,
    featured: true,
    content: `
      <p>At IntegrityIndex.ca, transparency isn't just a slogan—it's a system. The Pulse is our flagship feature: an automated conflict auditor that helps citizens understand when their representatives may have a financial interest in the legislation they're shaping.</p>

      <h2>Committee-to-Sector Mapping</h2>
      <p>We maintain a mapping of Canadian Parliamentary Committees to economic sectors. For example, the Standing Committee on Finance oversees Banking and Fintech. The Standing Committee on Natural Resources oversees Oil, Gas, and Mining. When an MP sits on a committee and also holds disclosed assets in that committee's sector, we flag it as a High-Risk Conflict.</p>

      <h2>Data Sources</h2>
      <p>We pull disclosure data directly from Parliament's Ethics Commissioner and the Ontario Legislative Assembly. Trade tickers, asset descriptions, and material change reports are cross-referenced against active bills and committee mandates.</p>

      <h2>Why This Matters</h2>
      <p>Citizens have a right to know when their representatives' private portfolios overlap with their public duties. The Pulse surfaces these overlaps in real time—so you can hold power accountable.</p>
    `.trim(),
  },
  {
    slug: "a-citizens-guide-to-understanding-mp-financial-disclosures",
    title: "A Citizen's Guide to Understanding MP Financial Disclosures",
    excerpt:
      "MPs and MPPs must file financial disclosures. This guide explains what they mean, where to find them, and how to spot potential conflicts of interest.",
    datePublished: "2026-02-05T14:00:00Z",
    dateModified: "2026-02-05T14:00:00Z",
    author: BLOG_AUTHOR,
    featured: false,
    content: `
      <p>Every elected representative in Canada is required to disclose certain financial interests. But what do these disclosures mean—and how can you use them to hold your representatives accountable?</p>

      <h2>What Gets Disclosed</h2>
      <p>Federal MPs and provincial MPPs must report assets, liabilities, outside employment, and gifts. Material changes—such as buying or selling stocks—must be reported within specified timeframes. These reports are filed with the Conflict of Interest and Ethics Commissioner (federal) or the Integrity Commissioner (Ontario).</p>

      <h2>Where to Find Them</h2>
      <p>Parliament publishes a <a href="https://prciec-rpccie.parl.gc.ca/">Public Registry</a> of declarations. IntegrityIndex.ca aggregates this data and adds context: we map assets to sectors, compare holdings across ridings, and flag overlaps with legislative activity.</p>

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
