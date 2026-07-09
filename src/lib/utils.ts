export function getBaseUrl(): string {
  if (process.env["VERCEL_PROJECT_PRODUCTION_URL"]) {
    return `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`;
  }
  if (process.env["NEXT_PUBLIC_BASE_URL"]) {
    return process.env["NEXT_PUBLIC_BASE_URL"];
  }
  return "http://localhost:3000";
}
