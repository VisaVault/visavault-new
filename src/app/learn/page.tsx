import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';

export const dynamic = 'force-static';

export default function LearnIndex() {
  const posts = getAllPosts();
  return (
    <main className="container mx-auto px-4 py-14">
      <h1 className="font-display text-4xl font-bold">Learn</h1>
      <p className="text-slate-700 mt-2 max-w-2xl">
        Practical guides to make your preparation faster and clearer.
      </p>
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {posts.map((p) => (
          <Link key={p.slug} href={`/learn/${p.slug}`} className="card p-5 hover:shadow-md transition">
            <div className="text-indigo-700 text-sm">{p.tag}</div>
            <div className="font-semibold mt-1">{p.title}</div>
            <div className="text-slate-700 text-sm mt-2 line-clamp-2">{p.excerpt}</div>
            <div className="mt-3 text-sm underline">Read more</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
