import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllPosts, getPost } from '@/lib/posts';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  // remains async → Next typemapper expects params: Promise<...>
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export default async function LearnPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return notFound();

  return (
    <main className="container mx-auto px-4 py-14">
      <Link href="/learn" className="text-sm underline">
        ← Back to Learn
      </Link>
      <h1 className="font-display text-4xl font-bold mt-2">{post.title}</h1>
      <div className="text-indigo-700 text-sm mt-1">{post.tag}</div>

      <article className="prose max-w-none mt-6">
        <pre className="whitespace-pre-wrap text-slate-800">{post.body}</pre>
      </article>
    </main>
  );
}

