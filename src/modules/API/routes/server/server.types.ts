export interface ServerOfflineState {
  id: number;
  online: false;
}
export interface ServerOnlineState {
  id: number;
  online: true;
  tps: number;
  cpu: number;
  memory: number;
  uptime: string;
  players: Player[];
}
export type ServerState = ServerOfflineState | ServerOnlineState;

export interface Player {
  username: string;
}

export interface UpdateServerStateRequest {
  tps: number;
  players: Player[];
}
export interface CreateServerRequest {
  name: string;
  port?: number;
  template?: string;
  autostart?: boolean;
  cpu_limit?: number;
  ram_limit?: number;
}
