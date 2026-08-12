import { NextResponse } from "next/server";
import {
  createBotRoomInDb,
  createRoomInDb,
  fetchRoom,
  findQuickMatchInDb,
  getOpenRoomsCountFromDb,
  joinRoomInDb,
  leaveRoomInDb,
  resetRoomToWaitingInDb,
  setRoomStatusInDb,
} from "@/lib/server/rooms";
import { startGameInDb } from "@/lib/server/game";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const openCount = searchParams.get("openCount");

    if (openCount === "true") {
      const count = await getOpenRoomsCountFromDb();
      return NextResponse.json({ count });
    }

    if (code) {
      const room = await fetchRoom(code);
      return NextResponse.json({ room });
    }

    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as string;

    switch (action) {
      case "create": {
        const room = await createRoomInDb(body.playerId, body.displayName);
        if (!room) return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
        return NextResponse.json({ room });
      }
      case "join": {
        const result = await joinRoomInDb(body.code, body.playerId, body.displayName);
        if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ room: result.room });
      }
      case "quickMatch": {
        const result = await findQuickMatchInDb(body.playerId, body.displayName);
        if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ room: result.room });
      }
      case "botPractice": {
        const room = await createBotRoomInDb(body.playerId, body.displayName, body.totalRounds ?? 13);
        if (!room) return NextResponse.json({ error: "Failed to create bot room" }, { status: 500 });
        await startGameInDb({ ...room, status: "playing" }, body.playerId, body.totalRounds ?? 13);
        return NextResponse.json({ room: { ...room, status: "playing" }, roomCode: room.code });
      }
      case "leave": {
        const room = await leaveRoomInDb(body.code, body.playerId);
        return NextResponse.json({ room });
      }
      case "setStatus": {
        await setRoomStatusInDb(body.code, body.status);
        const room = await fetchRoom(body.code);
        return NextResponse.json({ room });
      }
      case "resetWaiting": {
        const room = await resetRoomToWaitingInDb(body.code);
        return NextResponse.json({ room });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
