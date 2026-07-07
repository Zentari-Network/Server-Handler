export interface ServerOfflineState {
  id: number;
  online: false;
}
export interface ServerOnlineState {
  id: number;
  online: true;
  cpu: number;
  memory: number;
  uptime: string;
}
export type ServerState = ServerOfflineState | ServerOnlineState;

export interface CreateServerRequest {
  name: string;
  port?: number;
  template?: string;
  autostart?: boolean;
  cpu_limit?: number;
  ram_limit?: number;
}
