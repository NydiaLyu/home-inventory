use crate::{db, time::now_unix, DbState};
use image::{GenericImageView, ImageFormat, imageops};
use serde::Serialize;
use std::path::Path;
use std::path::PathBuf;

#[derive(Serialize, Clone)]
pub(crate) struct Attachment {
  pub(crate) id: i64,
  pub(crate) item_id: i64,
  pub(crate) file_name: String,
  pub(crate) mime_type: String,
  pub(crate) file_path: String,
  pub(crate) thumbnail_path: String,
  pub(crate) created_at: i64,
}

fn attachments_dir(state: &DbState) -> PathBuf {
  state.path.parent().unwrap().join("attachments")
}

fn generate_file_name(item_id: i64, original_name: &str, now: i64, suffix: &str) -> String {
  let ext = std::path::Path::new(original_name)
    .extension()
    .and_then(|e| e.to_str())
    .unwrap_or("bin");
  // Include a random suffix so two attachments added within the same
  // second for the same item don't overwrite each other on disk.
  format!("{}_{}_{}.{}", item_id, now, suffix, ext)
}

/// Generate a short random suffix to disambiguate filenames. Uses a simple
/// thread-local RNG seeded from the OS to avoid pulling in a uuid crate.
fn random_suffix() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  let nanos = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.subsec_nanos())
    .unwrap_or(0);
  // Mix in an atomic counter to guarantee uniqueness even within the same
  // nanosecond on platforms with coarse clocks.
  use std::sync::atomic::{AtomicU64, Ordering};
  static COUNTER: AtomicU64 = AtomicU64::new(0);
  let c = COUNTER.fetch_add(1, Ordering::Relaxed);
  format!("{:x}{:x}", nanos, c)
}

fn generate_thumbnail(
  input_data: &[u8],
  output_path: &Path,
  max_dimension: u32,
) -> Result<(), String> {
  let img = image::load_from_memory(input_data)
    .map_err(|e| format!("failed to load image: {}", e))?;

  let (width, height) = img.dimensions();
  let scale = if width > height {
    max_dimension as f32 / width as f32
  } else {
    max_dimension as f32 / height as f32
  };

  if scale >= 1.0 {
    img.save_with_format(output_path, ImageFormat::Jpeg)
      .map_err(|e| format!("failed to save thumbnail: {}", e))?;
    return Ok(());
  }

  let new_width = (width as f32 * scale) as u32;
  let new_height = (height as f32 * scale) as u32;

  let resized = img.resize(new_width, new_height, imageops::FilterType::Lanczos3);

  resized
    .save_with_format(output_path, ImageFormat::Jpeg)
    .map_err(|e| format!("failed to save thumbnail: {}", e))?;

  Ok(())
}

fn update_thumbnail_path(db_path: PathBuf, attachment_id: i64, thumbnail_path: String) {
  if let Ok(conn) = db::open(&db_path) {
    let _ = conn.execute(
      "UPDATE item_attachments SET thumbnail_path = ?1 WHERE id = ?2",
      rusqlite::params![thumbnail_path, attachment_id],
    );
  }
}

#[tauri::command(async)]
pub(crate) async fn add_attachment(
  state: tauri::State<'_, DbState>,
  item_id: i64,
  file_name: String,
  mime_type: String,
  file_data: Vec<u8>,
) -> Result<Attachment, String> {
  if file_data.is_empty() {
    return Err("file data is empty".to_string());
  }

  let conn = db::open(&state.path).map_err(|e| e.to_string())?;

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
  let suffix = random_suffix();
  let stored_name = generate_file_name(item_id, &file_name, now, &suffix);

  let dir = attachments_dir(&state);
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

  let file_path = dir.join(&stored_name);
  let file_path_str = file_path.to_string_lossy().to_string();

  std::fs::write(&file_path, &file_data).map_err(|e| e.to_string())?;

  conn
    .execute(
      "INSERT INTO item_attachments (item_id, file_name, mime_type, file_path, thumbnail_path, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
      rusqlite::params![item_id, file_name, mime_type, file_path_str, "", now],
    )
    .map_err(|e| e.to_string())?;

  let id = conn.last_insert_rowid();

  let is_image = mime_type.starts_with("image/");

  let attachment = Attachment {
    id,
    item_id,
    file_name,
    mime_type,
    file_path: file_path_str,
    thumbnail_path: String::new(),
    created_at: now,
  };

  if is_image {
    let db_path = state.path.clone();
    let file_data_clone = file_data.clone();
    let thumbnail_name = format!("{}_thumb_{}_{}.jpg", item_id, now, suffix);
    let thumbnail_path = dir.join(&thumbnail_name);

    tokio::spawn(async move {
      if let Ok(()) = generate_thumbnail(&file_data_clone, &thumbnail_path, 200) {
        let thumbnail_path_str = thumbnail_path.to_string_lossy().to_string();
        update_thumbnail_path(db_path, id, thumbnail_path_str);
      }
    });
  }

  Ok(attachment)
}

#[tauri::command]
pub(crate) fn list_attachments(
  state: tauri::State<DbState>,
  item_id: i64,
) -> Result<Vec<Attachment>, String> {
  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let mut stmt = conn
    .prepare(
      "SELECT id, item_id, file_name, mime_type, file_path, thumbnail_path, created_at FROM item_attachments WHERE item_id = ?1 ORDER BY created_at ASC",
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
        thumbnail_path: row.get(5)?,
        created_at: row.get(6)?,
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
pub(crate) fn get_thumbnail_data_url(
  state: tauri::State<DbState>,
  id: i64,
) -> Result<String, String> {
  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let (thumbnail_path, _mime_type): (String, String) = conn
    .query_row(
      "SELECT thumbnail_path, mime_type FROM item_attachments WHERE id = ?1",
      rusqlite::params![id],
      |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .map_err(|e| e.to_string())?;

  if thumbnail_path.is_empty() {
    return get_attachment_data_url(state, id);
  }

  let data = std::fs::read(&thumbnail_path).map_err(|e| e.to_string())?;
  let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &data);
  Ok(format!("data:image/jpeg;base64,{}", encoded))
}

#[tauri::command]
pub(crate) fn delete_attachment(
  state: tauri::State<DbState>,
  id: i64,
) -> Result<(), String> {
  let mut conn = db::open(&state.path).map_err(|e| e.to_string())?;

  let (file_path, thumbnail_path): (String, String) = conn
    .query_row(
      "SELECT file_path, thumbnail_path FROM item_attachments WHERE id = ?1",
      rusqlite::params![id],
      |row| Ok((row.get(0)?, row.get(1)?)),
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

  let _ = std::fs::remove_file(&file_path);
  if !thumbnail_path.is_empty() {
    let _ = std::fs::remove_file(&thumbnail_path);
  }

  Ok(())
}