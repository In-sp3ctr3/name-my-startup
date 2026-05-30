import { Suspense } from "react";
import { ReportsProduct } from "@/app/product-ui";

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsProduct />
    </Suspense>
  );
}
