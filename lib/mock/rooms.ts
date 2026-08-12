import { MAX_PLAYERS, ROOM_CODE_LENGTH, type GuestSession, type Player, type Room } from "@/lib/types";
import { createBotPlayers } from "@/lib/game/engine";

const STORAGE_KEY_ROOMS = "whist_mock_rooms";
const STORAGE_KEY_GUEST = "whist_guest_session";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function readRooms(): Record<string, Room> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ROOMS);
    return raw ? (JSON.parse(raw) as Record<string, Room>) : {};
  } catch {
    return {};
  }
}

function writeRooms(rooms: Record<string, Room>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms));
}

function seedOpenRooms(): Record<string, Room> {
  const now = Date.now();
  return {
    OPEN01: {
      code: "OPEN01",
      hostId: "seed-host-1",
      players: [
        { id: "seed-host-1", name: "דני", isHost: true, joinedAt: now - 120_000 },
        { id: "seed-p-2", name: "מיכל", isHost: false, joinedAt: now - 90_000 },
      ],
      status: "waiting",
      createdAt: now - 120_000,
      maxPlayers: MAX_PLAYERS,
    },
    OPEN02: {
      code: "OPEN02",
      hostId: "seed-host-2",
      players: [{ id: "seed-host-2", name: "יוסי", isHost: true, joinedAt: now - 60_000 }],
      status: "waiting",
      createdAt: now - 60_000,
      maxPlayers: MAX_PLAYERS,
    },
  };
}

function getAllRooms(): Record<string, Room> {
  const rooms = readRooms();
  if (Object.keys(rooms).length === 0) {
    const seeded = seedOpenRooms();
    writeRooms(seeded);
    return seeded;
  }
  return rooms;
}

export function getGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GUEST);
    return raw ? (JSON.parse(raw) as GuestSession) : null;
  } catch {
    return null;
  }
}

export function saveGuestSession(session: GuestSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_GUEST, JSON.stringify(session));
}

export function getOrCreateGuestSession(displayName: string): GuestSession {
  const existing = getGuestSession();
  if (existing && existing.displayName === displayName.trim()) {
    return existing;
  }
  const session: GuestSession = {
    playerId: generateId(),
    displayName: displayName.trim(),
  };
  saveGuestSession(session);
  return session;
}

export function getRoom(code: string): Room | null {
  const rooms = getAllRooms();
  return rooms[code.toUpperCase()] ?? null;
}

export function createRoom(hostName: string): { room: Room; session: GuestSession } {
  const session = getOrCreateGuestSession(hostName);
  const rooms = getAllRooms();

  let code = generateRoomCode();
  while (rooms[code]) {
    code = generateRoomCode();
  }

  const host: Player = {
    id: session.playerId,
    name: session.displayName,
    isHost: true,
    joinedAt: Date.now(),
  };

  const room: Room = {
    code,
    hostId: session.playerId,
    players: [host],
    status: "waiting",
    createdAt: Date.now(),
    maxPlayers: MAX_PLAYERS,
  };

  rooms[code] = room;
  writeRooms(rooms);
  return { room, session };
}

export function createBotPracticeRoom(hostName: string): { room: Room; session: GuestSession } {
  const session = getOrCreateGuestSession(hostName);
  const rooms = getAllRooms();

  let code = generateRoomCode();
  while (rooms[code]) {
    code = generateRoomCode();
  }

  const now = Date.now();
  const bots = createBotPlayers(3);

  const host: Player = {
    id: session.playerId,
    name: session.displayName,
    isHost: true,
    joinedAt: now,
  };

  const botPlayers: Player[] = bots.map((bot, i) => ({
    id: bot.id,
    name: bot.name,
    isHost: false,
    joinedAt: now + i + 1,
  }));

  const room: Room = {
    code,
    hostId: session.playerId,
    players: [host, ...botPlayers],
    status: "waiting",
    createdAt: now,
    maxPlayers: MAX_PLAYERS,
    isBotRoom: true,
  };

  rooms[code] = room;
  writeRooms(rooms);
  return { room, session };
}

export function joinRoom(code: string, displayName: string): { room: Room; session: GuestSession } | { error: string } {
  const normalizedCode = code.toUpperCase().trim();
  const rooms = getAllRooms();
  const room = rooms[normalizedCode];

  if (!room) {
    return { error: "חדר לא נמצא. בדוק את הקוד ונסה שוב." };
  }

  const session = getOrCreateGuestSession(displayName);
  const alreadyInRoom = room.players.some((p) => p.id === session.playerId);

  if (alreadyInRoom) {
    const updatedName = session.displayName;
    const player = room.players.find((p) => p.id === session.playerId);
    if (player && player.name !== updatedName) {
      player.name = updatedName;
      rooms[normalizedCode] = room;
      writeRooms(rooms);
    }
    return { room, session };
  }

  if (room.status !== "waiting") {
    return { error: "המשחק בחדר זה כבר התחיל." };
  }

  if (room.players.length >= room.maxPlayers) {
    return { error: "החדר מלא (4/4)." };
  }

  const nameTaken = room.players.some(
    (p) => p.name.toLowerCase() === session.displayName.toLowerCase()
  );
  if (nameTaken) {
    return { error: "שם זה כבר תפוס בחדר." };
  }

  room.players.push({
    id: session.playerId,
    name: session.displayName,
    isHost: false,
    joinedAt: Date.now(),
  });
  rooms[normalizedCode] = room;
  writeRooms(rooms);

  return { room, session };
}

export function findQuickMatch(displayName: string): { room: Room; session: GuestSession } | { error: string } {
  const rooms = getAllRooms();
  const openRoom = Object.values(rooms).find(
    (r) => r.status === "waiting" && r.players.length < r.maxPlayers
  );

  if (!openRoom) {
    return { error: "אין חדרים פנויים כרגע. נסה ליצור חדר חדש." };
  }

  return joinRoom(openRoom.code, displayName);
}

export function leaveRoom(code: string, playerId: string): Room | null {
  const normalizedCode = code.toUpperCase();
  const rooms = getAllRooms();
  const room = rooms[normalizedCode];
  if (!room) return null;

  room.players = room.players.filter((p) => p.id !== playerId);

  if (room.players.length === 0) {
    delete rooms[normalizedCode];
    writeRooms(rooms);
    return null;
  }

  if (room.hostId === playerId) {
    const newHost = room.players[0];
    newHost.isHost = true;
    room.hostId = newHost.id;
    room.players = room.players.map((p) => ({
      ...p,
      isHost: p.id === newHost.id,
    }));
  }

  rooms[normalizedCode] = room;
  writeRooms(rooms);
  return room;
}

export function setRoomStatus(code: string, status: Room["status"]): void {
  const rooms = getAllRooms();
  const room = rooms[code.toUpperCase()];
  if (!room) return;
  room.status = status;
  rooms[code.toUpperCase()] = room;
  writeRooms(rooms);
}

export function resetRoomToWaiting(code: string): Room | null {
  const rooms = getAllRooms();
  const room = rooms[code.toUpperCase()];
  if (!room) return null;
  room.status = "waiting";
  rooms[code.toUpperCase()] = room;
  writeRooms(rooms);
  return room;
}

export function getOpenRoomsCount(): number {
  return Object.values(getAllRooms()).filter(
    (r) => r.status === "waiting" && r.players.length < r.maxPlayers
  ).length;
}
