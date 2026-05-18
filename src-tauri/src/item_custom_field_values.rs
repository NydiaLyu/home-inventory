use crate::{db, DbState};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub(crate) struct CustomFieldValueInput {
  field_id: i64,
  value: String,
}

#[derive(Serialize)]
pub(crate) struct ItemCustomFieldValue {
  item_id: i64,
  field_id: i64,
  value: String,
}

#[tauri::command]
pub(crate) fn list_item_custom_field_values(
  state: tauri::State<DbState>,
) -> Result<Vec<ItemCustomFieldValue>, String> {
  let conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let mut stmt = conn
    .prepare("SELECT item_id, field_id, value FROM item_custom_field_values")
    .map_err(|e| e.to_string())?;

  let rows = stmt
    .query_map([], |row| {
      Ok(ItemCustomFieldValue {
        item_id: row.get(0)?,
        field_id: row.get(1)?,
        value: row.get(2)?,
      })
    })
    .map_err(|e| e.to_string())?;

  let mut values = Vec::new();
  for value in rows {
    values.push(value.map_err(|e| e.to_string())?);
  }

  Ok(values)
}

#[tauri::command]
pub(crate) fn set_item_custom_field_values(
  state: tauri::State<DbState>,
  item_id: i64,
  values: Vec<CustomFieldValueInput>,
) -> Result<(), String> {
  let mut conn = db::open(&state.path).map_err(|e| e.to_string())?;
  let tx = conn.transaction().map_err(|e| e.to_string())?;

  tx.execute(
    "DELETE FROM item_custom_field_values WHERE item_id = ?1",
    rusqlite::params![item_id],
  )
  .map_err(|e| e.to_string())?;

  for value in values {
    let value_text = value.value.trim().to_string();
    if value_text.is_empty() {
      continue;
    }

    tx.execute(
      "INSERT INTO item_custom_field_values (item_id, field_id, value) VALUES (?1, ?2, ?3)",
      rusqlite::params![item_id, value.field_id, value_text],
    )
    .map_err(|e| e.to_string())?;
  }

  tx.commit().map_err(|e| e.to_string())?;
  Ok(())
}
