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
    .prepare("SELECT id, name, created_at FROM custom_fields ORDER BY created_at DESC, id DESC")
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

#[tauri::command]
pub(crate) fn delete_custom_field(state: tauri::State<DbState>, id: i64) -> Result<(), String> {
  let mut conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let tx = conn.transaction().map_err(|e| e.to_string())?;

  tx.execute(
    "DELETE FROM item_custom_field_values WHERE field_id = ?1",
    rusqlite::params![id],
  )
  .map_err(|e| e.to_string())?;

  let deleted = tx
    .execute("DELETE FROM custom_fields WHERE id = ?1", rusqlite::params![id])
    .map_err(|e| e.to_string())?;

  if deleted == 0 {
    return Err("custom field not found".to_string());
  }

  tx.commit().map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub(crate) fn update_custom_field(
  state: tauri::State<DbState>,
  id: i64,
  name: String,
) -> Result<(), String> {
  let name = name.trim().to_string();
  if name.is_empty() {
    return Err("field name cannot be empty".to_string());
  }

  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let updated = conn
    .execute(
      "UPDATE custom_fields SET name = ?1 WHERE id = ?2",
      rusqlite::params![name, id],
    )
    .map_err(|e| {
      if let rusqlite::Error::SqliteFailure(_, Some(message)) = &e {
        if message.contains("UNIQUE") {
          return "field name already exists".to_string();
        }
      }
      e.to_string()
    })?;

  if updated == 0 {
    return Err("custom field not found".to_string());
  }

  Ok(())
}
