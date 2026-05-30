import { Suspense } from "react";
import { GeneratingProduct, shouldShowOverlay } from "@/app/product-ui";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GeneratingPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <GeneratingProduct overlay={shouldShowOverlay(params, "generating")} />
    </Suspense>
  );
}
