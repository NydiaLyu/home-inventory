use rusqlite::Connection;
use std::error::Error;
use std::path::Path;

pub fn init(db_path: &Path) -> Result<(), Box<dyn Error>> {
  let conn = Connection::open(db_path)?;
  conn.execute(
    "CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )",
    [],
  )?;
  Ok(())
}

pub fn open(db_path: &Path) -> Result<Connection, rusqlite::Error> {
  Connection::open(db_path)
}
