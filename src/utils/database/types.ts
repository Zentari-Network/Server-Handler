export interface Table {
  name: string;
  columns: string[];
}

export interface Server {
  id: number;
  name: string;
  port: number;
  backup_speed: number; // in minutes
  backup_retention: number;
  restart_times: string;
  created_at: string;
}
export interface Backup {
  id: number;
  server_id: number;
  name: string;
  protected: boolean;
  created_at: string;
}
export interface BackupWithSize extends Backup {
  size: number;
}
