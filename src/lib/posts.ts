export type Post = {
  slug: string;
  title: string;
  tag: string;
  excerpt: string;
  body: string; // markdown or plain text
};

export const POSTS: Post[] = [
  {
    slug: 'marriage-green-card-basics',
    title: 'Marriage Green Card: What to Prepare',
    tag: 'Family',
    excerpt: 'A quick overview of required vs recommended evidence for a strong filing.',
    body: `
# Marriage Green Card: What to Prepare

**Required evidence**
- I-130 package with identity docs
- Marriage certificate
- Proof of bona fide marriage (cohabitation, joint finances)

**Recommended evidence**
- Photos with captions & dates
- Statements from friends/family
- Travel itineraries, leases, bills

> Tip: Use Pop's checklist to mark items as complete and add notes next to each file.
`,
  },
  {
    slug: 'h1b-specialty-occupation',
    title: 'H1B: Showing a Specialty Occupation',
    tag: 'Work',
    excerpt: 'What USCIS looks for and how to structure your support letter.',
    body: `
# H1B: Specialty Occupation

- Employer letter: duties mapped to degree field
- SOC code & wage level
- Client letter if third-party placement
- Degree equivalency if foreign degree

**Recommended**
- Org chart
- Detailed project descriptions
`,
  },
];

export function getAllPosts(): Post[] {
  return POSTS;
}

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
