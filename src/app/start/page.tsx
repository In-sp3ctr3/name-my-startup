import { Suspense } from "react";
import { DescribeProduct, shouldShowOverlay } from "@/app/product-ui";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StartPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <DescribeProduct overlay={shouldShowOverlay(params, "describe")} />
    </Suspense>
  );
}
