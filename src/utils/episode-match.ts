export interface MatchEpisode {
  id               : number
  episode_number   : number
  original_filename?: string | null
  nfo_filename?    : string | null
  formatted_name?  : string | null
}

export interface MatchSeason {
  season_number: number
  episodes     : MatchEpisode[]
}

// Associe un fichier à un épisode : nom exact, puis SxxEyy, puis numéro seul
export function matchEpisodeFile(filename: string, seasons: MatchSeason[]): number | null {
  const nameNoExt = filename.replace(/\.[^.]+$/, '').toLowerCase()

  for (const season of seasons) {
    for (const ep of season.episodes) {
      const candidates = [
        ep.original_filename,
        ep.nfo_filename?.replace(/\.nfo$/, ''),
        ep.formatted_name?.replace(/[<>:"/\\|?*]/g, '').trim(),
      ].filter((s): s is string => !!s).map(s => s.toLowerCase().replace(/\.[^.]+$/, ''))

      if (candidates.some(c => c === nameNoExt || nameNoExt.startsWith(c + '.'))) return ep.id
    }
  }

  const se = filename.match(/S(\d{1,2})[\s._-]?E(\d{1,3})/i)
  if (se) {
    const ep = seasons.find(s => s.season_number === Number(se[1]))?.episodes.find(e => e.episode_number === Number(se[2]))
    if (ep) return ep.id
  }

  const numMatch = filename.match(/[.\s_-]0*(\d{1,3})[.\s_-]/i)
  if (numMatch) {
    const num = Number(numMatch[1])
    for (const season of seasons) {
      const ep = season.episodes.find(e => e.episode_number === num)
      if (ep) return ep.id
    }
  }

  return null
}
