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
  drop_legacy_location_column(&conn)?;

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

  Ok(())
}

fn drop_legacy_location_column(conn: &Connection) -> Result<(), Box<dyn Error>> {
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
    return Ok(());
  }

  conn.execute_batch(
    "
    PRAGMA foreign_keys = OFF;
    BEGIN;
    DROP TABLE IF EXISTS __items_without_location;
    CREATE TABLE __items_without_location (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    INSERT INTO __items_without_location (id, name, created_at)
      SELECT id, name, created_at FROM items;
    DROP TABLE items;
    ALTER TABLE __items_without_location RENAME TO items;
    COMMIT;
    PRAGMA foreign_keys = ON;
    ",
  )?;

  Ok(())
}

pub fn open(db_path: &Path) -> Result<Connection, rusqlite::Error> {
  Connection::open(db_path)
}
