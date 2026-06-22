export type Item = {
  id: number
  name: string
  created_at: number
}

export type CustomField = {
  id: number
  name: string
  created_at: number
}

export type ItemCustomFieldValue = {
  item_id: number
  field_id: number
  value: string
}

export type CustomFieldValueInput = {
  field_id: number
  value: string
}

export type CustomFieldValueMap = Record<number, Record<number, string>>

export type FieldSortMode = 'most_used' | 'recently_added' | 'earliest_added'

export type SelectedDetail =
  | { type: 'item'; id: number }
  | { type: 'customField'; id: number }
  | null
