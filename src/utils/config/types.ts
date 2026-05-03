export interface RawConfig {
  // lib/config.json
  allowed_role: string;

  api_enabled: boolean;
  api_port: number;
  api_secret: string;
  api_port_range: [number, number];

  log_update_speed: number; // In seconds

  // .env
  discord_id: string;
  discord_token: string;
}
