import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "@/data/articles";
import { ArticlePage } from "@/components/pages/ArticlePage";
import { buildPageMetadata } from "@/data/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return buildPageMetadata({
    title: `${article.title} — Satyakabir Insights`,
    description: article.summary,
    path: `/insights/blog/${slug}`,
  });
}

export default async function InsightsBlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    notFound();
  }

  return <ArticlePage article={article} />;
}
