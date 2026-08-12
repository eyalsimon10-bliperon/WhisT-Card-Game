import { createServiceRoleClient } from "@/lib/supabase/server";
import { createBotPlayers } from "@/lib/game/engine";
import type { Player, Room } from "@/lib/types";
import { MAX_PLAYERS, ROOM_CODE_LENGTH } from "@/lib/types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface RoomRow {
  code: string;
  host_id: string;
  status: Room["status"];
  max_players: number;
  is_bot_room: boolean;
  total_rounds: number;
  created_at: string;
}

interface RoomPlayerRow {
  room_code: string;
  player_id: string;
  name: string;
  is_host: boolean;
  joined_at: string;
}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function mapRoom(row: RoomRow, players: RoomPlayerRow[]): Room {
  return {
    code: row.code,
    hostId: row.host_id,
    status: row.status,
    maxPlayers: row.max_players,
    isBotRoom: row.is_bot_room,
    totalRounds: row.total_rounds,
    createdAt: new Date(row.created_at).getTime(),
    players: players
      .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
      .map(
        (p): Player => ({
          id: p.player_id,
          name: p.name,
          isHost: p.is_host,
          joinedAt: new Date(p.joined_at).getTime(),
        })
      ),
  };
}

export async function fetchRoom(code: string): Promise<Room | null> {
  const supabase = createServiceRoleClient();
  const normalized = code.toUpperCase();

  const { data: roomRow, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !roomRow) return null;

  const { data: players, error: playersError } = await supabase
    .from("room_players")
    .select("*")
    .eq("room_code", normalized);

  if (playersError) return null;

  return mapRoom(roomRow as RoomRow, (players ?? []) as RoomPlayerRow[]);
}

async function insertRoom(room: RoomRow, players: Omit<RoomPlayerRow, "room_code">[]): Promise<Room | null> {
  const supabase = createServiceRoleClient();

  const { error: roomError } = await supabase.from("rooms").insert(room);
  if (roomError) return null;

  const playerRows: RoomPlayerRow[] = players.map((p) => ({
    ...p,
    room_code: room.code,
  }));

  const { error: playersError } = await supabase.from("room_players").insert(playerRows);
  if (playersError) {
    await supabase.from("rooms").delete().eq("code", room.code);
    return null;
  }

  return fetchRoom(room.code);
}

async function generateUniqueCode(): Promise<string> {
  const supabase = createServiceRoleClient();
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateRoomCode();
    const { data } = await supabase.from("rooms").select("code").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Failed to generate room code");
}

export async function createRoomInDb(hostId: string, hostName: string): Promise<Room | null> {
  const code = await generateUniqueCode();
  const now = new Date().toISOString();

  return insertRoom(
    {
      code,
      host_id: hostId,
      status: "waiting",
      max_players: MAX_PLAYERS,
      is_bot_room: false,
      total_rounds: 13,
      created_at: now,
    },
    [
      {
        player_id: hostId,
        name: hostName,
        is_host: true,
        joined_at: now,
      },
    ]
  );
}

export async function createBotRoomInDb(
  hostId: string,
  hostName: string,
  totalRounds: number
): Promise<Room | null> {
  const code = await generateUniqueCode();
  const now = new Date().toISOString();
  const bots = createBotPlayers(3);

  const players = [
    { player_id: hostId, name: hostName, is_host: true, joined_at: now },
    ...bots.map((bot, i) => ({
      player_id: bot.id,
      name: bot.name,
      is_host: false,
      joined_at: new Date(Date.now() + i + 1).toISOString(),
    })),
  ];

  return insertRoom(
    {
      code,
      host_id: hostId,
      status: "waiting",
      max_players: MAX_PLAYERS,
      is_bot_room: true,
      total_rounds: totalRounds,
      created_at: now,
    },
    players
  );
}

