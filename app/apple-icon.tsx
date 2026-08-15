import { createPwaIcon } from "@/lib/pwa/icon-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return createPwaIcon(180);
}
