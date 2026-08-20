import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fetchCmsPageBySlug } from "@/lib/cms-api";
import { DynamicBlockRenderer } from "@/components/sections/DynamicBlockRenderer";

interface DynamicPageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ previewToken?: string }>;
}

export async function generateMetadata({ params }: DynamicPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slugArray = resolvedParams.slug || [];
  const slugPath = `/${slugArray.join("/")}`;
  const page = await fetchCmsPageBySlug(slugPath);

  if (!page) {
    return { title: "Page Not Found | Satyakabir" };
  }

  return {
    title: page.seo?.title || page.title,
    description: page.seo?.description || "Enterprise Software Solutions",
    keywords: page.seo?.keywords || [],
    openGraph: {
      title: page.seo?.title || page.title,
      description: page.seo?.description || "Enterprise Software Solutions",
      images: page.seo?.ogImage ? [{ url: page.seo.ogImage }] : [],
    },
  };
}

export default async function CmsDynamicPage({ params, searchParams }: DynamicPageProps) {
  const resolvedParams = await params;
  const resolvedQuery = await searchParams;
  const slugArray = resolvedParams.slug || [];
  const slugPath = `/${slugArray.join("/")}`;

  const page = await fetchCmsPageBySlug(slugPath, resolvedQuery.previewToken);

  if (!page) {
    notFound();
  }

  // Handle 301 / 302 Redirect Engine
  if (page.redirect && page.toPath) {
    redirect(page.toPath);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Draft Preview Badge */}
      {resolvedQuery.previewToken && (
        <div className="bg-purple-600 text-white text-xs font-bold text-center py-2 px-4 sticky top-0 z-50 shadow-md">
          👀 LIVE DRAFT PREVIEW MODE (Signed HMAC Token)
        </div>
      )}

      {/* Render Dynamic Blocks */}
      <DynamicBlockRenderer blocks={page.blocks || []} />
    </main>
  );
}
