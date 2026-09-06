import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

/**
 * Upload direto do navegador pro Blob (client upload, mesmo padrão do elyx-007) — usado pra
 * anexar foto do rótulo/laudo a uma versão proposta, e pra material de base da marca (logo,
 * guideline, fontes, prints de referência).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: [
          "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
          "application/pdf",
          "video/mp4", "video/quicktime", "video/webm",
          "font/ttf", "font/otf", "font/woff", "font/woff2", "application/font-woff", "application/x-font-ttf", "application/octet-stream",
        ],
        maximumSizeInBytes: 200 * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ userId: session.user.id, pathname }),
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
