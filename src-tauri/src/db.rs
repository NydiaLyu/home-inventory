use rusqlite::Connection;
use std::error::Error;
use std::path::Path;

pub fn init(db_path: &Path) -> Result<(), Box<dyn Error>> {
  let conn = Connection::open(db_path)?;

  // Enable WAL mode and foreign keys for better performance and integrity
  conn.execute_batch(
    "PRAGMA journal_mode=WAL;
     PRAGMA foreign_keys=ON;",
  )?;

  conn.execute(
    "CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )",
    [],
  )?;

  conn.execute(
    "CREATE TABLE IF NOT EXISTS custom_fields (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )",
    [],
  )?;

  conn.execute(
    "CREATE TABLE IF NOT EXISTS item_custom_field_values (
      item_id INTEGER NOT NULL,
      field_id INTEGER NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (item_id, field_id),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
    )",
    [],
  )?;

  conn.execute(
    "CREATE TABLE IF NOT EXISTS item_attachments (
      id INTEGER PRIMARY KEY,
      item_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )",
    [],
  )?;

  Ok(())
}

pub fn open(db_path: &Path) -> Result<Connection, rusqlite::Error> {
  Connection::open(db_path)
}
