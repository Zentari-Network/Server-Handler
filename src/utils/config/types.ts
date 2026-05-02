export interface RawConfig {
  // lib/config.json
  allowed_role: string;
  log_update_speed: number; // In seconds

  // .env
  discord_id: string;
  discord_token: string;
}
