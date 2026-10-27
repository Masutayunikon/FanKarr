// Préfixe d'URL quand l'application est servie dans un sous-dossier (ex. « /fankarr »).
// Le serveur l'injecte dans index.html via <base href> ; vide à la racine et en dev.
export const BASE_PATH = (document.querySelector('base')?.getAttribute('href') ?? '/').replace(/\/+$/, '')

export function withBase(url: string): string {
    return url.startsWith('/') && !url.startsWith('//') ? BASE_PATH + url : url
}

// Les appels fetch('/api/...') de l'application passent par le préfixe sans modifier chaque appel
export function installBaseFetch(): void {
    if (!BASE_PATH) return
    const nativeFetch = window.fetch.bind(window)
    window.fetch = (input, init) => nativeFetch(typeof input === 'string' ? withBase(input) : input, init)
}
