# Changelog

## [3.2.1](https://github.com/Masutayunikon/FanKarr/compare/v3.2.0...v3.2.1) (2026-04-07)


### Bug Fixes

* bun target android ([a167a87](https://github.com/Masutayunikon/FanKarr/commit/a167a870188bdcd6b26644e304c2059ad5f05e96))

## [3.2.0](https://github.com/Masutayunikon/FanKarr/compare/v3.1.1...v3.2.0) (2026-04-07)


### Features

* add build for arm64 ([96acc13](https://github.com/Masutayunikon/FanKarr/commit/96acc134698ca09842d57d906e4a28ab8e94ba56))
* add developer settings on settings and dashboard debug ([96acc13](https://github.com/Masutayunikon/FanKarr/commit/96acc134698ca09842d57d906e4a28ab8e94ba56))


### Bug Fixes

* android build name ([0cfe6eb](https://github.com/Masutayunikon/FanKarr/commit/0cfe6eb81055b841a67c08e02129709c0214d87d))

## [3.1.1](https://github.com/Masutayunikon/FanKarr/compare/v3.1.0...v3.1.1) (2026-03-28)


### Bug Fixes

* remove plex settings ([8744ade](https://github.com/Masutayunikon/FanKarr/commit/8744adeff5f2db1ab648412d50495690d9e68d0b))
* torrent for multiple seasons is now working ([2514008](https://github.com/Masutayunikon/FanKarr/commit/25140086c13ce5a497500659bdd6cea2aeff96ed))

## [3.1.0](https://github.com/Masutayunikon/FanKarr/compare/v3.0.0...v3.1.0) (2026-03-27)


### Features

* use original_name and formated_name from scraper to bypass timeout ([1b693fc](https://github.com/Masutayunikon/FanKarr/commit/1b693fc53b9ca3a830c952c3f2c101bf1da7d27e))

## [3.0.0](https://github.com/Masutayunikon/FanKarr/compare/v2.4.1...v3.0.0) (2026-03-27)


### ⚠ BREAKING CHANGES

* nouvelle architecture frontend avec layout sidebar, système de thèmes et routes restructurées

### Features

* hors-fankai badge and fix series datetime and typo ([9d4500a](https://github.com/Masutayunikon/FanKarr/commit/9d4500a3834455b5dd72663c8eeb2d1c54b240e2))
* refonte complète du frontend et amélioration des logs serveur ([ed38a2d](https://github.com/Masutayunikon/FanKarr/commit/ed38a2d07d977bd3d3bb41da6f2aad8b70e7f359))

## [2.4.1](https://github.com/Masutayunikon/FanKarr/compare/v2.4.0...v2.4.1) (2026-03-24)


### Bug Fixes

* add usePlexTitles to return function ([381e327](https://github.com/Masutayunikon/FanKarr/commit/381e3274344c59cc80ba6230d30c96e5c5637ea5))

## [2.4.0](https://github.com/Masutayunikon/FanKarr/compare/v2.3.3...v2.4.0) (2026-03-24)


### Features

* **settings:** option titres optimisés Plex (title_for_plex) ([54dfe6b](https://github.com/Masutayunikon/FanKarr/commit/54dfe6b595c65a77b50dc3b4853182b594df0d9b))


### Bug Fixes

* **catalogue:** activeTorrents filtre désormais uniquement state=downloading ([54dfe6b](https://github.com/Masutayunikon/FanKarr/commit/54dfe6b595c65a77b50dc3b4853182b594df0d9b))
* **organize:** retry sur les erreurs réseau dans enrichSeriesDataWithOriginalFilenames ([54dfe6b](https://github.com/Masutayunikon/FanKarr/commit/54dfe6b595c65a77b50dc3b4853182b594df0d9b))
* **organize:** sanitisation des caractères spéciaux dans les noms de dossiers ([54dfe6b](https://github.com/Masutayunikon/FanKarr/commit/54dfe6b595c65a77b50dc3b4853182b594df0d9b))

## [2.3.3](https://github.com/Masutayunikon/FanKarr/compare/v2.3.2...v2.3.3) (2026-03-24)


### Bug Fixes

* recuperation des episodes avec un delai ([dfc6c13](https://github.com/Masutayunikon/FanKarr/commit/dfc6c1300e3dd8323e422ce3e71465bac77f94cf))

## [2.3.2](https://github.com/Masutayunikon/FanKarr/compare/v2.3.1...v2.3.2) (2026-03-24)


### Bug Fixes

* badge catalogue sur les series importé ([f070f17](https://github.com/Masutayunikon/FanKarr/commit/f070f1754ef616874cfb081eb2fefadad602c221))

## [2.3.1](https://github.com/Masutayunikon/FanKarr/compare/v2.3.0...v2.3.1) (2026-03-24)


### Bug Fixes

* add readsettings import ([ceb8e64](https://github.com/Masutayunikon/FanKarr/commit/ceb8e64a55937e20e27c1fb64865aba59516d518))

## [2.3.0](https://github.com/Masutayunikon/FanKarr/compare/v2.2.0...v2.3.0) (2026-03-24)


### Features

* **catalogue:** badge IMPORTÉ et refresh automatique post-import ([0cf3446](https://github.com/Masutayunikon/FanKarr/commit/0cf344667baccd44c946cee507c4343286783d3f))
* **catalogue:** tri du catalogue avec 4 options ([0cf3446](https://github.com/Masutayunikon/FanKarr/commit/0cf344667baccd44c946cee507c4343286783d3f))
* **downloads:** bouton Organiser tout renommé Importer tout ([0cf3446](https://github.com/Masutayunikon/FanKarr/commit/0cf344667baccd44c946cee507c4343286783d3f))
* **organize:** nommage des fichiers selon original_filename ou formatted_name ([0cf3446](https://github.com/Masutayunikon/FanKarr/commit/0cf344667baccd44c946cee507c4343286783d3f))
* **settings:** ajout du toggle import automatique (activé par défaut) ([0cf3446](https://github.com/Masutayunikon/FanKarr/commit/0cf344667baccd44c946cee507c4343286783d3f))
* **settings:** textes génériques sans mention de logiciels spécifiques ([0cf3446](https://github.com/Masutayunikon/FanKarr/commit/0cf344667baccd44c946cee507c4343286783d3f))


### Bug Fixes

* add config directory to .gitignore ([2d8749a](https://github.com/Masutayunikon/FanKarr/commit/2d8749ae7bc2986871fb402c2a4242bcb87d3a77))

## [2.2.0](https://github.com/Masutayunikon/FanKarr/compare/v2.1.3...v2.2.0) (2026-03-23)


### Features

* add organize all button ([bbaccfd](https://github.com/Masutayunikon/FanKarr/commit/bbaccfd97b51724932f2ebf22cad81be1cde61c0))


### Bug Fixes

* organizer reuse the wrong name for gitlab path ([bbaccfd](https://github.com/Masutayunikon/FanKarr/commit/bbaccfd97b51724932f2ebf22cad81be1cde61c0))

## [2.1.3](https://github.com/Masutayunikon/FanKarr/compare/v2.1.2...v2.1.3) (2026-03-23)


### Bug Fixes

* use magnet before torrent ([ed4665a](https://github.com/Masutayunikon/FanKarr/commit/ed4665a378d15c0b45a2be32d612e41082a43df1))

## [2.1.2](https://github.com/Masutayunikon/FanKarr/compare/v2.1.1...v2.1.2) (2026-03-23)


### Bug Fixes

* path now work on every device ([cfc3440](https://github.com/Masutayunikon/FanKarr/commit/cfc3440a95cb73802778e01d5f256f473e0cc952))

## [2.1.1](https://github.com/Masutayunikon/FanKarr/compare/v2.1.0...v2.1.1) (2026-03-23)


### Bug Fixes

* torrent path to hash ([d9e453b](https://github.com/Masutayunikon/FanKarr/commit/d9e453b486b9fd85b69ee134bee2bd6a1a6d3702))

## [2.1.0](https://github.com/Masutayunikon/FanKarr/compare/v2.0.0...v2.1.0) (2026-03-23)


### ⚠ BREAKING CHANGES

* **organize:** le format paths[] dans series/{id}.json passe de string[] à { infohash: string, path: string }[] — nécessite une mise à jour du scraper.

### Bug Fixes

* **organize:** buildFileMap matche par infohash au lieu d'index ou titre ([43ac2ed](https://github.com/Masutayunikon/FanKarr/commit/43ac2ed2e85d9e769735547817f19100d3d7f980))
* **organize:** migration vers paths { infohash, path } pour le matching fichiers ([43ac2ed](https://github.com/Masutayunikon/FanKarr/commit/43ac2ed2e85d9e769735547817f19100d3d7f980))
* **organize:** scanMediaPath adapté au nouveau format paths[] ([43ac2ed](https://github.com/Masutayunikon/FanKarr/commit/43ac2ed2e85d9e769735547817f19100d3d7f980))
* **organize:** source fichier via save_path qBittorrent + fullPath relatif ([43ac2ed](https://github.com/Masutayunikon/FanKarr/commit/43ac2ed2e85d9e769735547817f19100d3d7f980))
* remove logo ([48416c4](https://github.com/Masutayunikon/FanKarr/commit/48416c4fef3a964b05aa135ffd9e80d5dec9a81a))

## [2.0.0](https://github.com/Masutayunikon/FanKarr/compare/v1.14.0...v2.0.0) (2026-03-23)


### ⚠ BREAKING CHANGES

* suppression de torrent_final.json au profit d'un système de fichiers par série (series/{id}.json) avec cache mémoire GitHub 6h. Version majeure — nécessite un nouveau scraper et une mise à jour complète.

### Features

* **api:** adaptation complète à la nouvelle structure API Fankai ([b3fd7dd](https://github.com/Masutayunikon/FanKarr/commit/b3fd7dded40bf067acc8552cbf5f34a57d27000c))
* **api:** cache mémoire GitHub TTL 6h avec invalidation via /api/update ([b3fd7dd](https://github.com/Masutayunikon/FanKarr/commit/b3fd7dded40bf067acc8552cbf5f34a57d27000c))
* **api:** matching torrents par hiérarchie série/saison/épisode ([b3fd7dd](https://github.com/Masutayunikon/FanKarr/commit/b3fd7dded40bf067acc8552cbf5f34a57d27000c))
* migration vers nouvelle architecture API et scraper par série ([b3fd7dd](https://github.com/Masutayunikon/FanKarr/commit/b3fd7dded40bf067acc8552cbf5f34a57d27000c))
* **organize:** refonte complète sans torrent_final.json ([b3fd7dd](https://github.com/Masutayunikon/FanKarr/commit/b3fd7dded40bf067acc8552cbf5f34a57d27000c))
* **scraper:** extraction nom bencode dans raw pour torrents locaux ([b3fd7dd](https://github.com/Masutayunikon/FanKarr/commit/b3fd7dded40bf067acc8552cbf5f34a57d27000c))
* **series-view:** badge "Hors Fankai" sur épisodes de torrents manuels ([b3fd7dd](https://github.com/Masutayunikon/FanKarr/commit/b3fd7dded40bf067acc8552cbf5f34a57d27000c))
* **series-view:** tooltip raw name sur boutons intégrale via :title ([b3fd7dd](https://github.com/Masutayunikon/FanKarr/commit/b3fd7dded40bf067acc8552cbf5f34a57d27000c))


### Bug Fixes

* **catalogue:** état download basé sur épisodes organisés vs torrents bruts ([b3fd7dd](https://github.com/Masutayunikon/FanKarr/commit/b3fd7dded40bf067acc8552cbf5f34a57d27000c))
* **series:** boutons saison Yu-Gi-Oh via fallback season_number ([b3fd7dd](https://github.com/Masutayunikon/FanKarr/commit/b3fd7dded40bf067acc8552cbf5f34a57d27000c))

## [1.14.0](https://github.com/Masutayunikon/FanKarr/compare/v1.13.0...v1.14.0) (2026-03-21)


### Features

* **scraper:** extraction du nom bencode pour les torrents locaux ([67237e9](https://github.com/Masutayunikon/FanKarr/commit/67237e977e34edda4d92a9375de4c4e470725eb1))
* **series-view:** badge "Hors Fankai" sur les épisodes de torrents manuels ([67237e9](https://github.com/Masutayunikon/FanKarr/commit/67237e977e34edda4d92a9375de4c4e470725eb1))
* **series-view:** tooltip avec le nom du torrent sur les boutons intégrale ([67237e9](https://github.com/Masutayunikon/FanKarr/commit/67237e977e34edda4d92a9375de4c4e470725eb1))


### Bug Fixes

* **catalogue:** état "partiel" incorrect quand l'intégrale est organisée ([67237e9](https://github.com/Masutayunikon/FanKarr/commit/67237e977e34edda4d92a9375de4c4e470725eb1))
* **series:** résolution boutons de téléchargement saisons Yu-Gi-Oh et séries similaires ([67237e9](https://github.com/Masutayunikon/FanKarr/commit/67237e977e34edda4d92a9375de4c4e470725eb1))

## [1.13.0](https://github.com/Masutayunikon/FanKarr/compare/v1.12.2...v1.13.0) (2026-03-21)


### Features

* add favicon ([dc4a2d4](https://github.com/Masutayunikon/FanKarr/commit/dc4a2d48f5c0cddd8e431ce33a69fc9146143fb6))
* add README.md ([4eb487a](https://github.com/Masutayunikon/FanKarr/commit/4eb487a96beed8c82cb19d9a9b63c3b69d841386))
* add windows / linux / macos binaries on build ([f17a73b](https://github.com/Masutayunikon/FanKarr/commit/f17a73b9591fb49a75bd5fcdadf1970585877dab))
* **auth:** génération automatique du JWT secret au démarrage ([eaa52e9](https://github.com/Masutayunikon/FanKarr/commit/eaa52e90900ff0e198beae190d7ad0298a702482))
* cache images ([da460de](https://github.com/Masutayunikon/FanKarr/commit/da460de60c4eec6851ea58ce0ae646a1208f6018))
* fix worker for multiple series in integral (one piece fix ?) ([2c773f8](https://github.com/Masutayunikon/FanKarr/commit/2c773f83ffd76d82c77a50a9c5729f20ea22b450))
* initial project ([eaf01cf](https://github.com/Masutayunikon/FanKarr/commit/eaf01cfc591dd72f9b093b533ced6c12a6c490a1))
* make the organizer threaded to not consumme api main thread ([14c0e56](https://github.com/Masutayunikon/FanKarr/commit/14c0e567525e179da82c6b58d9886cc3d544a98d))
* now rename episodes with original_filename from api ([9bdb21a](https://github.com/Masutayunikon/FanKarr/commit/9bdb21a673ebb9871548aea6691bafbd049554ce))
* **organize:** scan initial mediaPath + logs fichier centralisés ([807f786](https://github.com/Masutayunikon/FanKarr/commit/807f786b038579ca9d7cd136998f759cecae2255))
* **organize:** worker thread + badges statut + notifications ([b7242bc](https://github.com/Masutayunikon/FanKarr/commit/b7242bc95f59d259ab1a636aa304bf149f895041))
* **serie:** badges état organisation sur épisodes et saisons ([4d3a6bd](https://github.com/Masutayunikon/FanKarr/commit/4d3a6bd276907f793452429d62693fafc1d804db))
* **ui:** états catalogue + logs + badges erreurs downloads ([5326828](https://github.com/Masutayunikon/FanKarr/commit/5326828d89aa10a53bbe1ac4016a5eee4d5dbc97))
* UX improvements, folder picker, download state & NFO support ([20771fc](https://github.com/Masutayunikon/FanKarr/commit/20771fc31c187fd1fea8aa9b07093b15621a5b85))


### Bug Fixes

* add config.ts with config variable (BASE_DIR...) ([a3eb67c](https://github.com/Masutayunikon/FanKarr/commit/a3eb67c9a0944500142a6636d57cae0acfd7543d))
* add log for debug ([6876c5e](https://github.com/Masutayunikon/FanKarr/commit/6876c5ee6c7734e664a6da4e4bc721cc7c5abdf7))
* add log for debug ([d8cdeae](https://github.com/Masutayunikon/FanKarr/commit/d8cdeae675bc73b5842d18d01eff9d5bb0e0a7e8))
* add target node ([58b09f2](https://github.com/Masutayunikon/FanKarr/commit/58b09f2267345c60ed589c160f7e47698e9be9a4))
* add target node ([6c629e0](https://github.com/Masutayunikon/FanKarr/commit/6c629e0f6b4d38453cfb22fd315e02d9e8750c45))
* add user permissions when the scripts is launched ([501bbfc](https://github.com/Masutayunikon/FanKarr/commit/501bbfcf18c236f7ac382c50d90482b1f51244c1))
* CatalogView.vue badge deleted ([d897192](https://github.com/Masutayunikon/FanKarr/commit/d8971920462efd8d1d99eb867016c96713dfef58))
* config path /config/config to /config ([7518191](https://github.com/Masutayunikon/FanKarr/commit/75181910244621a8eca989067fd4777922914d8e))
* docker errors ([2702764](https://github.com/Masutayunikon/FanKarr/commit/27027642eb55b75adb04446a88e5007e88f75948))
* docker is able to change directory ([af08f7d](https://github.com/Masutayunikon/FanKarr/commit/af08f7d9d4fb2e23c5feac6d33b2ef495f9d91b2))
* empty docker-compose.yml ([303dfd8](https://github.com/Masutayunikon/FanKarr/commit/303dfd85b5d033e2b247fd064ae1ae612fdb49e1))
* entrypoint.sh config directory ([7e4b2fa](https://github.com/Masutayunikon/FanKarr/commit/7e4b2fa60a5946d3220618f13420a07fa57e8e1b))
* export _isBunBinary ([3d43de3](https://github.com/Masutayunikon/FanKarr/commit/3d43de3eb223ec0338e0b9aebffff35e116e00a0))
* improve torrent organization and cleanup logic ([1908cb3](https://github.com/Masutayunikon/FanKarr/commit/1908cb3e8c5b99e91e26735f7cfa3dcd23709df7))
* logger third args ([5abac1e](https://github.com/Masutayunikon/FanKarr/commit/5abac1e11236ed1e8f7f0de7f0cff881d1b60f10))
* nfo settings and add json file when not existing ([0b6bfa6](https://github.com/Masutayunikon/FanKarr/commit/0b6bfa6a81d99353be877ed6d99687ad3d55adbc))
* organize file ([d6550e9](https://github.com/Masutayunikon/FanKarr/commit/d6550e9961789073be1583e03d599afb6d295004))
* organize use torrent hash and not name ([61901f9](https://github.com/Masutayunikon/FanKarr/commit/61901f9014a759e2950311cd96266ea8201fa902))
* path ([7ddd9ca](https://github.com/Masutayunikon/FanKarr/commit/7ddd9cad9271d79a258f45245bf405f13b9d764f))
* path ([0329ee2](https://github.com/Masutayunikon/FanKarr/commit/0329ee27a34038456eb297f07b808de3157d88f4))
* path ([314f817](https://github.com/Masutayunikon/FanKarr/commit/314f817280f39d10eb21c4784f2aea41b9a6d32c))
* port 9898, /config volume, Kaï→Kai matching, NFO pagination GitLab, saison 0 specials, JoJo/Hokuto strict season resolve ([3a278ba](https://github.com/Masutayunikon/FanKarr/commit/3a278ba33388d6ff6f33413d7696d58d0172c953))
* remove user creation in entrypoint.sh ([92d9fa6](https://github.com/Masutayunikon/FanKarr/commit/92d9fa6b01f1e2de1ceb13528afd309b21f9d4cb))
* rename if the torrent name is not the same as the api ([b8fcf71](https://github.com/Masutayunikon/FanKarr/commit/b8fcf71f54ab14e5572a7553d8554b617b4981b7))
* season 0 not clonficting anymore ([635082d](https://github.com/Masutayunikon/FanKarr/commit/635082de00bb42bdeaf20b1654f742ad1c4addbe))
* season 0 resolved is no longer skipped in the worker ([c48ec76](https://github.com/Masutayunikon/FanKarr/commit/c48ec769ba7725327e657366e882498846d0c63f))
* season fallback ([e9b5091](https://github.com/Masutayunikon/FanKarr/commit/e9b5091242d73be77bf6fb525ce2865554e336cc))
* skip excluded folders ([edf806d](https://github.com/Masutayunikon/FanKarr/commit/edf806d9bc48d4de1c3609a4b0405442305d546e))
* title readme align ([8ba3b37](https://github.com/Masutayunikon/FanKarr/commit/8ba3b370d1e2cd1565f9c2453be8706e3c198243))
* use bcryptjs for compilation ([6a6981e](https://github.com/Masutayunikon/FanKarr/commit/6a6981e10a3a9019f49982d7680e562872ee95a5))
* use season number from resolved episodes in priority ([dc48634](https://github.com/Masutayunikon/FanKarr/commit/dc486347193a8066a32d8f0106518abc2b04b7e2))
* worker now work on multiple github files pages ([71784cd](https://github.com/Masutayunikon/FanKarr/commit/71784cd8bd8f3ea5dc7423687b080c1588d70854))
* worker outside the exe ([c2ab58e](https://github.com/Masutayunikon/FanKarr/commit/c2ab58e7b2c34aae09b50dbdfde3277da4c276ff))
* worker outside the exe ([a47c3a4](https://github.com/Masutayunikon/FanKarr/commit/a47c3a43fb5dbbedd87c9ac2d584c3290fcc6097))
* worker path ([3df8def](https://github.com/Masutayunikon/FanKarr/commit/3df8defa5e46b09722a345c7c3a94e91aa16e4d8))
* worker path ([360572b](https://github.com/Masutayunikon/FanKarr/commit/360572b8be64dafbb452dfcb849a40305bf1b8cf))
* workflow directory ([baebd8f](https://github.com/Masutayunikon/FanKarr/commit/baebd8fae146db70ee1cce0c876d2d3bc0f9bf4e))
* workflow directory ([d8405c1](https://github.com/Masutayunikon/FanKarr/commit/d8405c1589f277cd8fdd3e1fd15cc02d98834aa6))
* workflow permmisions ([3620bfb](https://github.com/Masutayunikon/FanKarr/commit/3620bfb71d8c2774b23c097e5e01326099c2f180))

## [1.12.2](https://github.com/Masutayunikon/FanKarr/compare/v1.12.1...v1.12.2) (2026-03-21)


### Bug Fixes

* use season number from resolved episodes in priority ([dc48634](https://github.com/Masutayunikon/FanKarr/commit/dc486347193a8066a32d8f0106518abc2b04b7e2))

## [1.12.1](https://github.com/Masutayunikon/FanKarr/compare/v1.12.0...v1.12.1) (2026-03-21)


### Bug Fixes

* path ([7ddd9ca](https://github.com/Masutayunikon/FanKarr/commit/7ddd9cad9271d79a258f45245bf405f13b9d764f))

## [1.12.0](https://github.com/Masutayunikon/FanKarr/compare/v1.11.10...v1.12.0) (2026-03-21)


### Features

* now rename episodes with original_filename from api ([9bdb21a](https://github.com/Masutayunikon/FanKarr/commit/9bdb21a673ebb9871548aea6691bafbd049554ce))

## [1.11.10](https://github.com/Masutayunikon/FanKarr/compare/v1.11.9...v1.11.10) (2026-03-21)


### Bug Fixes

* improve torrent organization and cleanup logic ([1908cb3](https://github.com/Masutayunikon/FanKarr/commit/1908cb3e8c5b99e91e26735f7cfa3dcd23709df7))
* season 0 not clonficting anymore ([635082d](https://github.com/Masutayunikon/FanKarr/commit/635082de00bb42bdeaf20b1654f742ad1c4addbe))

## [1.11.9](https://github.com/Masutayunikon/FanKarr/compare/v1.11.8...v1.11.9) (2026-03-20)


### Bug Fixes

* season 0 resolved is no longer skipped in the worker ([c48ec76](https://github.com/Masutayunikon/FanKarr/commit/c48ec769ba7725327e657366e882498846d0c63f))

## [1.11.8](https://github.com/Masutayunikon/FanKarr/compare/v1.11.7...v1.11.8) (2026-03-20)


### Bug Fixes

* config path /config/config to /config ([7518191](https://github.com/Masutayunikon/FanKarr/commit/75181910244621a8eca989067fd4777922914d8e))

## [1.11.7](https://github.com/Masutayunikon/FanKarr/compare/v1.11.6...v1.11.7) (2026-03-20)


### Bug Fixes

* worker path ([3df8def](https://github.com/Masutayunikon/FanKarr/commit/3df8defa5e46b09722a345c7c3a94e91aa16e4d8))

## [1.11.6](https://github.com/Masutayunikon/FanKarr/compare/v1.11.5...v1.11.6) (2026-03-20)


### Bug Fixes

* path ([0329ee2](https://github.com/Masutayunikon/FanKarr/commit/0329ee27a34038456eb297f07b808de3157d88f4))

## [1.11.5](https://github.com/Masutayunikon/FanKarr/compare/v1.11.4...v1.11.5) (2026-03-20)


### Bug Fixes

* export _isBunBinary ([3d43de3](https://github.com/Masutayunikon/FanKarr/commit/3d43de3eb223ec0338e0b9aebffff35e116e00a0))

## [1.11.4](https://github.com/Masutayunikon/FanKarr/compare/v1.11.3...v1.11.4) (2026-03-20)


### Bug Fixes

* add config.ts with config variable (BASE_DIR...) ([a3eb67c](https://github.com/Masutayunikon/FanKarr/commit/a3eb67c9a0944500142a6636d57cae0acfd7543d))

## [1.11.3](https://github.com/Masutayunikon/FanKarr/compare/v1.11.2...v1.11.3) (2026-03-20)


### Bug Fixes

* entrypoint.sh config directory ([7e4b2fa](https://github.com/Masutayunikon/FanKarr/commit/7e4b2fa60a5946d3220618f13420a07fa57e8e1b))

## [1.11.2](https://github.com/Masutayunikon/FanKarr/compare/v1.11.1...v1.11.2) (2026-03-20)


### Bug Fixes

* port 9898, /config volume, Kaï→Kai matching, NFO pagination GitLab, saison 0 specials, JoJo/Hokuto strict season resolve ([3a278ba](https://github.com/Masutayunikon/FanKarr/commit/3a278ba33388d6ff6f33413d7696d58d0172c953))

## [1.11.1](https://github.com/Masutayunikon/FanKarr/compare/v1.11.0...v1.11.1) (2026-03-13)


### Bug Fixes

* worker now work on multiple github files pages ([71784cd](https://github.com/Masutayunikon/FanKarr/commit/71784cd8bd8f3ea5dc7423687b080c1588d70854))

## [1.11.0](https://github.com/Masutayunikon/FanKarr/compare/v1.10.3...v1.11.0) (2026-03-13)


### Features

* fix worker for multiple series in integral (one piece fix ?) ([2c773f8](https://github.com/Masutayunikon/FanKarr/commit/2c773f83ffd76d82c77a50a9c5729f20ea22b450))

## [1.10.3](https://github.com/Masutayunikon/FanKarr/compare/v1.10.2...v1.10.3) (2026-03-13)


### Bug Fixes

* worker path ([360572b](https://github.com/Masutayunikon/FanKarr/commit/360572b8be64dafbb452dfcb849a40305bf1b8cf))

## [1.10.2](https://github.com/Masutayunikon/FanKarr/compare/v1.10.1...v1.10.2) (2026-03-13)


### Bug Fixes

* add target node ([58b09f2](https://github.com/Masutayunikon/FanKarr/commit/58b09f2267345c60ed589c160f7e47698e9be9a4))

## [1.10.1](https://github.com/Masutayunikon/FanKarr/compare/v1.10.0...v1.10.1) (2026-03-13)


### Bug Fixes

* add target node ([6c629e0](https://github.com/Masutayunikon/FanKarr/commit/6c629e0f6b4d38453cfb22fd315e02d9e8750c45))

## [1.10.0](https://github.com/Masutayunikon/FanKarr/compare/v1.9.5...v1.10.0) (2026-03-13)


### Features

* add favicon ([dc4a2d4](https://github.com/Masutayunikon/FanKarr/commit/dc4a2d48f5c0cddd8e431ce33a69fc9146143fb6))
* add README.md ([4eb487a](https://github.com/Masutayunikon/FanKarr/commit/4eb487a96beed8c82cb19d9a9b63c3b69d841386))
* add windows / linux / macos binaries on build ([f17a73b](https://github.com/Masutayunikon/FanKarr/commit/f17a73b9591fb49a75bd5fcdadf1970585877dab))
* **auth:** génération automatique du JWT secret au démarrage ([eaa52e9](https://github.com/Masutayunikon/FanKarr/commit/eaa52e90900ff0e198beae190d7ad0298a702482))
* cache images ([da460de](https://github.com/Masutayunikon/FanKarr/commit/da460de60c4eec6851ea58ce0ae646a1208f6018))
* initial project ([eaf01cf](https://github.com/Masutayunikon/FanKarr/commit/eaf01cfc591dd72f9b093b533ced6c12a6c490a1))
* make the organizer threaded to not consumme api main thread ([14c0e56](https://github.com/Masutayunikon/FanKarr/commit/14c0e567525e179da82c6b58d9886cc3d544a98d))
* **organize:** scan initial mediaPath + logs fichier centralisés ([807f786](https://github.com/Masutayunikon/FanKarr/commit/807f786b038579ca9d7cd136998f759cecae2255))
* **organize:** worker thread + badges statut + notifications ([b7242bc](https://github.com/Masutayunikon/FanKarr/commit/b7242bc95f59d259ab1a636aa304bf149f895041))
* **serie:** badges état organisation sur épisodes et saisons ([4d3a6bd](https://github.com/Masutayunikon/FanKarr/commit/4d3a6bd276907f793452429d62693fafc1d804db))
* **ui:** états catalogue + logs + badges erreurs downloads ([5326828](https://github.com/Masutayunikon/FanKarr/commit/5326828d89aa10a53bbe1ac4016a5eee4d5dbc97))
* UX improvements, folder picker, download state & NFO support ([20771fc](https://github.com/Masutayunikon/FanKarr/commit/20771fc31c187fd1fea8aa9b07093b15621a5b85))


### Bug Fixes

* add log for debug ([6876c5e](https://github.com/Masutayunikon/FanKarr/commit/6876c5ee6c7734e664a6da4e4bc721cc7c5abdf7))
* add log for debug ([d8cdeae](https://github.com/Masutayunikon/FanKarr/commit/d8cdeae675bc73b5842d18d01eff9d5bb0e0a7e8))
* add user permissions when the scripts is launched ([501bbfc](https://github.com/Masutayunikon/FanKarr/commit/501bbfcf18c236f7ac382c50d90482b1f51244c1))
* CatalogView.vue badge deleted ([d897192](https://github.com/Masutayunikon/FanKarr/commit/d8971920462efd8d1d99eb867016c96713dfef58))
* docker errors ([2702764](https://github.com/Masutayunikon/FanKarr/commit/27027642eb55b75adb04446a88e5007e88f75948))
* docker is able to change directory ([af08f7d](https://github.com/Masutayunikon/FanKarr/commit/af08f7d9d4fb2e23c5feac6d33b2ef495f9d91b2))
* empty docker-compose.yml ([303dfd8](https://github.com/Masutayunikon/FanKarr/commit/303dfd85b5d033e2b247fd064ae1ae612fdb49e1))
* logger third args ([5abac1e](https://github.com/Masutayunikon/FanKarr/commit/5abac1e11236ed1e8f7f0de7f0cff881d1b60f10))
* nfo settings and add json file when not existing ([0b6bfa6](https://github.com/Masutayunikon/FanKarr/commit/0b6bfa6a81d99353be877ed6d99687ad3d55adbc))
* organize file ([d6550e9](https://github.com/Masutayunikon/FanKarr/commit/d6550e9961789073be1583e03d599afb6d295004))
* organize use torrent hash and not name ([61901f9](https://github.com/Masutayunikon/FanKarr/commit/61901f9014a759e2950311cd96266ea8201fa902))
* path ([314f817](https://github.com/Masutayunikon/FanKarr/commit/314f817280f39d10eb21c4784f2aea41b9a6d32c))
* remove user creation in entrypoint.sh ([92d9fa6](https://github.com/Masutayunikon/FanKarr/commit/92d9fa6b01f1e2de1ceb13528afd309b21f9d4cb))
* rename if the torrent name is not the same as the api ([b8fcf71](https://github.com/Masutayunikon/FanKarr/commit/b8fcf71f54ab14e5572a7553d8554b617b4981b7))
* season fallback ([e9b5091](https://github.com/Masutayunikon/FanKarr/commit/e9b5091242d73be77bf6fb525ce2865554e336cc))
* skip excluded folders ([edf806d](https://github.com/Masutayunikon/FanKarr/commit/edf806d9bc48d4de1c3609a4b0405442305d546e))
* title readme align ([8ba3b37](https://github.com/Masutayunikon/FanKarr/commit/8ba3b370d1e2cd1565f9c2453be8706e3c198243))
* use bcryptjs for compilation ([6a6981e](https://github.com/Masutayunikon/FanKarr/commit/6a6981e10a3a9019f49982d7680e562872ee95a5))
* worker outside the exe ([c2ab58e](https://github.com/Masutayunikon/FanKarr/commit/c2ab58e7b2c34aae09b50dbdfde3277da4c276ff))
* worker outside the exe ([a47c3a4](https://github.com/Masutayunikon/FanKarr/commit/a47c3a43fb5dbbedd87c9ac2d584c3290fcc6097))
* workflow directory ([baebd8f](https://github.com/Masutayunikon/FanKarr/commit/baebd8fae146db70ee1cce0c876d2d3bc0f9bf4e))
* workflow directory ([d8405c1](https://github.com/Masutayunikon/FanKarr/commit/d8405c1589f277cd8fdd3e1fd15cc02d98834aa6))
* workflow permmisions ([3620bfb](https://github.com/Masutayunikon/FanKarr/commit/3620bfb71d8c2774b23c097e5e01326099c2f180))

## [1.9.5](https://github.com/Masutayunikon/FanKarr/compare/v1.9.4...v1.9.5) (2026-03-13)


### Bug Fixes

* worker outside the exe ([c2ab58e](https://github.com/Masutayunikon/FanKarr/commit/c2ab58e7b2c34aae09b50dbdfde3277da4c276ff))

## [1.9.4](https://github.com/Masutayunikon/FanKarr/compare/v1.9.3...v1.9.4) (2026-03-13)


### Bug Fixes

* worker outside the exe ([a47c3a4](https://github.com/Masutayunikon/FanKarr/commit/a47c3a43fb5dbbedd87c9ac2d584c3290fcc6097))

## [1.9.3](https://github.com/Masutayunikon/FanKarr/compare/v1.9.2...v1.9.3) (2026-03-13)


### Bug Fixes

* use bcryptjs for compilation ([6a6981e](https://github.com/Masutayunikon/FanKarr/commit/6a6981e10a3a9019f49982d7680e562872ee95a5))

## [1.9.2](https://github.com/Masutayunikon/FanKarr/compare/v1.9.1...v1.9.2) (2026-03-13)


### Bug Fixes

* workflow directory ([baebd8f](https://github.com/Masutayunikon/FanKarr/commit/baebd8fae146db70ee1cce0c876d2d3bc0f9bf4e))

## [1.9.1](https://github.com/Masutayunikon/FanKarr/compare/v1.9.0...v1.9.1) (2026-03-13)


### Bug Fixes

* workflow directory ([d8405c1](https://github.com/Masutayunikon/FanKarr/commit/d8405c1589f277cd8fdd3e1fd15cc02d98834aa6))
* workflow permmisions ([3620bfb](https://github.com/Masutayunikon/FanKarr/commit/3620bfb71d8c2774b23c097e5e01326099c2f180))

## [1.9.0](https://github.com/Masutayunikon/FanKarr/compare/v1.8.2...v1.9.0) (2026-03-13)


### Features

* add windows / linux / macos binaries on build ([f17a73b](https://github.com/Masutayunikon/FanKarr/commit/f17a73b9591fb49a75bd5fcdadf1970585877dab))

## [1.8.2](https://github.com/Masutayunikon/FanKarr/compare/v1.8.1...v1.8.2) (2026-03-13)


### Bug Fixes

* season fallback ([e9b5091](https://github.com/Masutayunikon/FanKarr/commit/e9b5091242d73be77bf6fb525ce2865554e336cc))

## [1.8.1](https://github.com/Masutayunikon/FanKarr/compare/v1.8.0...v1.8.1) (2026-03-13)


### Bug Fixes

* nfo settings and add json file when not existing ([0b6bfa6](https://github.com/Masutayunikon/FanKarr/commit/0b6bfa6a81d99353be877ed6d99687ad3d55adbc))

## [1.8.0](https://github.com/Masutayunikon/FanKarr/compare/v1.7.3...v1.8.0) (2026-03-12)


### Features

* cache images ([da460de](https://github.com/Masutayunikon/FanKarr/commit/da460de60c4eec6851ea58ce0ae646a1208f6018))

## [1.7.3](https://github.com/Masutayunikon/FanKarr/compare/v1.7.2...v1.7.3) (2026-03-12)


### Bug Fixes

* CatalogView.vue badge deleted ([d897192](https://github.com/Masutayunikon/FanKarr/commit/d8971920462efd8d1d99eb867016c96713dfef58))
* empty docker-compose.yml ([303dfd8](https://github.com/Masutayunikon/FanKarr/commit/303dfd85b5d033e2b247fd064ae1ae612fdb49e1))

## [1.7.2](https://github.com/Masutayunikon/FanKarr/compare/v1.7.1...v1.7.2) (2026-03-12)


### Bug Fixes

* docker is able to change directory ([af08f7d](https://github.com/Masutayunikon/FanKarr/commit/af08f7d9d4fb2e23c5feac6d33b2ef495f9d91b2))

## [1.7.1](https://github.com/Masutayunikon/FanKarr/compare/v1.7.0...v1.7.1) (2026-03-12)


### Bug Fixes

* path ([314f817](https://github.com/Masutayunikon/FanKarr/commit/314f817280f39d10eb21c4784f2aea41b9a6d32c))

## [1.7.0](https://github.com/Masutayunikon/FanKarr/compare/v1.6.0...v1.7.0) (2026-03-12)


### Features

* UX improvements, folder picker, download state & NFO support ([20771fc](https://github.com/Masutayunikon/FanKarr/commit/20771fc31c187fd1fea8aa9b07093b15621a5b85))


### Bug Fixes

* rename if the torrent name is not the same as the api ([b8fcf71](https://github.com/Masutayunikon/FanKarr/commit/b8fcf71f54ab14e5572a7553d8554b617b4981b7))

## [1.6.0](https://github.com/Masutayunikon/FanKarr/compare/v1.5.0...v1.6.0) (2026-03-11)


### Features

* add favicon ([dc4a2d4](https://github.com/Masutayunikon/FanKarr/commit/dc4a2d48f5c0cddd8e431ce33a69fc9146143fb6))

## [1.5.0](https://github.com/Masutayunikon/FanKarr/compare/v1.4.1...v1.5.0) (2026-03-11)


### Features

* **auth:** génération automatique du JWT secret au démarrage ([eaa52e9](https://github.com/Masutayunikon/FanKarr/commit/eaa52e90900ff0e198beae190d7ad0298a702482))

## [1.4.1](https://github.com/Masutayunikon/FanKarr/compare/v1.4.0...v1.4.1) (2026-03-11)


### Bug Fixes

* logger third args ([5abac1e](https://github.com/Masutayunikon/FanKarr/commit/5abac1e11236ed1e8f7f0de7f0cff881d1b60f10))

## [1.4.0](https://github.com/Masutayunikon/FanKarr/compare/v1.3.0...v1.4.0) (2026-03-11)


### Features

* add README.md ([4eb487a](https://github.com/Masutayunikon/FanKarr/commit/4eb487a96beed8c82cb19d9a9b63c3b69d841386))
* **organize:** scan initial mediaPath + logs fichier centralisés ([807f786](https://github.com/Masutayunikon/FanKarr/commit/807f786b038579ca9d7cd136998f759cecae2255))


### Bug Fixes

* title readme align ([8ba3b37](https://github.com/Masutayunikon/FanKarr/commit/8ba3b370d1e2cd1565f9c2453be8706e3c198243))

## [1.3.0](https://github.com/Masutayunikon/FanKarr/compare/v1.2.0...v1.3.0) (2026-03-11)


### Features

* **serie:** badges état organisation sur épisodes et saisons ([4d3a6bd](https://github.com/Masutayunikon/FanKarr/commit/4d3a6bd276907f793452429d62693fafc1d804db))

## [1.2.0](https://github.com/Masutayunikon/FanKarr/compare/v1.1.0...v1.2.0) (2026-03-11)


### Features

* **organize:** worker thread + badges statut + notifications ([b7242bc](https://github.com/Masutayunikon/FanKarr/commit/b7242bc95f59d259ab1a636aa304bf149f895041))
* **ui:** états catalogue + logs + badges erreurs downloads ([5326828](https://github.com/Masutayunikon/FanKarr/commit/5326828d89aa10a53bbe1ac4016a5eee4d5dbc97))

## [1.1.0](https://github.com/Masutayunikon/FanKarr/compare/v1.0.6...v1.1.0) (2026-03-10)


### Features

* make the organizer threaded to not consumme api main thread ([14c0e56](https://github.com/Masutayunikon/FanKarr/commit/14c0e567525e179da82c6b58d9886cc3d544a98d))


### Bug Fixes

* skip excluded folders ([edf806d](https://github.com/Masutayunikon/FanKarr/commit/edf806d9bc48d4de1c3609a4b0405442305d546e))

## [1.0.6](https://github.com/Masutayunikon/FanKarr/compare/v1.0.5...v1.0.6) (2026-03-10)


### Bug Fixes

* remove user creation in entrypoint.sh ([92d9fa6](https://github.com/Masutayunikon/FanKarr/commit/92d9fa6b01f1e2de1ceb13528afd309b21f9d4cb))

## [1.0.5](https://github.com/Masutayunikon/FanKarr/compare/v1.0.4...v1.0.5) (2026-03-10)


### Bug Fixes

* add user permissions when the scripts is launched ([501bbfc](https://github.com/Masutayunikon/FanKarr/commit/501bbfcf18c236f7ac382c50d90482b1f51244c1))

## [1.0.4](https://github.com/Masutayunikon/FanKarr/compare/v1.0.3...v1.0.4) (2026-03-10)


### Bug Fixes

* add log for debug ([6876c5e](https://github.com/Masutayunikon/FanKarr/commit/6876c5ee6c7734e664a6da4e4bc721cc7c5abdf7))
* add log for debug ([d8cdeae](https://github.com/Masutayunikon/FanKarr/commit/d8cdeae675bc73b5842d18d01eff9d5bb0e0a7e8))

## [1.0.3](https://github.com/Masutayunikon/FanKarr/compare/v1.0.2...v1.0.3) (2026-03-10)


### Bug Fixes

* organize file ([d6550e9](https://github.com/Masutayunikon/FanKarr/commit/d6550e9961789073be1583e03d599afb6d295004))

## [1.0.2](https://github.com/Masutayunikon/FanKarr/compare/v1.0.1...v1.0.2) (2026-03-10)


### Bug Fixes

* organize use torrent hash and not name ([61901f9](https://github.com/Masutayunikon/FanKarr/commit/61901f9014a759e2950311cd96266ea8201fa902))

## [1.0.1](https://github.com/Masutayunikon/FanKarr/compare/v1.0.0...v1.0.1) (2026-03-10)


### Bug Fixes

* docker errors ([2702764](https://github.com/Masutayunikon/FanKarr/commit/27027642eb55b75adb04446a88e5007e88f75948))

## 1.0.0 (2026-03-10)


### Features

* initial project ([eaf01cf](https://github.com/Masutayunikon/FanKarr/commit/eaf01cfc591dd72f9b093b533ced6c12a6c490a1))
