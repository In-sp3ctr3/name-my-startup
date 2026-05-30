import { DashboardProduct, DashboardWithUpgrade, shouldShowOverlay } from "@/app/product-ui";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AppPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const upgrade = params?.upgrade === "1" || params?.upgrade === "true";

  if (upgrade) {
    return <DashboardWithUpgrade overlay={shouldShowOverlay(params, "upgrade")} />;
  }

  return <DashboardProduct overlay={shouldShowOverlay(params, "dashboard")} />;
}
