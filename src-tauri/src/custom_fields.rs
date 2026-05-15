use crate::{db, time::now_unix, DbState};
use serde::Serialize;

#[derive(Serialize)]
pub(crate) struct CustomField {
  id: i64,
  name: String,
  created_at: i64,
}

#[tauri::command]
pub(crate) fn add_custom_field(
  state: tauri::State<DbState>,
  name: String,
) -> Result<CustomField, String> {
  let name = name.trim().to_string();
  if name.is_empty() {
    return Err("field name cannot be empty".to_string());
  }

  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let created_at = now_unix();
  conn
    .execute(
      "INSERT INTO custom_fields (name, created_at) VALUES (?1, ?2)",
      rusqlite::params![name, created_at],
    )
    .map_err(|e| {
      if let rusqlite::Error::SqliteFailure(_, Some(message)) = &e {
        if message.contains("UNIQUE") {
          return "field name already exists".to_string();
        }
      }
      e.to_string()
    })?;

  let id = conn.last_insert_rowid();
  Ok(CustomField {
    id,
    name,
    created_at,
  })
}

#[tauri::command]
pub(crate) fn list_custom_fields(
  state: tauri::State<DbState>,
) -> Result<Vec<CustomField>, String> {
  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, name, created_at FROM custom_fields ORDER BY id DESC")
    .map_err(|e| e.to_string())?;

  let rows = stmt
    .query_map([], |row| {
      Ok(CustomField {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
      })
    })
    .map_err(|e| e.to_string())?;

  let mut fields = Vec::new();
  for field in rows {
    fields.push(field.map_err(|e| e.to_string())?);
  }

  Ok(fields)
}
