export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  status: "waiting" | "playing" | "finished";
  createdAt: number;
  maxPlayers: number;
  isBotRoom?: boolean;
  totalRounds?: number;
}

export interface GuestSession {
  playerId: string;
  displayName: string;
}

export const MAX_PLAYERS = 4;
export const ROOM_CODE_LENGTH = 6;
