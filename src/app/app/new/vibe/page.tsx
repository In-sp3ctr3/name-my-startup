import { shouldShowOverlay, VibeProduct } from "@/app/product-ui";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VibePage({ searchParams }: PageProps) {
  const params = await searchParams;

  return <VibeProduct overlay={shouldShowOverlay(params, "vibe")} />;
}
