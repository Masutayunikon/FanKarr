export type TorrentClientConfig = Record<string, string | number | boolean>

export interface TorrentClientField {
  key         : string
  label       : string
  type        : 'text' | 'password' | 'number' | 'url' | 'boolean'
  placeholder?: string
  required    : boolean
  default?    : string | number | boolean
}

export interface TorrentClientDefinition {
  id    : string
  label : string
  fields: TorrentClientField[]
}

export interface SavedTorrentClient {
  uuid  : string
  name  : string
  type  : string
  config: TorrentClientConfig
}
