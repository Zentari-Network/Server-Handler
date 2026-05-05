import type { Table } from "./types";

const DatabaseConstants = {
  Tables: [
    {
      name: "servers",
      columns: [
        "id INTEGER PRIMARY KEY AUTOINCREMENT",
        "name VARCHAR(32) NOT NULL",
        "port INTEGER NOT NULL",
        "backup_speed INTEGER",
        "backup_retention INTEGER DEFAULT 6 NOT NULL",
        "restart_times TEXT DEFAULT '[]' NOT NULL",
        "cpu_limit REAL",
        "ram_limit INTEGER",
        "auto_reboot BOOLEAN DEFAULT false NOT NULL",
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL",
      ],
    },
    {
      name: "backups",
      columns: [
        "id INTEGER PRIMARY KEY AUTOINCREMENT",
        "server_id INTEGER NOT NULL",
        "name VARCHAR(32)",
        "protected BOOLEAN DEFAULT false NOT NULL",
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL",

        "FOREIGN KEY(server_id) REFERENCES servers(id) ON DELETE CASCADE",
      ],
    },
  ] as Table[],
};

export default DatabaseConstants;
