import type { InjectionKey } from 'vue'

export type SetupStepId = 'welcome' | 'paths' | 'client' | 'import' | 'media-server' | 'catalog' | 'recap'

export interface SetupSettings {
  mediaPath          : string
  completePath       : string
  organizeMode       : 'hardlink' | 'copy' | 'move'
  nfoSupport         : boolean
  autoImport         : boolean
  deleteTorrentOnMove: boolean
  autoUnimportMissing: boolean
  englishDirectory   : boolean
}

export interface PathCheck {
  input      : string
  resolved   : string
  exists     : boolean
  isDirectory: boolean
  writable   : boolean
  error?     : string
}

export interface PathsCheckResult {
  ok          : boolean
  mediaPath   : PathCheck
  completePath: PathCheck | null
  relation    : 'distinct' | 'same' | 'nested' | null
  hardlink    : { tested: boolean; ok: boolean; code?: string; message: string }
}

export interface SetupContext {
  relaunch   : boolean
  clientSkipped: boolean
  plexOpened : boolean
  goto       : (id: SetupStepId) => void
  finish     : (withTour: boolean) => Promise<void>
}

export const setupContextKey: InjectionKey<SetupContext> = Symbol('setup-context')

export async function postSettings(patch: Partial<SetupSettings>): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(patch),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function checkPaths(mediaPath: string, completePath: string): Promise<PathsCheckResult | null> {
  try {
    const res = await fetch('/api/system/check-paths', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ mediaPath, completePath }),
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}
