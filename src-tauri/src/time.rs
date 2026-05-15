use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) fn now_unix() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_secs() as i64
}
