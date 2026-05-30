import { AuthProduct, shouldShowOverlay } from "@/app/product-ui";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return <AuthProduct mode="signup" overlay={shouldShowOverlay(params, "auth")} />;
}
