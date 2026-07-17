use crate::{db, time::now_unix, DbState};
use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize, Clone)]
pub(crate) struct Attachment {
  pub(crate) id: i64,
  pub(crate) item_id: i64,
  pub(crate) file_name: String,
  pub(crate) mime_type: String,
  pub(crate) file_path: String,
  pub(crate) created_at: i64,
}

fn attachments_dir(state: &DbState) -> PathBuf {
  state.path.parent().unwrap().join("attachments")
}

fn generate_file_name(item_id: i64, original_name: &str, now: i64) -> String {
  let ext = std::path::Path::new(original_name)
    .extension()
    .and_then(|e| e.to_str())
    .unwrap_or("bin");
  format!("{}_{}.{}", item_id, now, ext)
}

#[tauri::command]
pub(crate) fn add_attachment(
  state: tauri::State<DbState>,
  item_id: i64,
  file_name: String,
  mime_type: String,
  file_data: Vec<u8>,
) -> Result<Attachment, String> {
  if file_data.is_empty() {
    return Err("file data is empty".to_string());
  }

  let conn = db::open(&state.path).map_err(|e| e.to_string())?;

  // Verify item exists
  let exists: bool = conn
    .query_row(
      "SELECT COUNT(*) FROM items WHERE id = ?1",
      rusqlite::params![item_id],
      |row| row.get::<_, i64>(0),
    )
    .map_err(|e| e.to_string())?
    > 0;

  if !exists {
    return Err("item not found".to_string());
  }

  let now = now_unix();
  let stored_name = generate_file_name(item_id, &file_name, now);

  // Ensure attachment directory exists
  let dir = attachments_dir(&state);
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

  let file_path = dir.join(&stored_name);
  let file_path_str = file_path.to_string_lossy().to_string();

  // Write file to disk
  std::fs::write(&file_path, &file_data).map_err(|e| e.to_string())?;

  // Insert record
  conn
    .execute(
      "INSERT INTO item_attachments (item_id, file_name, mime_type, file_path, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
      rusqlite::params![item_id, file_name, mime_type, file_path_str, now],
    )
    .map_err(|e| e.to_string())?;

  let id = conn.last_insert_rowid();

  Ok(Attachment {
    id,
    item_id,
    file_name,
    mime_type,
    file_path: file_path_str,
    created_at: now,
  })
}

#[tauri::command]
pub(crate) fn list_attachments(
  state: tauri::State<DbState>,
  item_id: i64,
) -> Result<Vec<Attachment>, String> {
  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let mut stmt = conn
    .prepare(
      "SELECT id, item_id, file_name, mime_type, file_path, created_at FROM item_attachments WHERE item_id = ?1 ORDER BY created_at ASC",
    )
    .map_err(|e| e.to_string())?;

  let rows = stmt
    .query_map(rusqlite::params![item_id], |row| {
      Ok(Attachment {
        id: row.get(0)?,
        item_id: row.get(1)?,
        file_name: row.get(2)?,
        mime_type: row.get(3)?,
        file_path: row.get(4)?,
        created_at: row.get(5)?,
      })
    })
    .map_err(|e| e.to_string())?;

  let mut attachments = Vec::new();
  for row in rows {
    attachments.push(row.map_err(|e| e.to_string())?);
  }
  Ok(attachments)
}

#[tauri::command]
pub(crate) fn get_attachment_data_url(
  state: tauri::State<DbState>,
  id: i64,
) -> Result<String, String> {
  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let (file_path, mime_type): (String, String) = conn
    .query_row(
      "SELECT file_path, mime_type FROM item_attachments WHERE id = ?1",
      rusqlite::params![id],
      |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .map_err(|e| e.to_string())?;

  let data = std::fs::read(&file_path).map_err(|e| e.to_string())?;
  let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data);
  Ok(format!("data:{};base64,{}", mime_type, encoded))
}

#[tauri::command]
pub(crate) fn delete_attachment(
  state: tauri::State<DbState>,
  id: i64,
) -> Result<(), String> {
  let mut conn = db::open(&state.path).map_err(|e| e.to_string())?;

  // Get file path before deleting record
  let file_path: String = conn
    .query_row(
      "SELECT file_path FROM item_attachments WHERE id = ?1",
      rusqlite::params![id],
      |row| row.get(0),
    )
    .map_err(|e| e.to_string())?;

  let tx = conn.transaction().map_err(|e| e.to_string())?;

  let deleted = tx
    .execute(
      "DELETE FROM item_attachments WHERE id = ?1",
      rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;

  if deleted == 0 {
    return Err("attachment not found".to_string());
  }

  tx.commit().map_err(|e| e.to_string())?;

  // Remove file from disk (ignore errors if file doesn't exist)
  let _ = std::fs::remove_file(&file_path);

  Ok(())
}