export async function joinRoomInDb(
  code: string,
  playerId: string,
  displayName: string
): Promise<{ room: Room } | { error: string }> {
  const room = await fetchRoom(code);
  if (!room) {
    return { error: "חדר לא נמצא. בדוק את הקוד ונסה שוב." };
  }

  const alreadyInRoom = room.players.some((p) => p.id === playerId);
  if (alreadyInRoom) {
    const supabase = createServiceRoleClient();
    const player = room.players.find((p) => p.id === playerId);
    if (player && player.name !== displayName) {
      await supabase
        .from("room_players")
        .update({ name: displayName })
        .eq("room_code", code.toUpperCase())
        .eq("player_id", playerId);
    }
    const updated = await fetchRoom(code);
    return updated ? { room: updated } : { error: "שגיאה בעדכון החדר." };
  }

  if (room.status !== "waiting") {
    return { error: "המשחק בחדר זה כבר התחיל." };
  }

  if (room.players.length >= room.maxPlayers) {
    return { error: "החדר מלא (4/4)." };
  }

  const nameTaken = room.players.some((p) => p.name.toLowerCase() === displayName.toLowerCase());
  if (nameTaken) {
    return { error: "שם זה כבר תפוס בחדר." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("room_players").insert({
    room_code: code.toUpperCase(),
    player_id: playerId,
    name: displayName,
    is_host: false,
    joined_at: new Date().toISOString(),
  });

  if (error) {
    return { error: "שגיאה בהצטרפות לחדר." };
  }

  // Touch rooms so host realtime (PK-filtered) also fires — not only room_players
  await supabase
    .from("rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("code", code.toUpperCase());

  const updated = await fetchRoom(code);
  return updated ? { room: updated } : { error: "שגיאה בטעינת החדר." };
}

export async function findQuickMatchInDb(
  playerId: string,
  displayName: string
): Promise<{ room: Room } | { error: string }> {
  const supabase = createServiceRoleClient();
  const { data: openRooms } = await supabase
    .from("rooms")
    .select("code")
    .eq("status", "waiting")
    .eq("is_bot_room", false)
    .order("created_at", { ascending: true });

  if (!openRooms?.length) {
    return { error: "אין חדרים פנויים כרגע. נסה ליצור חדר חדש." };
  }

  for (const row of openRooms) {
    const full = await fetchRoom(row.code);
    if (full && full.players.length < full.maxPlayers) {
      return joinRoomInDb(full.code, playerId, displayName);
    }
  }

  return { error: "אין חדרים פנויים כרגע. נסה ליצור חדר חדש." };
}

export async function leaveRoomInDb(code: string, playerId: string): Promise<Room | null> {
  const supabase = createServiceRoleClient();
  const normalized = code.toUpperCase();
  const room = await fetchRoom(normalized);
  if (!room) return null;

  await supabase
    .from("room_players")
    .delete()
    .eq("room_code", normalized)
    .eq("player_id", playerId);

  const remaining = room.players.filter((p) => p.id !== playerId);
  if (remaining.length === 0) {
    await supabase.from("game_states").delete().eq("room_code", normalized);
    await supabase.from("rooms").delete().eq("code", normalized);
    return null;
  }

  if (room.hostId === playerId) {
    const newHost = remaining[0];
    await supabase.from("rooms").update({ host_id: newHost.id }).eq("code", normalized);
    await supabase
      .from("room_players")
      .update({ is_host: false })
      .eq("room_code", normalized);
    await supabase
      .from("room_players")
      .update({ is_host: true })
      .eq("room_code", normalized)
      .eq("player_id", newHost.id);
  } else {
    // Touch rooms so other clients' rooms subscription refreshes the player list
    await supabase
      .from("rooms")
      .update({ updated_at: new Date().toISOString() })
      .eq("code", normalized);
  }

  return fetchRoom(normalized);
}

export async function setRoomStatusInDb(code: string, status: Room["status"]): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.from("rooms").update({ status }).eq("code", code.toUpperCase());
}

export async function resetRoomToWaitingInDb(code: string): Promise<Room | null> {
  const supabase = createServiceRoleClient();
  const normalized = code.toUpperCase();
  await supabase.from("game_states").delete().eq("room_code", normalized);
  await supabase.from("rooms").update({ status: "waiting" }).eq("code", normalized);
  return fetchRoom(normalized);
}

export async function updateRoomTotalRounds(code: string, totalRounds: number): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.from("rooms").update({ total_rounds: totalRounds }).eq("code", code.toUpperCase());
}

export async function getOpenRoomsCountFromDb(): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data: rooms } = await supabase.from("rooms").select("code").eq("status", "waiting");

  if (!rooms?.length) return 0;

  let count = 0;
  for (const row of rooms) {
    const room = await fetchRoom(row.code);
    if (room && room.players.length < room.maxPlayers) count += 1;
  }
  return count;
}
