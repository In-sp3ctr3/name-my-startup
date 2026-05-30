import { AuthProduct, shouldShowOverlay } from "@/app/product-ui";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return <AuthProduct mode="login" overlay={shouldShowOverlay(params, "auth")} />;
}
