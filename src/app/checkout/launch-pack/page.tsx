import { Suspense } from "react";
import { CheckoutProduct, shouldShowOverlay } from "@/app/product-ui";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const success = params?.success === "1" || params?.success === "true";

  return (
    <Suspense fallback={null}>
      <CheckoutProduct overlay={shouldShowOverlay(params, "checkout")} success={success} />
    </Suspense>
  );
}
