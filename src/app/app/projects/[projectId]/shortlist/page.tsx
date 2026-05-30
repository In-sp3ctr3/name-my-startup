import { ShortlistProduct, shouldShowOverlay } from "@/app/product-ui";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ShortlistPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const query = await searchParams;

  return <ShortlistProduct projectId={projectId} overlay={shouldShowOverlay(query, "shortlist")} />;
}
