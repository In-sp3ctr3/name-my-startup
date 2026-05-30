import { ReportProduct, shouldShowOverlay } from "@/app/product-ui";

type PageProps = {
  params: Promise<{ projectId: string; nameId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { projectId, nameId } = await params;
  const query = await searchParams;

  return <ReportProduct projectId={projectId} nameId={nameId} overlay={shouldShowOverlay(query, "report")} />;
}
