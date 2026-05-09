mod db;

use serde::Serialize;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Clone)]
struct DbState {
  path: PathBuf,
}

#[derive(Serialize)]
struct Item {
  id: i64,
  name: String,
  created_at: i64,
}

fn now_unix() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_secs() as i64
}

#[tauri::command]
fn add_item(state: tauri::State<DbState>, name: String) -> Result<Item, String> {
  let name = name.trim().to_string();
  if name.is_empty() {
    return Err("name cannot be empty".to_string());
  }

  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let created_at = now_unix();
  conn
    .execute(
      "INSERT INTO items (name, created_at) VALUES (?1, ?2)",
      rusqlite::params![name, created_at],
    )
    .map_err(|e| e.to_string())?;

  let id = conn.last_insert_rowid();
  Ok(Item {
    id,
    name,
    created_at,
  })
}

#[tauri::command]
fn list_items(state: tauri::State<DbState>) -> Result<Vec<Item>, String> {
  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, name, created_at FROM items ORDER BY id DESC")
    .map_err(|e| e.to_string())?;

  let rows = stmt
    .query_map([], |row| {
      Ok(Item {
        id: row.get(0)?,
        name: row.get(1)?,
        created_at: row.get(2)?,
      })
    })
    .map_err(|e| e.to_string())?;

  let mut items = Vec::new();
  for item in rows {
    items.push(item.map_err(|e| e.to_string())?);
  }
  Ok(items)
}

#[tauri::command]
fn delete_item(state: tauri::State<DbState>, id: i64) -> Result<(), String> {
  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let deleted = conn
    .execute("DELETE FROM items WHERE id = ?1", rusqlite::params![id])
    .map_err(|e| e.to_string())?;

  if deleted == 0 {
    return Err("item not found".to_string());
  }

  Ok(())
}

#[tauri::command]
fn update_item(state: tauri::State<DbState>, id: i64, name: String) -> Result<(), String> {
  let name = name.trim().to_string();
  if name.is_empty() {
    return Err("name cannot be empty".to_string());
  }

  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let updated = conn
    .execute(
      "UPDATE items SET name = ?1 WHERE id = ?2",
      rusqlite::params![name, id],
    )
    .map_err(|e| e.to_string())?;

  if updated == 0 {
    return Err("item not found".to_string());
  }

  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let app_data_dir = app.path().app_data_dir()?;
      std::fs::create_dir_all(&app_data_dir)?;
      let db_path = app_data_dir.join("items.db");
      db::init(&db_path)?;
      app.manage(DbState { path: db_path });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      add_item,
      list_items,
      delete_item,
      update_item
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
