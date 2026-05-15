use rusqlite::Connection;
use std::error::Error;
use std::path::Path;

pub fn init(db_path: &Path) -> Result<(), Box<dyn Error>> {
  let conn = Connection::open(db_path)?;
  conn.execute(
    "CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    )",
    [],
  )?;

  let mut stmt = conn.prepare("PRAGMA table_info(items)")?;
  let columns = stmt.query_map([], |row| row.get::<_, String>(1))?;
  let mut has_location = false;
  for column in columns {
    if column? == "location" {
      has_location = true;
      break;
    }
  }

  if !has_location {
    conn.execute("ALTER TABLE items ADD COLUMN location TEXT NOT NULL DEFAULT ''", [])?;
  }

  conn.execute(
    "CREATE TABLE IF NOT EXISTS custom_fields (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )",
    [],
  )?;

  Ok(())
}

pub fn open(db_path: &Path) -> Result<Connection, rusqlite::Error> {
  Connection::open(db_path)
}
