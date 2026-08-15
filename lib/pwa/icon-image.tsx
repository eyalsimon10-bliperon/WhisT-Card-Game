import { ImageResponse } from "next/og";

export function createPwaIcon(size: number): ImageResponse {
  const border = Math.max(3, Math.round(size * 0.031));
  const radius = Math.round(size * 0.17);
  const inset = Math.round(size * 0.062);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d2818",
        }}
      >
        <div
          style={{
            width: size - inset * 2,
            height: size - inset * 2,
            borderRadius: radius,
            background: "linear-gradient(180deg, #1a5233 0%, #0d2818 100%)",
            border: `${border}px solid #e8c547`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#f5d76e",
              fontSize: Math.round(size * 0.16),
              fontWeight: 700,
              fontFamily: "Georgia, Times New Roman, serif",
            }}
          >
            W
          </div>
          <div
            style={{
              display: "flex",
              color: "#f5d76e",
              fontSize: Math.round(size * 0.44),
              lineHeight: 1,
              marginTop: -Math.round(size * 0.02),
            }}
          >
            ♠
          </div>
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
