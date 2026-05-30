type SearchParams = Record<string, string | string[] | undefined>;

export function shouldShowOverlay(params: SearchParams | undefined, key: string) {
  const overlay = Array.isArray(params?.overlay) ? params?.overlay[0] : params?.overlay;
  const ref = Array.isArray(params?.ref) ? params?.ref[0] : params?.ref;
  return overlay === key || (overlay === "true" && ref === key);
}

export {
  AuthProduct,
  CheckoutProduct,
  DashboardProduct,
  DashboardWithUpgrade,
  DescribeProduct,
  GeneratingProduct,
  LaunchPackProduct,
  ReportProduct,
  ReportsProduct,
  ResultsProduct,
  SavedProduct,
  SettingsProduct,
  ShortlistProduct,
  VibeProduct
} from "./product/app-client";
