import { NextResponse } from "next/server";
import { applyGameAction, loadGameState } from "@/lib/server/game";
import { normalizeGameState } from "@/lib/game/normalize-state";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const state = await loadGameState(code);
    return NextResponse.json({ state: state ? normalizeGameState(state) : null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const playerId = body.playerId as string;
    const action = body.action;

    if (!playerId || !action?.type) {
      return NextResponse.json({ error: "Missing playerId or action" }, { status: 400 });
    }

    const result = await applyGameAction(code, playerId, action);

    if (result === null) {
      return NextResponse.json({ state: null, reset: true });
    }

    return NextResponse.json({ state: normalizeGameState(result) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    const status =
      message === "Not your turn" || message === "Player not in game" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
