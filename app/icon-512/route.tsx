import { createPwaIcon } from "@/lib/pwa/icon-image";

export const runtime = "edge";

export function GET() {
  return createPwaIcon(512);
}
