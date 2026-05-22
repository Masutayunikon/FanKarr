# Changelog

## [3.16.0](https://github.com/Masutayunikon/FanKarr/compare/v3.15.0...v3.16.0) (2026-05-11)


### Features

* **log:** + de logs sur les erreurs d'import (chemin tenté et fichier du torrent chercher) ([cb28baf](https://github.com/Masutayunikon/FanKarr/commit/cb28baf25d7f24148ed7e13a0a4ea46f085b2ba4))
* **rss:** ajout du rss sur les series ([086ca30](https://github.com/Masutayunikon/FanKarr/commit/086ca3053f5e563d8c3c2bb82379ff45d77a5499))
* **UI/UX:** affichage de la serie et des episodes sur la page download du torrent ([cb28baf](https://github.com/Masutayunikon/FanKarr/commit/cb28baf25d7f24148ed7e13a0a4ea46f085b2ba4))


### Bug Fixes

* **client:** fix de plusieurs torrent et refonte du tableau de compatibilité ([086ca30](https://github.com/Masutayunikon/FanKarr/commit/086ca3053f5e563d8c3c2bb82379ff45d77a5499))
* **docker:** ajout du fichier de versions pour la navbar dans docker lors du build ([cb28baf](https://github.com/Masutayunikon/FanKarr/commit/cb28baf25d7f24148ed7e13a0a4ea46f085b2ba4))
* **download:** le telechargement de saison ne propose plus tout les torrents des episodes de la saisons si la serie n'a que des torrent par episodes ([c9040ea](https://github.com/Masutayunikon/FanKarr/commit/c9040ea68c52e65a656824ccfd101a04a2251edd))
* **import:** les episodes avec une association changé n'apparait plus sur la page serie ([8972679](https://github.com/Masutayunikon/FanKarr/commit/8972679e2588b6e5cd3e9fd53b0223e3d1a6e56c))
* **import:** les imports se font maintenant sur les series sans torrents qui n'avais pas de fichier de catalogue depuis le scraper ([cb28baf](https://github.com/Masutayunikon/FanKarr/commit/cb28baf25d7f24148ed7e13a0a4ea46f085b2ba4))
* **import:** on ne peux plus importer plusieurs fichiers sur le meme episodes, celui deja importé ce retire de l'importation dans le modal ([ad829c0](https://github.com/Masutayunikon/FanKarr/commit/ad829c0a99b29ade7eba4673b1218c0ab768a2d7))
* **import:** si on change un fichier son association alors il est bien retirer de l'import ([ad829c0](https://github.com/Masutayunikon/FanKarr/commit/ad829c0a99b29ade7eba4673b1218c0ab768a2d7))
* les torrents n'utilise plus la pause ([cb28baf](https://github.com/Masutayunikon/FanKarr/commit/cb28baf25d7f24148ed7e13a0a4ea46f085b2ba4))
* **rss:** le rss est maintenant sur les ajout apres l'activation de la surveillance ([a5e2aa0](https://github.com/Masutayunikon/FanKarr/commit/a5e2aa0da1b3af445a102d1acd77a3a08017689a))
* **UI/UX:** la bar de progression de saison a été retirer et les bars de progression s'affiche meme si le fichier est à 0% dans le torrent ([f07b608](https://github.com/Masutayunikon/FanKarr/commit/f07b608288afd4b01079367b428123b72182b714))
* **UI/UX:** retour sur le modal d'import et refresh ([a5e2aa0](https://github.com/Masutayunikon/FanKarr/commit/a5e2aa0da1b3af445a102d1acd77a3a08017689a))
* **UI/UX:** retour visuel lors de l'import d'une serie/episode ([cb28baf](https://github.com/Masutayunikon/FanKarr/commit/cb28baf25d7f24148ed7e13a0a4ea46f085b2ba4))
* utilisation de URLSearchParams pour les appels autre que pour le add du fichier .torrent ([42c9795](https://github.com/Masutayunikon/FanKarr/commit/42c979536b51e8ed263b23559b7c4a2d4d2b2902))

## [3.15.0](https://github.com/Masutayunikon/FanKarr/compare/v3.14.6...v3.15.0) (2026-05-10)


### Features

* ajout build docker pour arm32 ([950a2ab](https://github.com/Masutayunikon/FanKarr/commit/950a2abc49fe0b7b5bcc0f47d781a45a01838ec3))

## [3.14.6](https://github.com/Masutayunikon/FanKarr/compare/v3.14.5...v3.14.6) (2026-05-08)


### Bug Fixes

* pnpm build ([fcb176d](https://github.com/Masutayunikon/FanKarr/commit/fcb176d519b1bff49c40b79192e71b6062671998))

## [3.14.5](https://github.com/Masutayunikon/FanKarr/compare/v3.14.4...v3.14.5) (2026-05-08)


### Bug Fixes

* pnpm build ([d04ca79](https://github.com/Masutayunikon/FanKarr/commit/d04ca79e0057e3d6cf92e49822d812266f629dba))

## [3.14.4](https://github.com/Masutayunikon/FanKarr/compare/v3.14.3...v3.14.4) (2026-05-08)


### Bug Fixes

* lock file for build ([ef527c2](https://github.com/Masutayunikon/FanKarr/commit/ef527c2072a93650f9159de12ae875a671fb845c))

## [3.14.3](https://github.com/Masutayunikon/FanKarr/compare/v3.14.2...v3.14.3) (2026-05-08)


### Bug Fixes

* build binaries node version ([6d8ea36](https://github.com/Masutayunikon/FanKarr/commit/6d8ea36260cb76e0592bbee3ce5450d2424b9209))

## [3.14.2](https://github.com/Masutayunikon/FanKarr/compare/v3.14.1...v3.14.2) (2026-05-07)


### Bug Fixes

* build binaries node version ([9ebaca9](https://github.com/Masutayunikon/FanKarr/commit/9ebaca92f18213fd6a79bf55f22cfb8358c4f7e0))

## [3.14.1](https://github.com/Masutayunikon/FanKarr/compare/v3.14.0...v3.14.1) (2026-05-07)


### Bug Fixes

* eslint build ([25ab373](https://github.com/Masutayunikon/FanKarr/commit/25ab373539c20942202e82cf678e5b7577ff0027))

## [3.14.0](https://github.com/Masutayunikon/FanKarr/compare/v3.13.2...v3.14.0) (2026-05-07)


### Features

* **qbittorrent:** support API key authentication (≥5.2.0) ([702847a](https://github.com/Masutayunikon/FanKarr/commit/702847a5c2eb5956f54a8475fefc80a08fca70f1))
* **qbittorrent:** support cookie name (≥5.2.0) ([aa8b500](https://github.com/Masutayunikon/FanKarr/commit/aa8b500f57efb97aae10eb0bd8e254388a8aff42))


### Bug Fixes

* ajout de log pour le cookie ([2b3fd79](https://github.com/Masutayunikon/FanKarr/commit/2b3fd79a92bbc7d7ed2142b7a23e03799efe0a28))
* cookie ([7da5a8d](https://github.com/Masutayunikon/FanKarr/commit/7da5a8d4e853f7e92770f20352478a76ee91642d))
* le bouton rename n'apparait plus quand on utilise differents torrents entre les épisode ([105cc05](https://github.com/Masutayunikon/FanKarr/commit/105cc05bdf38127089869ea201165ac1d3479275))
* on ne vois plus le telechargement de fichier qui ont une priorité basse (ne pas télécharger) ([1f50f9a](https://github.com/Masutayunikon/FanKarr/commit/1f50f9ae72ec9958bfb92b2e6936c699e19272f3))
* renaming dans le managements des series ([1e92934](https://github.com/Masutayunikon/FanKarr/commit/1e92934f531c82b9da90c8597ec08cd162b5a9ee))
* renaming dans le managements des series ([bf3f303](https://github.com/Masutayunikon/FanKarr/commit/bf3f30356e086d310b7213b267356bc20976589c))
* rtorrent priority default to 1 ([bfabf9b](https://github.com/Masutayunikon/FanKarr/commit/bfabf9b7937f055579add331cd918a13f05084bf))

## [3.13.2](https://github.com/Masutayunikon/FanKarr/compare/v3.13.1...v3.13.2) (2026-05-06)


### Bug Fixes

* le bouton rename n'apparait plus quand on utilise differents torrents entre les épisode ([0d5d44a](https://github.com/Masutayunikon/FanKarr/commit/0d5d44a4840df27d8b23bde9935d12c664d5ad6c))

## [3.13.1](https://github.com/Masutayunikon/FanKarr/compare/v3.13.0...v3.13.1) (2026-05-06)


### Bug Fixes

* ajout du champ wiki dans l'api ([95d2b27](https://github.com/Masutayunikon/FanKarr/commit/95d2b270dcb3052b65f5918ec770799b43316cd6))

## [3.13.0](https://github.com/Masutayunikon/FanKarr/compare/v3.12.1...v3.13.0) (2026-05-06)


### Features

* ajout de la mise a jour des id's ([39463bf](https://github.com/Masutayunikon/FanKarr/commit/39463bfbcb74c7241420504ba51bd91108df20e4))
* ajout de la prise en charges des codex ([83437de](https://github.com/Masutayunikon/FanKarr/commit/83437def32618c8a5b9ca4364db992762b9359f8))
* **organize:** vérification de complétion par fichier avant d'importer ([2a77a38](https://github.com/Masutayunikon/FanKarr/commit/2a77a38655dcc307e36371422f8698e33fd73135))
* **serie:** badges épisodes et chapitres extraits du synopsis ([2a77a38](https://github.com/Masutayunikon/FanKarr/commit/2a77a38655dcc307e36371422f8698e33fd73135))
* **serie:** lien wiki dans le header de la série si serie.wiki est défini ([2a77a38](https://github.com/Masutayunikon/FanKarr/commit/2a77a38655dcc307e36371422f8698e33fd73135))
* **torrent-clients:** ajout du driver Real-Debrid ([2a77a38](https://github.com/Masutayunikon/FanKarr/commit/2a77a38655dcc307e36371422f8698e33fd73135))


### Bug Fixes

* ajout de log ([d299b76](https://github.com/Masutayunikon/FanKarr/commit/d299b76bd3fc8a8411e71f9f05318901df8372ef))
* **organize:** retry EBUSY sur unlink — 5 tentatives × 500 ms (Windows) ([2a77a38](https://github.com/Masutayunikon/FanKarr/commit/2a77a38655dcc307e36371422f8698e33fd73135))
* **organize:** suppression des entrées orphelines lors de la migration d'IDs ([2a77a38](https://github.com/Masutayunikon/FanKarr/commit/2a77a38655dcc307e36371422f8698e33fd73135))
* progression ([35655d7](https://github.com/Masutayunikon/FanKarr/commit/35655d7784025c9b2d7f992b24181d62b8488130))
* **qbittorrent:** FanKarr télécharge le .torrent et l'uploade directement à qBit ([434da54](https://github.com/Masutayunikon/FanKarr/commit/434da54ede8ece06c1fbcf4d66fe6ecdf87557a5))
* **qbittorrent:** pause uniquement pour les .torrent, pas pour les magnets ([9f90b6a](https://github.com/Masutayunikon/FanKarr/commit/9f90b6ab6c0aa97e33244d827370492abcfe9a13))
* **qbittorrent:** suppression de paused/stopped à l'ajout du torrent ([2a77a38](https://github.com/Masutayunikon/FanKarr/commit/2a77a38655dcc307e36371422f8698e33fd73135))
* **serie:** header mobile — items-start + aspect-[2/3] sur le poster ([2a77a38](https://github.com/Masutayunikon/FanKarr/commit/2a77a38655dcc307e36371422f8698e33fd73135))
* utilisation de formated_name depuis les paths ([39463bf](https://github.com/Masutayunikon/FanKarr/commit/39463bfbcb74c7241420504ba51bd91108df20e4))

## [3.12.1](https://github.com/Masutayunikon/FanKarr/compare/v3.12.0...v3.12.1) (2026-04-29)


### Bug Fixes

* **UI/UX:** ajout d'un modal de confirmation lors de l'activation des nfo ([8b98b0e](https://github.com/Masutayunikon/FanKarr/commit/8b98b0edf926ba6b542501afdf524050d72f043b))

## [3.12.0](https://github.com/Masutayunikon/FanKarr/compare/v3.11.5...v3.12.0) (2026-04-29)


### Features

* désimport saison/série avec modal, refonte UX épisodes, fix sélection fichier qBit/Transmission ([2446622](https://github.com/Masutayunikon/FanKarr/commit/24466228ef5305c36574f58fb2590aee8ee86e13))
* désimport saison/série avec modal, refonte UX épisodes, fix sélection fichier qBit/Transmission ([fcb1b88](https://github.com/Masutayunikon/FanKarr/commit/fcb1b88870bebb1bf0b4e484b2462e56ab3975fc))
* désimport saison/série avec modal, refonte UX épisodes, fix sélection fichier qBit/Transmission ([3fb4119](https://github.com/Masutayunikon/FanKarr/commit/3fb4119c79908c1023f3cbf9999b524eb1bc267e))


### Bug Fixes

* qbitorrent ([9834023](https://github.com/Masutayunikon/FanKarr/commit/98340235226394c4583159f36cce74e316eedf26))
* qbitorrent header ([f5094c6](https://github.com/Masutayunikon/FanKarr/commit/f5094c68c6834f816b0b6d019e5d5637400e16ab))
* spinner infinie apres supression ([39d2f99](https://github.com/Masutayunikon/FanKarr/commit/39d2f996aecb9f07dcd8c1ec7911090276908a2f))
* spinner infinie apres supression ([97c573c](https://github.com/Masutayunikon/FanKarr/commit/97c573cc1d4fb76787ba5d1df4fda30faec5fbf2))
* **UI/UX:** chevron pour ouvrir la description, bouton desimporter de la serie passer à supprimer et affichage de toute la description de la serie lors d'un clique ([f6ef818](https://github.com/Masutayunikon/FanKarr/commit/f6ef818e60875a1ac5d859480c1e0e53082c0858))
* **UI/UX:** meilleur comprehension des parametres avancés des clients ([040a8d7](https://github.com/Masutayunikon/FanKarr/commit/040a8d7b339090d819c6e3dc049f1ab9d8b221f5))

## [3.11.5](https://github.com/Masutayunikon/FanKarr/compare/v3.11.4...v3.11.5) (2026-04-26)


### Bug Fixes

* le folder picker affiche tous les disques depuis le bouton homes sous windows ([7149022](https://github.com/Masutayunikon/FanKarr/commit/7149022c8701f79d194c675da87c6cb2d5793a35))

## [3.11.4](https://github.com/Masutayunikon/FanKarr/compare/v3.11.3...v3.11.4) (2026-04-26)


### Bug Fixes

* ajout de la mise a jour des noms toutes les 1h ([0fe5c8c](https://github.com/Masutayunikon/FanKarr/commit/0fe5c8ccb7ecdc1643b5e69de3957c39dfd8085e))

## [3.11.3](https://github.com/Masutayunikon/FanKarr/compare/v3.11.2...v3.11.3) (2026-04-26)


### Bug Fixes

* dockerfile node version to 22 ([5983494](https://github.com/Masutayunikon/FanKarr/commit/598349407750c729579bd639680ebc6a8ebcc12f))

## [3.11.2](https://github.com/Masutayunikon/FanKarr/compare/v3.11.1...v3.11.2) (2026-04-26)


### Bug Fixes

* ajout de undici dans le package.json ([459e602](https://github.com/Masutayunikon/FanKarr/commit/459e602c1df1c610466be5015a660624b1189620))

## [3.11.1](https://github.com/Masutayunikon/FanKarr/compare/v3.11.0...v3.11.1) (2026-04-26)


### Bug Fixes

* le setup plex peux maintenant etre utilisé sur un serveur local (probleme de certificat) ([6907584](https://github.com/Masutayunikon/FanKarr/commit/69075842be396b149949b158922a9dc84dbc7ccf))

## [3.11.0](https://github.com/Masutayunikon/FanKarr/compare/v3.10.0...v3.11.0) (2026-04-23)


### Features

* ajout d'un bouton pour supprimer les nfo / png ([bf0989d](https://github.com/Masutayunikon/FanKarr/commit/bf0989db17ebb83045ed8d2d1f3f8b11fbd3f2f5))
* ajout de log pour le bouton tout renommer ([bf0989d](https://github.com/Masutayunikon/FanKarr/commit/bf0989db17ebb83045ed8d2d1f3f8b11fbd3f2f5))
* ajout du support multifile sur utorrent ([bf0989d](https://github.com/Masutayunikon/FanKarr/commit/bf0989db17ebb83045ed8d2d1f3f8b11fbd3f2f5))


### Bug Fixes

* renommage d'episodes qui ne fonctionne pas en 1 par 1 ([bf0989d](https://github.com/Masutayunikon/FanKarr/commit/bf0989db17ebb83045ed8d2d1f3f8b11fbd3f2f5))

## [3.10.0](https://github.com/Masutayunikon/FanKarr/compare/v3.9.2...v3.10.0) (2026-04-22)


### Features

* ajout d'une variable d'environment pour augmenter la durée du token ou le desactiver avec "never" ou 0 ([dc5387c](https://github.com/Masutayunikon/FanKarr/commit/dc5387c69a308bdf99f0b77f9769462ffda13db5))
* ajout des telechargments par episodes / saisons ([d6e3c99](https://github.com/Masutayunikon/FanKarr/commit/d6e3c9963c9db5fedc579377cbad485f25ab0537))
* ajout du .env dans les dossiers du binaires pour pouvoir changer leur valeurs ([dc5387c](https://github.com/Masutayunikon/FanKarr/commit/dc5387c69a308bdf99f0b77f9769462ffda13db5))
* ajout du langage ([94e7b66](https://github.com/Masutayunikon/FanKarr/commit/94e7b668e13c8406768a84e7a821e2fd7fdc96fc))
* update readme ([01e70ed](https://github.com/Masutayunikon/FanKarr/commit/01e70ed9c00f8c614a6a9947466e17a5128f52db))
* utilisation des bar de telechargement par fichier dans le torrent plutot que celui du torrent ([d03f0ac](https://github.com/Masutayunikon/FanKarr/commit/d03f0ac397acd117b75a92b6763441a667f4e6cb))


### Bug Fixes

* affichage de la bar de progression et confirmation sur le bouton pour les episodes en doublons ([23be797](https://github.com/Masutayunikon/FanKarr/commit/23be797f97b1e49723140cdd34d0d217a0e819a3))
* affichage de la bar de progression et confirmation sur le bouton pour les episodes en doublons et dropdown ([95d4b01](https://github.com/Masutayunikon/FanKarr/commit/95d4b015eeb0298f77cfe5828f7a14d15fb77dd5))
* ajout des boutons pour les episodes sans torrent ([94048e4](https://github.com/Masutayunikon/FanKarr/commit/94048e458248a43e50c566e01d985105ee850ec3))
* bouton global de serie ([93a3505](https://github.com/Masutayunikon/FanKarr/commit/93a35055467cfab2503f6b0dfefcce8cd3f53559))
* bouton tous telecharger a la place de integral, multi torrents sur le bouton saisons et tous telecharger ([02dd4c8](https://github.com/Masutayunikon/FanKarr/commit/02dd4c866ad4c396b324c5185e2b9458d8864b58))
* changer les badge de language pour un truc plus explicite ([94a1ed1](https://github.com/Masutayunikon/FanKarr/commit/94a1ed1fe3cb9e49f90c8fbc200aaac969895dff))
* coherence des badges ([5d84737](https://github.com/Masutayunikon/FanKarr/commit/5d84737a28c2d0c49e8acce6ccd7a7bf915e1309))
* dropdown overflow ([5baf707](https://github.com/Masutayunikon/FanKarr/commit/5baf7072207eca1f62a42c13602c2fdc85d6e54f))
* dropdown overflow ([f820ea0](https://github.com/Masutayunikon/FanKarr/commit/f820ea0cf252cbc11c527f1393e332b9acd274fe))
* fallback de noms si les noms de torrents se ressemble il fallback sur les noms dans nyaa ([59fb769](https://github.com/Masutayunikon/FanKarr/commit/59fb7693a4726fc31223373559404f63b6963340))
* improve container detection to support Podman and other runtimes ([7d6c86f](https://github.com/Masutayunikon/FanKarr/commit/7d6c86f888b4b7c5696a5de21bce12d1864035a2))
* le dropdown apparait sur le bouton de telechargement et pas les 3 petit points pour les multiples ([eaf733f](https://github.com/Masutayunikon/FanKarr/commit/eaf733f2e5caccf10a2f30a0e10db00831d6d635))
* les fichiers non selectionner sur un torrent ne produise plus d'erreurs d'import ([2a08d7d](https://github.com/Masutayunikon/FanKarr/commit/2a08d7dbf5a8a91323801e9fa3722dfb02a7cd5e))
* les fichiers non selectionner sur un torrent ne sont plus en "attente d'import" sur l'affichage de la serie ([7799f7d](https://github.com/Masutayunikon/FanKarr/commit/7799f7de86d0a207c960f72fa8e8db84de86d2a8))
* les torrents sont stopé lors de la selection de fichier pour eviter qu'il commence le telechargement des autres fichiers avant de set les indexs ([45d340d](https://github.com/Masutayunikon/FanKarr/commit/45d340d01ab8507423b187447d0f0e36a75d21d4))
* les torrents sont stopé lors de la selection de fichier pour eviter qu'il commence le telechargement des autres fichiers avant de set les indexs ([cdfb330](https://github.com/Masutayunikon/FanKarr/commit/cdfb330dd6ac20d2bfe02d196a8d94f0996c763c))
* n'affiche plus tous les épisodes en train de se telecharger si seulement un fichier est selectionner ([c4bfa2b](https://github.com/Masutayunikon/FanKarr/commit/c4bfa2ba87167bf20c066b3f682bd70aa9b18467))
* n'affiche plus tous les épisodes en train de se telecharger si seulement un fichier est selectionner ([1e4f735](https://github.com/Masutayunikon/FanKarr/commit/1e4f73522dd216d80c57839bd35c15dcc906bf90))
* ne retire pas les fichiers quand on en ajoute sur le torrent ([5c1ae3e](https://github.com/Masutayunikon/FanKarr/commit/5c1ae3e7beb59dcc2769bddb0fa63266e10bcbab))
* prise en charge de multiple torrent sur les telechargement d'episodes ([dc5387c](https://github.com/Masutayunikon/FanKarr/commit/dc5387c69a308bdf99f0b77f9769462ffda13db5))
* qbit utilisation de /start au lieu de /resume pour la v5 ([98a3d81](https://github.com/Masutayunikon/FanKarr/commit/98a3d81c4882ed4e8db1047b2b8c5edddbe037b2))
* utilisation de svg pour les drapeau ([c11287b](https://github.com/Masutayunikon/FanKarr/commit/c11287bd3fd88badc91d35b5ec825b09ff5237a1))
* utilisation des noms de dossier du torrent pour l'affichage plutot que le nom sur nyaa (notament pour gto kai qui a plusieurs integral et qui est plus explicite qque le nom nyaa) ([4069035](https://github.com/Masutayunikon/FanKarr/commit/4069035956472bf179a3a9bb8bd317d6cce8dc13))
* utilisation du fichier torrent avec le magnet pour les bug de metadonnées ([dc5387c](https://github.com/Masutayunikon/FanKarr/commit/dc5387c69a308bdf99f0b77f9769462ffda13db5))

## [3.9.2](https://github.com/Masutayunikon/FanKarr/compare/v3.9.1...v3.9.2) (2026-04-16)


### Bug Fixes

* le bouton "tous télécharger" ne s'affiche plus si la series de contient que des integrales comme torrent ([d21270a](https://github.com/Masutayunikon/FanKarr/commit/d21270ae802ee43242365331922393b5cbf689fa))

## [3.9.1](https://github.com/Masutayunikon/FanKarr/compare/v3.9.0...v3.9.1) (2026-04-16)


### Bug Fixes

* le badge de rename utilise la meme logique que coté serveur et n'apparait plus sur les vue series si il ne devrais pas ([9764d2d](https://github.com/Masutayunikon/FanKarr/commit/9764d2db8ed2531af3feb6ceba947eaf116c1e76))

## [3.9.0](https://github.com/Masutayunikon/FanKarr/compare/v3.8.1...v3.9.0) (2026-04-15)


### Features

* ajout d'un bouton supprimé l'importation dans le menu d'importation d'une serie ([286106e](https://github.com/Masutayunikon/FanKarr/commit/286106ef1eed2803cf14549af7a172b13b9c2b88))
* ajout de badge quand le fichier est introuvable ([286106e](https://github.com/Masutayunikon/FanKarr/commit/286106ef1eed2803cf14549af7a172b13b9c2b88))
* ajout de la possibilité de renommer des imports dans le bon format ([67444d4](https://github.com/Masutayunikon/FanKarr/commit/67444d418d65cf0d0323c8955adb8d9e136a8797))
* ajout du bouton suppresion de torrent en cours ([286106e](https://github.com/Masutayunikon/FanKarr/commit/286106ef1eed2803cf14549af7a172b13b9c2b88))
* ajout setup plex ([2123e73](https://github.com/Masutayunikon/FanKarr/commit/2123e73b7fec9c637b349e63da9c9a88dd9fccd6))
* bouton tous télécharger sur les saisons et series ([286106e](https://github.com/Masutayunikon/FanKarr/commit/286106ef1eed2803cf14549af7a172b13b9c2b88))
* suppression des series supprimé ([286106e](https://github.com/Masutayunikon/FanKarr/commit/286106ef1eed2803cf14549af7a172b13b9c2b88))


### Bug Fixes

* ajout d'un loader sur certaines pages pour pas avoir des trucs par default qui s'affiche ([d241be3](https://github.com/Masutayunikon/FanKarr/commit/d241be30d126f5b975aca72d2c21ab74e7215fa4))
* ajout de la page management dans le layout ([5dc0531](https://github.com/Masutayunikon/FanKarr/commit/5dc0531bfd50ac9ca5a59126670757179ed8a226))
* cast string ([16d1bfe](https://github.com/Masutayunikon/FanKarr/commit/16d1bfe7e7766987876db80f84e6c0dc31217403))
* Deux corrections : ([5398a4f](https://github.com/Masutayunikon/FanKarr/commit/5398a4fe12b1ac235884bb9c6218174b0c438ac1))
* le bouton tout telecharger apparait sur les packs de saisons et les integrals + autres et pas que sur les series avec des episodes telechargable ([e105587](https://github.com/Masutayunikon/FanKarr/commit/e105587147e03e39e2c3b985a114434c2512417a))
* move plex settings en haut des boutons ([96af23d](https://github.com/Masutayunikon/FanKarr/commit/96af23d258e14dacf371b043b92b554c2b22f80c))
* plex catcher ([ba0dc8d](https://github.com/Masutayunikon/FanKarr/commit/ba0dc8d21bca098b0203f9553d81a47048fad452))
* suppression de dest_filename du fichier d'organisation qui est faux et ne sert à rien ([3c69eba](https://github.com/Masutayunikon/FanKarr/commit/3c69eba440f4f83180bd5d3f25a2ad0499b91940))
* utorrent prend desormais le dossier cible correctement ([cc68fef](https://github.com/Masutayunikon/FanKarr/commit/cc68fef88d6e13339867f6b6b47667a141a86091))
* wrong file copy ([fa7da76](https://github.com/Masutayunikon/FanKarr/commit/fa7da7681193e89214a521c5bd16106f0ca03f46))

## [3.8.1](https://github.com/Masutayunikon/FanKarr/compare/v3.8.0...v3.8.1) (2026-04-11)


### Bug Fixes

* la version dev se met uniquement en dev ([79e5478](https://github.com/Masutayunikon/FanKarr/commit/79e547859720f36330d95036de813240da034bbd))

## [3.8.0](https://github.com/Masutayunikon/FanKarr/compare/v3.7.1...v3.8.0) (2026-04-11)


### Features

* force release for test ([d921fc1](https://github.com/Masutayunikon/FanKarr/commit/d921fc16d6b19d8aeb354fc3a5fc533afc81cb5b))

## [3.7.1](https://github.com/Masutayunikon/FanKarr/compare/v3.7.0...v3.7.1) (2026-04-11)


### Bug Fixes

* ajout de la copy dans le worker ([a7d4488](https://github.com/Masutayunikon/FanKarr/commit/a7d44886ddb4c5ca4e12bfa5dbb15e115257d9c8))

## [3.7.0](https://github.com/Masutayunikon/FanKarr/compare/v3.6.1...v3.7.0) (2026-04-11)


### Features

* activation de l'import manuel ([9712644](https://github.com/Masutayunikon/FanKarr/commit/971264446c45401f5aaa3b3acae0fab6cae15264))
* ajout d'une "notification" dans la navbar si une nouvelle versions est disponible ([9712644](https://github.com/Masutayunikon/FanKarr/commit/971264446c45401f5aaa3b3acae0fab6cae15264))
* ajout d'une hashmap pour matcher les titres sur synologie et ajouter les hash de torrent manuellement ([3b8c448](https://github.com/Masutayunikon/FanKarr/commit/3b8c448ea0b0917e40d493ad4bf0e81cd35dff5a))
* ajout de l'option supprimé le torrent si l'option déplacer est activé ([3e83dc0](https://github.com/Masutayunikon/FanKarr/commit/3e83dc0d79107e46cac14f73dd3ef04794ad824d))
* ajout de la suppression des torrents depuis l'interface ([3e83dc0](https://github.com/Masutayunikon/FanKarr/commit/3e83dc0d79107e46cac14f73dd3ef04794ad824d))
* ajout du bouton copie ([3e83dc0](https://github.com/Masutayunikon/FanKarr/commit/3e83dc0d79107e46cac14f73dd3ef04794ad824d))
* ajout du ratio, upload speed, etc dans les activités ([ee34a53](https://github.com/Masutayunikon/FanKarr/commit/ee34a5350086dcd7e783f9c14ca60e09c60eb032))
* edit d'episodes importer dans le menu d'importation ([3017cac](https://github.com/Masutayunikon/FanKarr/commit/3017cac67a5d3f5ccb9f153f233a446b0afaaec8))


### Bug Fixes

* ajout de l'option de suppresion dans l'interface settings.ts ([a70e65f](https://github.com/Masutayunikon/FanKarr/commit/a70e65f0e4323369d1fd7401665fb3033352a286))
* ajout de logs lors de non match ([0c6c802](https://github.com/Masutayunikon/FanKarr/commit/0c6c802cbfdf297df40aa5944eacf16f58489bd1))
* ajout des series non disponible pour pouvoir les add manuellement ([9e0664a](https://github.com/Masutayunikon/FanKarr/commit/9e0664aa49d6f99be8ca7e7bbd7c8e7cec0f9e7c))
* changer le noms de build arm64 et windows legacy pour une meilleur comprehension ([47d81e6](https://github.com/Masutayunikon/FanKarr/commit/47d81e692d866beedf80a6c46317dfe79213547d))
* formatage ([82a61eb](https://github.com/Masutayunikon/FanKarr/commit/82a61ebe74b8196891a50c1380ffaa89178c1fd1))
* formatage ([f6b384e](https://github.com/Masutayunikon/FanKarr/commit/f6b384ec49bf018e23eb0a0b15917aee4578d66e))
* l'import a le meme comportement que radarr/sonarr en ouvrant l'import dans le dossier de la serie attendu directement ([1485efe](https://github.com/Masutayunikon/FanKarr/commit/1485efe053d3281521978bb2d29a6c9ce219c2fd))
* les series sans torrent et non ajoutées manuellement sont bien grisé ([2bdafd8](https://github.com/Masutayunikon/FanKarr/commit/2bdafd8e377d1a957903f228c61c1f3ab3a45955))
* les series sans torrent et non ajoutées manuellement sont bien grisé ([d854247](https://github.com/Masutayunikon/FanKarr/commit/d854247b7fe6d5e01b0803ff7d415aba431c4f0d))
* les series sans torrents sont bien organiser si importé manuellement ([6ed77c1](https://github.com/Masutayunikon/FanKarr/commit/6ed77c1196c45e57dbd989cc049f42403f522821))
* les series sans torrents sont bien organiser si importé manuellement ([bc10889](https://github.com/Masutayunikon/FanKarr/commit/bc1088903053b7b98cabbe24c9cdcb8ac4c489b2))
* log ([ef4b364](https://github.com/Masutayunikon/FanKarr/commit/ef4b3643c2852500f048ee330b92d60fed4b5ba5))
* organisation utilise l'extension du fichier au lieu de tester si ça existe ([2b7bf48](https://github.com/Masutayunikon/FanKarr/commit/2b7bf4808e4a11d450403f477ea3031add8a2ebc))
* settings ([60a548f](https://github.com/Masutayunikon/FanKarr/commit/60a548f6bd658fe9986d94c094cad0fbed103882))
* type ([f4305b5](https://github.com/Masutayunikon/FanKarr/commit/f4305b537f2ab0a1370445eae9e9150a34e44e86))
* type ([bdfe74b](https://github.com/Masutayunikon/FanKarr/commit/bdfe74bb8132b6bff0b14ccb135bb3b90f3441b6))
* vue des series importer ([6786cb5](https://github.com/Masutayunikon/FanKarr/commit/6786cb50f4c50b95f1dcd48d15742b1ae6602ed5))
* vue des series importer ([50efd74](https://github.com/Masutayunikon/FanKarr/commit/50efd74a5b918c4ff61e7d4feac2643693db1861))

## [3.6.1](https://github.com/Masutayunikon/FanKarr/compare/v3.6.0...v3.6.1) (2026-04-10)


### Bug Fixes

* windows baseline ([0469031](https://github.com/Masutayunikon/FanKarr/commit/0469031ff05c8794b20f73bc7c3ac417ab473e5d))

## [3.6.0](https://github.com/Masutayunikon/FanKarr/compare/v3.5.0...v3.6.0) (2026-04-10)


### Features

* ajout d'un exe pour les cpu non avx2 ([51aacaf](https://github.com/Masutayunikon/FanKarr/commit/51aacafbcb0de1ca6a8b496c0905aa4e831d6008))

## [3.5.0](https://github.com/Masutayunikon/FanKarr/compare/v3.4.0...v3.5.0) (2026-04-09)


### Features

* add uttorent driver ([712db87](https://github.com/Masutayunikon/FanKarr/commit/712db87a77be4dec157c3addb5bc12b1ac2bc124))
* ajout d'information dans le fichier d'organisation pour l'organisation manuel plus tard ([7376306](https://github.com/Masutayunikon/FanKarr/commit/73763066b900a246910481d6ac06a4991959396d))
* ajout d'un bouton refresh ([48f86ea](https://github.com/Masutayunikon/FanKarr/commit/48f86ea9cc36ded75f02fa3879a7d3bd2640fb70))
* ajout de synology downloader comme client ([eefa216](https://github.com/Masutayunikon/FanKarr/commit/eefa216da5ed6428b982ded31ab696623e9e5806))
* Ajout des mapping sur les clients ([eefa216](https://github.com/Masutayunikon/FanKarr/commit/eefa216da5ed6428b982ded31ab696623e9e5806))
* ajout des parametres dossier de téléchargements pour les clients torrent ([eefa216](https://github.com/Masutayunikon/FanKarr/commit/eefa216da5ed6428b982ded31ab696623e9e5806))
* ajout du driver rtorrent ([7376306](https://github.com/Masutayunikon/FanKarr/commit/73763066b900a246910481d6ac06a4991959396d))
* auto update des fichiers nfo ([eefa216](https://github.com/Masutayunikon/FanKarr/commit/eefa216da5ed6428b982ded31ab696623e9e5806))
* manual import ([b65e3e7](https://github.com/Masutayunikon/FanKarr/commit/b65e3e7cd8563466725e7eaf2f8aad7afd927296))


### Bug Fixes

* add log for candidate path ([9c6465b](https://github.com/Masutayunikon/FanKarr/commit/9c6465bc45f9e08e67c53f4e0c83b6a625ea25f1))
* ajout d'une verif lors de l'écriture de la config sur les items dans body ([7376306](https://github.com/Masutayunikon/FanKarr/commit/73763066b900a246910481d6ac06a4991959396d))
* augmentation du header size 8kb -&gt; 32kb ([eefa216](https://github.com/Masutayunikon/FanKarr/commit/eefa216da5ed6428b982ded31ab696623e9e5806))
* empeche un login failed de se repeter et de se faire bloquer par les clients ([7376306](https://github.com/Masutayunikon/FanKarr/commit/73763066b900a246910481d6ac06a4991959396d))
* import manuelle desactivé pour le moment ([fc7fd3a](https://github.com/Masutayunikon/FanKarr/commit/fc7fd3a0ecfba3a82f851fdcc7a278fdeb43febe))
* l'organiseur prend les fichiers renommer maintenant ([7376306](https://github.com/Masutayunikon/FanKarr/commit/73763066b900a246910481d6ac06a4991959396d))
* ne sauvegarde plus le mots de passe "fake" quand on edit un client ([7376306](https://github.com/Masutayunikon/FanKarr/commit/73763066b900a246910481d6ac06a4991959396d))
* organiser take correct name ([712db87](https://github.com/Masutayunikon/FanKarr/commit/712db87a77be4dec157c3addb5bc12b1ac2bc124))
* polling des torrents à 60s ([48f86ea](https://github.com/Masutayunikon/FanKarr/commit/48f86ea9cc36ded75f02fa3879a7d3bd2640fb70))
* remove log for mapping ([7376306](https://github.com/Masutayunikon/FanKarr/commit/73763066b900a246910481d6ac06a4991959396d))
* remove log for mapping ([4d963e5](https://github.com/Masutayunikon/FanKarr/commit/4d963e5bf3ab00e798089e93cdc846fbd2c31de6))
* unlink before move ([7376306](https://github.com/Masutayunikon/FanKarr/commit/73763066b900a246910481d6ac06a4991959396d))
* unlink before move ([4d963e5](https://github.com/Masutayunikon/FanKarr/commit/4d963e5bf3ab00e798089e93cdc846fbd2c31de6))
* utorrent path for import ([eba2552](https://github.com/Masutayunikon/FanKarr/commit/eba2552e1dba67eec615c2a17e0ca1b896fc1a3b))

## [3.4.0](https://github.com/Masutayunikon/FanKarr/compare/v3.3.3...v3.4.0) (2026-04-08)


### Features

* ajout d'un retour visuel si on a un path par defaut sur / ([4a5312d](https://github.com/Masutayunikon/FanKarr/commit/4a5312d4ece9a2f1ff484ab9e1cbbb7cf291c5a5))
* Ajout du support pour l'édition/mise à jour des clients torrent ([dda8a03](https://github.com/Masutayunikon/FanKarr/commit/dda8a03403b46027a23b4a2812ca3797a2628673))
* Ajout du support pour l'édition/mise à jour des clients torrent ([a3e1c34](https://github.com/Masutayunikon/FanKarr/commit/a3e1c34e7547bab75c45ddd3eace0d211409ccd5))


### Bug Fixes

* le driver de Transmission n'est plus basé sur android ([4a5312d](https://github.com/Masutayunikon/FanKarr/commit/4a5312d4ece9a2f1ff484ab9e1cbbb7cf291c5a5))
* les torrent inconnue en états seront mis dans la catégorie terminée ([4a5312d](https://github.com/Masutayunikon/FanKarr/commit/4a5312d4ece9a2f1ff484ab9e1cbbb7cf291c5a5))
* typo ([18ec548](https://github.com/Masutayunikon/FanKarr/commit/18ec548d76c929afac11cd16d88e734480ee2755))
* utilisation de nfo_filename au lieu de original_filename ([4a5312d](https://github.com/Masutayunikon/FanKarr/commit/4a5312d4ece9a2f1ff484ab9e1cbbb7cf291c5a5))

## [3.3.3](https://github.com/Masutayunikon/FanKarr/compare/v3.3.2...v3.3.3) (2026-04-07)


### Bug Fixes

* MediaManagementView.vue api call is now in mounted ([8c5b650](https://github.com/Masutayunikon/FanKarr/commit/8c5b650ca6eeac75f33e8c5423f6d4fd24f9871b))
* path ([58ae88a](https://github.com/Masutayunikon/FanKarr/commit/58ae88a01c063318407134cd7351572220acd892))

## [3.3.2](https://github.com/Masutayunikon/FanKarr/compare/v3.3.1...v3.3.2) (2026-04-07)


### Bug Fixes

* use fetch instead of useFetch ([af550ec](https://github.com/Masutayunikon/FanKarr/commit/af550eccfbeeb116491e8ea4973eac493ed962d3))

## [3.3.1](https://github.com/Masutayunikon/FanKarr/compare/v3.3.0...v3.3.1) (2026-04-07)


### Bug Fixes

* add driver register for transmission ([7d2096e](https://github.com/Masutayunikon/FanKarr/commit/7d2096ec1972079a2e0e5bdfe01c4cc702e6b185))

## [3.3.0](https://github.com/Masutayunikon/FanKarr/compare/v3.2.1...v3.3.0) (2026-04-07)


### Features

* add transmission client ([a2b88de](https://github.com/Masutayunikon/FanKarr/commit/a2b88de3a123aeb9c140e83605901dd5cdad041a))
* set defaultPath for any system ([a2b88de](https://github.com/Masutayunikon/FanKarr/commit/a2b88de3a123aeb9c140e83605901dd5cdad041a))

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
