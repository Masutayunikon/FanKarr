/** Titres de l'API Fankai vers les noms de dossiers du dépôt GitLab des NFO. */

export const SERIE_TITLE_GITLAB_MAP: Record<string, string> = {
    'Enfer Et Paradis Henshū'          : 'Enfer et Paradis Henshū',
    'Hajime No Ippo Henshū'            : 'Hajime no Ippo Henshū',
    'Hikaru No Go Henshū'              : 'Hikaru no Go Henshū',
    'Hokuto No Ken Kaï'                : 'Hokuto no Ken Kaï',
    'Kaguya-sama : Love is War Henshū' : 'Kaguya-sama - Love is War Henshū',
    'Kenshin le Vagabond Henshū'       : 'Kenshin le vagabond Henshū',
    'Kuroko No Basket Henshū'          : 'Kuroko no Basket Henshū',
    'Shingeki No Kyojin Henshū'        : 'Shingeki no Kyojin Henshū',
    'Tower Of God Henshū'              : 'Tower of God Henshū',
}

export function getGitlabTitle(title: string): string {
    return SERIE_TITLE_GITLAB_MAP[title] ?? title
}

/** Dossier « Saison N » du dépôt GitLab vers « Season NN » si les dossiers en anglais sont activés. */
export function localizeNfoPath(relativePath: string, englishDirectory: boolean): string {
    if (!englishDirectory) return relativePath
    const parts = relativePath.split('/')
    const m     = parts.length > 1 ? parts[0]!.match(/^Saison\s+(\d+)$/i) : null
    if (!m) return relativePath
    const n = Number(m[1])
    parts[0] = n === 0 ? 'Specials' : `Season ${String(n).padStart(2, '0')}`
    return parts.join('/')
}