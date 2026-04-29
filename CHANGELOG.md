# Changelog

## 2.1.0 (2026-04-29)


### ⚠ BREAKING CHANGES

* nouvelle architecture frontend avec layout sidebar, système de thèmes et routes restructurées
* **organize:** le format paths[] dans series/{id}.json passe de string[] à { infohash: string, path: string }[] — nécessite une mise à jour du scraper.
* suppression de torrent_final.json au profit d'un système de fichiers par série (series/{id}.json) avec cache mémoire GitHub 6h. Version majeure — nécessite un nouveau scraper et une mise à jour complète.

### Features

* activation de l'import manuel ([c94ff7d](https://github.com/Masutayunikon/FanKarr/commit/c94ff7da3f2329d15521027c115cf3dd628d643d))
* add build for arm64 ([1290d5c](https://github.com/Masutayunikon/FanKarr/commit/1290d5c925c0bf5504c571cd33f558cdf5c25db0))
* add developer settings on settings and dashboard debug ([1290d5c](https://github.com/Masutayunikon/FanKarr/commit/1290d5c925c0bf5504c571cd33f558cdf5c25db0))
* add favicon ([14f02d1](https://github.com/Masutayunikon/FanKarr/commit/14f02d1bddf0039f86bda5b2e2dfaa9e732546a4))
* add organize all button ([84ef033](https://github.com/Masutayunikon/FanKarr/commit/84ef0333f366a713f84f569049be063830a2d350))
* add README.md ([5a00666](https://github.com/Masutayunikon/FanKarr/commit/5a006664c04763a5a8260cf2285fef7c60c1fde5))
* add transmission client ([f304562](https://github.com/Masutayunikon/FanKarr/commit/f304562f0192b963ca4804ffc7cc412a55f66f78))
* add uttorent driver ([0e09c85](https://github.com/Masutayunikon/FanKarr/commit/0e09c85efddaaac933f40002fdcf81e92b6764d3))
* add windows / linux / macos binaries on build ([8030bf1](https://github.com/Masutayunikon/FanKarr/commit/8030bf14f96645ee8960427cab706e8007901e42))
* ajout d'information dans le fichier d'organisation pour l'organisation manuel plus tard ([8ec323d](https://github.com/Masutayunikon/FanKarr/commit/8ec323dc95171ce0d19110019295d4daf5786502))
* ajout d'un bouton pour supprimer les nfo / png ([e1e68ef](https://github.com/Masutayunikon/FanKarr/commit/e1e68ef2bf742cab23e8080aac7817be835c2e2c))
* ajout d'un bouton refresh ([debf61f](https://github.com/Masutayunikon/FanKarr/commit/debf61f7143c4e595c078e7969e78d674fa61846))
* ajout d'un bouton supprimé l'importation dans le menu d'importation d'une serie ([d6f4433](https://github.com/Masutayunikon/FanKarr/commit/d6f443354121f0d69868a82031095b5c1bd03e93))
* ajout d'un exe pour les cpu non avx2 ([a358ee2](https://github.com/Masutayunikon/FanKarr/commit/a358ee2d83a6d8b7908586fbde05664aca34c30d))
* ajout d'un retour visuel si on a un path par defaut sur / ([f3a36af](https://github.com/Masutayunikon/FanKarr/commit/f3a36af6299d0ae83f2ff6652aa562b4296a3b9b))
* ajout d'une "notification" dans la navbar si une nouvelle versions est disponible ([c94ff7d](https://github.com/Masutayunikon/FanKarr/commit/c94ff7da3f2329d15521027c115cf3dd628d643d))
* ajout d'une hashmap pour matcher les titres sur synologie et ajouter les hash de torrent manuellement ([9b4dc4f](https://github.com/Masutayunikon/FanKarr/commit/9b4dc4f7825bbfbb3c01adadad0c27f8d9b671d0))
* ajout d'une variable d'environment pour augmenter la durée du token ou le desactiver avec "never" ou 0 ([f897116](https://github.com/Masutayunikon/FanKarr/commit/f897116e308e507a93c6392ef59a94378a414f1b))
* ajout de badge quand le fichier est introuvable ([d6f4433](https://github.com/Masutayunikon/FanKarr/commit/d6f443354121f0d69868a82031095b5c1bd03e93))
* ajout de l'option supprimé le torrent si l'option déplacer est activé ([392f736](https://github.com/Masutayunikon/FanKarr/commit/392f73692554878003acb29dd50b707a68531a16))
* ajout de la possibilité de renommer des imports dans le bon format ([699c130](https://github.com/Masutayunikon/FanKarr/commit/699c130edd596596f141f46ff08fd913b5e2699e))
* ajout de la suppression des torrents depuis l'interface ([392f736](https://github.com/Masutayunikon/FanKarr/commit/392f73692554878003acb29dd50b707a68531a16))
* ajout de log pour le bouton tout renommer ([e1e68ef](https://github.com/Masutayunikon/FanKarr/commit/e1e68ef2bf742cab23e8080aac7817be835c2e2c))
* ajout de synology downloader comme client ([d563ed4](https://github.com/Masutayunikon/FanKarr/commit/d563ed4c68d4605c4f253b93cd7b8e1386d62385))
* Ajout des mapping sur les clients ([d563ed4](https://github.com/Masutayunikon/FanKarr/commit/d563ed4c68d4605c4f253b93cd7b8e1386d62385))
* ajout des parametres dossier de téléchargements pour les clients torrent ([d563ed4](https://github.com/Masutayunikon/FanKarr/commit/d563ed4c68d4605c4f253b93cd7b8e1386d62385))
* ajout des telechargments par episodes / saisons ([247694a](https://github.com/Masutayunikon/FanKarr/commit/247694ab3e96f1f67078bac06e095d82d4db5c5f))
* ajout du .env dans les dossiers du binaires pour pouvoir changer leur valeurs ([f897116](https://github.com/Masutayunikon/FanKarr/commit/f897116e308e507a93c6392ef59a94378a414f1b))
* ajout du bouton copie ([392f736](https://github.com/Masutayunikon/FanKarr/commit/392f73692554878003acb29dd50b707a68531a16))
* ajout du bouton suppresion de torrent en cours ([d6f4433](https://github.com/Masutayunikon/FanKarr/commit/d6f443354121f0d69868a82031095b5c1bd03e93))
* ajout du driver rtorrent ([8ec323d](https://github.com/Masutayunikon/FanKarr/commit/8ec323dc95171ce0d19110019295d4daf5786502))
* ajout du langage ([16bb46f](https://github.com/Masutayunikon/FanKarr/commit/16bb46fb55f80c6391040892b09b95c37a7f82b9))
* ajout du ratio, upload speed, etc dans les activités ([71961eb](https://github.com/Masutayunikon/FanKarr/commit/71961eb9986901e7002d1f1ff74e2bc4f7a6eb74))
* ajout du support multifile sur utorrent ([e1e68ef](https://github.com/Masutayunikon/FanKarr/commit/e1e68ef2bf742cab23e8080aac7817be835c2e2c))
* Ajout du support pour l'édition/mise à jour des clients torrent ([bc960ba](https://github.com/Masutayunikon/FanKarr/commit/bc960ba585283cd0db15a74d41cc6733f215843c))
* Ajout du support pour l'édition/mise à jour des clients torrent ([15fac6c](https://github.com/Masutayunikon/FanKarr/commit/15fac6c472b27a296a943e21b8bf705eaaaed115))
* ajout setup plex ([2070c11](https://github.com/Masutayunikon/FanKarr/commit/2070c1113ddcd51a8fab444b9d1bd0225b0cceb2))
* **api:** adaptation complète à la nouvelle structure API Fankai ([d5c37e8](https://github.com/Masutayunikon/FanKarr/commit/d5c37e8f2c92f334e9d31daafc0165a207164384))
* **api:** cache mémoire GitHub TTL 6h avec invalidation via /api/update ([d5c37e8](https://github.com/Masutayunikon/FanKarr/commit/d5c37e8f2c92f334e9d31daafc0165a207164384))
* **api:** matching torrents par hiérarchie série/saison/épisode ([d5c37e8](https://github.com/Masutayunikon/FanKarr/commit/d5c37e8f2c92f334e9d31daafc0165a207164384))
* **auth:** génération automatique du JWT secret au démarrage ([e7afe13](https://github.com/Masutayunikon/FanKarr/commit/e7afe138e17bf1ec27077a798c283f104bdcb51c))
* auto update des fichiers nfo ([d563ed4](https://github.com/Masutayunikon/FanKarr/commit/d563ed4c68d4605c4f253b93cd7b8e1386d62385))
* bouton tous télécharger sur les saisons et series ([d6f4433](https://github.com/Masutayunikon/FanKarr/commit/d6f443354121f0d69868a82031095b5c1bd03e93))
* cache images ([f3bcc68](https://github.com/Masutayunikon/FanKarr/commit/f3bcc68104f5acd92b35378aa732808fe90f6b93))
* **catalogue:** badge IMPORTÉ et refresh automatique post-import ([e1e430a](https://github.com/Masutayunikon/FanKarr/commit/e1e430a9685342e847bbd15c105bfa38f7064101))
* **catalogue:** tri du catalogue avec 4 options ([e1e430a](https://github.com/Masutayunikon/FanKarr/commit/e1e430a9685342e847bbd15c105bfa38f7064101))
* désimport saison/série avec modal, refonte UX épisodes, fix sélection fichier qBit/Transmission ([2446622](https://github.com/Masutayunikon/FanKarr/commit/24466228ef5305c36574f58fb2590aee8ee86e13))
* désimport saison/série avec modal, refonte UX épisodes, fix sélection fichier qBit/Transmission ([fcb1b88](https://github.com/Masutayunikon/FanKarr/commit/fcb1b88870bebb1bf0b4e484b2462e56ab3975fc))
* désimport saison/série avec modal, refonte UX épisodes, fix sélection fichier qBit/Transmission ([3fb4119](https://github.com/Masutayunikon/FanKarr/commit/3fb4119c79908c1023f3cbf9999b524eb1bc267e))
* **downloads:** bouton Organiser tout renommé Importer tout ([e1e430a](https://github.com/Masutayunikon/FanKarr/commit/e1e430a9685342e847bbd15c105bfa38f7064101))
* edit d'episodes importer dans le menu d'importation ([f7c21f5](https://github.com/Masutayunikon/FanKarr/commit/f7c21f5fd1b0c6cb98e677a1f08d9b7b9e5ed094))
* fix worker for multiple series in integral (one piece fix ?) ([8ce0ca1](https://github.com/Masutayunikon/FanKarr/commit/8ce0ca1f24d5d1a2fe03065165b867922d11932f))
* force release for test ([a3a1088](https://github.com/Masutayunikon/FanKarr/commit/a3a1088c1484fd78bb000e261dbd47b8de53f182))
* hors-fankai badge and fix series datetime and typo ([79e73b6](https://github.com/Masutayunikon/FanKarr/commit/79e73b603f0b2a0bc70331d8fad7056827cf71b0))
* initial project ([eaf01cf](https://github.com/Masutayunikon/FanKarr/commit/eaf01cfc591dd72f9b093b533ced6c12a6c490a1))
* make the organizer threaded to not consumme api main thread ([2375303](https://github.com/Masutayunikon/FanKarr/commit/237530321e51ae3389f283fc940d52f240449498))
* manual import ([a582991](https://github.com/Masutayunikon/FanKarr/commit/a582991c150d8364aca12160ca1e549d66ac4d1e))
* migration vers nouvelle architecture API et scraper par série ([d5c37e8](https://github.com/Masutayunikon/FanKarr/commit/d5c37e8f2c92f334e9d31daafc0165a207164384))
* now rename episodes with original_filename from api ([180513c](https://github.com/Masutayunikon/FanKarr/commit/180513c98a57cc7dd325df1c0628b61e4f401b6a))
* **organize:** nommage des fichiers selon original_filename ou formatted_name ([e1e430a](https://github.com/Masutayunikon/FanKarr/commit/e1e430a9685342e847bbd15c105bfa38f7064101))
* **organize:** refonte complète sans torrent_final.json ([d5c37e8](https://github.com/Masutayunikon/FanKarr/commit/d5c37e8f2c92f334e9d31daafc0165a207164384))
* **organize:** scan initial mediaPath + logs fichier centralisés ([c0fb601](https://github.com/Masutayunikon/FanKarr/commit/c0fb601ef02d7fdbea15d6c6bd56b4c2861a8302))
* **organize:** worker thread + badges statut + notifications ([97da422](https://github.com/Masutayunikon/FanKarr/commit/97da42203701885d19aef3b064c98dae5f86b31b))
* refonte complète du frontend et amélioration des logs serveur ([9780aee](https://github.com/Masutayunikon/FanKarr/commit/9780aee40df828cd09cafb84c98a237555ab8507))
* **scraper:** extraction du nom bencode pour les torrents locaux ([13f9a27](https://github.com/Masutayunikon/FanKarr/commit/13f9a27af86e4d358cea7e7fe80322a7b9f0ecb7))
* **scraper:** extraction nom bencode dans raw pour torrents locaux ([d5c37e8](https://github.com/Masutayunikon/FanKarr/commit/d5c37e8f2c92f334e9d31daafc0165a207164384))
* **serie:** badges état organisation sur épisodes et saisons ([0e6e133](https://github.com/Masutayunikon/FanKarr/commit/0e6e13332f1a8ccc487af7d2bb4cc625615da496))
* **series-view:** badge "Hors Fankai" sur épisodes de torrents manuels ([d5c37e8](https://github.com/Masutayunikon/FanKarr/commit/d5c37e8f2c92f334e9d31daafc0165a207164384))
* **series-view:** badge "Hors Fankai" sur les épisodes de torrents manuels ([13f9a27](https://github.com/Masutayunikon/FanKarr/commit/13f9a27af86e4d358cea7e7fe80322a7b9f0ecb7))
* **series-view:** tooltip avec le nom du torrent sur les boutons intégrale ([13f9a27](https://github.com/Masutayunikon/FanKarr/commit/13f9a27af86e4d358cea7e7fe80322a7b9f0ecb7))
* **series-view:** tooltip raw name sur boutons intégrale via :title ([d5c37e8](https://github.com/Masutayunikon/FanKarr/commit/d5c37e8f2c92f334e9d31daafc0165a207164384))
* set defaultPath for any system ([f304562](https://github.com/Masutayunikon/FanKarr/commit/f304562f0192b963ca4804ffc7cc412a55f66f78))
* **settings:** ajout du toggle import automatique (activé par défaut) ([e1e430a](https://github.com/Masutayunikon/FanKarr/commit/e1e430a9685342e847bbd15c105bfa38f7064101))
* **settings:** option titres optimisés Plex (title_for_plex) ([c374ceb](https://github.com/Masutayunikon/FanKarr/commit/c374ceb0a700d9d8da0c6c2e6c2ca7fcdba92cf9))
* **settings:** textes génériques sans mention de logiciels spécifiques ([e1e430a](https://github.com/Masutayunikon/FanKarr/commit/e1e430a9685342e847bbd15c105bfa38f7064101))
* suppression des series supprimé ([d6f4433](https://github.com/Masutayunikon/FanKarr/commit/d6f443354121f0d69868a82031095b5c1bd03e93))
* **ui:** états catalogue + logs + badges erreurs downloads ([b88e020](https://github.com/Masutayunikon/FanKarr/commit/b88e020fb514c5cbab9d59cbf7935db823bef6a0))
* update readme ([43de4f8](https://github.com/Masutayunikon/FanKarr/commit/43de4f8071fbac7400aa33b27cc3d4ba23daeea8))
* use original_name and formated_name from scraper to bypass timeout ([ad1cade](https://github.com/Masutayunikon/FanKarr/commit/ad1cade6bf1ca4c05c49c24ca759de2d422dc519))
* utilisation des bar de telechargement par fichier dans le torrent plutot que celui du torrent ([7e53bab](https://github.com/Masutayunikon/FanKarr/commit/7e53bab0fccee5219d0b89f0ff6d0b898efcf3ef))
* UX improvements, folder picker, download state & NFO support ([693f8a9](https://github.com/Masutayunikon/FanKarr/commit/693f8a96ae1ea63e1b0b49ca3459b04e11b4a793))


### Bug Fixes

* add config directory to .gitignore ([2332b54](https://github.com/Masutayunikon/FanKarr/commit/2332b544e66a5f298069a4c6f9e7416a8e195d3d))
* add config.ts with config variable (BASE_DIR...) ([2efed9d](https://github.com/Masutayunikon/FanKarr/commit/2efed9dcfc41d8a7d4ce8bb1b3a7bc6601e5c5f1))
* add driver register for transmission ([1af2100](https://github.com/Masutayunikon/FanKarr/commit/1af210058ca526e04d92b5313b421e1a968afb0c))
* add log for candidate path ([89c0db5](https://github.com/Masutayunikon/FanKarr/commit/89c0db5f36bbd8f1c599c404889d3a156494e149))
* add log for debug ([e18c6a1](https://github.com/Masutayunikon/FanKarr/commit/e18c6a1c54b5e7ba51df1616bc9a2874b4fc45fc))
* add log for debug ([c78537c](https://github.com/Masutayunikon/FanKarr/commit/c78537c9d8c829ecd43db1dab242662e98c5332c))
* add readsettings import ([b621adc](https://github.com/Masutayunikon/FanKarr/commit/b621adc6f606d735cfee4f0083eaf3f92a74e0fe))
* add target node ([ed2306b](https://github.com/Masutayunikon/FanKarr/commit/ed2306bb70dc63ca7ddce6964037e7ec21554e10))
* add target node ([1afe13c](https://github.com/Masutayunikon/FanKarr/commit/1afe13c55547a14358f28599eb4f6783b2861f21))
* add usePlexTitles to return function ([92055ca](https://github.com/Masutayunikon/FanKarr/commit/92055caf4d1e61e2fce6ef33264f1411b0e568b0))
* add user permissions when the scripts is launched ([61418c6](https://github.com/Masutayunikon/FanKarr/commit/61418c6f771eb150566b48e702f4338933f3ae33))
* affichage de la bar de progression et confirmation sur le bouton pour les episodes en doublons ([a423c08](https://github.com/Masutayunikon/FanKarr/commit/a423c08559b949328992a7ff4bf6051c8006faad))
* affichage de la bar de progression et confirmation sur le bouton pour les episodes en doublons et dropdown ([245e9e3](https://github.com/Masutayunikon/FanKarr/commit/245e9e38aa03da6de7fd32c8e9f4088c6a2aeb04))
* ajout d'un loader sur certaines pages pour pas avoir des trucs par default qui s'affiche ([203df75](https://github.com/Masutayunikon/FanKarr/commit/203df7576c1706a5fa92d166aa5d0c632d1a8a49))
* ajout d'une verif lors de l'écriture de la config sur les items dans body ([8ec323d](https://github.com/Masutayunikon/FanKarr/commit/8ec323dc95171ce0d19110019295d4daf5786502))
* ajout de l'option de suppresion dans l'interface settings.ts ([bb29f02](https://github.com/Masutayunikon/FanKarr/commit/bb29f02000bbb0867d1df7b57510697169647274))
* ajout de la copy dans le worker ([f593288](https://github.com/Masutayunikon/FanKarr/commit/f593288b73c05427116480d62c89adf39c8c0b61))
* ajout de la mise a jour des noms toutes les 1h ([4760d57](https://github.com/Masutayunikon/FanKarr/commit/4760d576f3965b41344eac2ef0834df54259d3be))
* ajout de la page management dans le layout ([e41edd2](https://github.com/Masutayunikon/FanKarr/commit/e41edd2f5e1cc894b207c480e232e6adb454aa72))
* ajout de logs lors de non match ([ef23a71](https://github.com/Masutayunikon/FanKarr/commit/ef23a7119e72e497273bb2592a3c993a6c793033))
* ajout de undici dans le package.json ([0103960](https://github.com/Masutayunikon/FanKarr/commit/0103960645549803a4c877d7247bd04bb6485802))
* ajout des boutons pour les episodes sans torrent ([1b2036b](https://github.com/Masutayunikon/FanKarr/commit/1b2036b57b4cf17107d49dff2df47bc8919ba39c))
* ajout des series non disponible pour pouvoir les add manuellement ([854839b](https://github.com/Masutayunikon/FanKarr/commit/854839b16a995c6bb30f17f6045dbd46bb97cf25))
* android build name ([bb02ea6](https://github.com/Masutayunikon/FanKarr/commit/bb02ea6cf8c08db1b669c83afd847eddb9124db5))
* augmentation du header size 8kb -&gt; 32kb ([d563ed4](https://github.com/Masutayunikon/FanKarr/commit/d563ed4c68d4605c4f253b93cd7b8e1386d62385))
* badge catalogue sur les series importé ([7e050a6](https://github.com/Masutayunikon/FanKarr/commit/7e050a699d072356db479aa4743ad94235970196))
* bouton global de serie ([ed66c2c](https://github.com/Masutayunikon/FanKarr/commit/ed66c2c0a2c807fd1d5dfecf96a18c652dc9ea4a))
* bouton tous telecharger a la place de integral, multi torrents sur le bouton saisons et tous telecharger ([806121f](https://github.com/Masutayunikon/FanKarr/commit/806121f95ccd3419841de8c9ab8117eeca8aeb28))
* bun target android ([ba67817](https://github.com/Masutayunikon/FanKarr/commit/ba67817ea0abed3b71bf6b667af2bce680b55b74))
* cast string ([b881fdd](https://github.com/Masutayunikon/FanKarr/commit/b881fdd557c6d71a872311fa6372b743676d2eed))
* **catalogue:** activeTorrents filtre désormais uniquement state=downloading ([c374ceb](https://github.com/Masutayunikon/FanKarr/commit/c374ceb0a700d9d8da0c6c2e6c2ca7fcdba92cf9))
* **catalogue:** état "partiel" incorrect quand l'intégrale est organisée ([13f9a27](https://github.com/Masutayunikon/FanKarr/commit/13f9a27af86e4d358cea7e7fe80322a7b9f0ecb7))
* **catalogue:** état download basé sur épisodes organisés vs torrents bruts ([d5c37e8](https://github.com/Masutayunikon/FanKarr/commit/d5c37e8f2c92f334e9d31daafc0165a207164384))
* CatalogView.vue badge deleted ([71d3c55](https://github.com/Masutayunikon/FanKarr/commit/71d3c557e9e6f7f530bbdbb7e29fb292bdef4818))
* changer le noms de build arm64 et windows legacy pour une meilleur comprehension ([ea7ed59](https://github.com/Masutayunikon/FanKarr/commit/ea7ed597de61cb40959bdc3ebc02b6872dfad6ae))
* changer les badge de language pour un truc plus explicite ([39738c0](https://github.com/Masutayunikon/FanKarr/commit/39738c0c966b3eb26879e58efe0386b0f5be70c5))
* coherence des badges ([e685fad](https://github.com/Masutayunikon/FanKarr/commit/e685fade30535559e24215a28774200904598595))
* config path /config/config to /config ([4d319f9](https://github.com/Masutayunikon/FanKarr/commit/4d319f97bcc22fcac895cee0abac1fedd1d717f5))
* Deux corrections : ([353bd00](https://github.com/Masutayunikon/FanKarr/commit/353bd009ed7e93b9c436c3d588ca6e4d16fd66e3))
* docker errors ([2702764](https://github.com/Masutayunikon/FanKarr/commit/27027642eb55b75adb04446a88e5007e88f75948))
* docker is able to change directory ([8417aa9](https://github.com/Masutayunikon/FanKarr/commit/8417aa98ca749b4dcc5decd68558151da7c74c57))
* dockerfile node version to 22 ([bffe286](https://github.com/Masutayunikon/FanKarr/commit/bffe286f40212808c03d47947aeb62269ee13137))
* dropdown overflow ([12511eb](https://github.com/Masutayunikon/FanKarr/commit/12511eb39f52649a42c637037edba59c4e98291c))
* dropdown overflow ([c594af7](https://github.com/Masutayunikon/FanKarr/commit/c594af7f43b44077c54e1429ea62965504c556d9))
* empeche un login failed de se repeter et de se faire bloquer par les clients ([8ec323d](https://github.com/Masutayunikon/FanKarr/commit/8ec323dc95171ce0d19110019295d4daf5786502))
* empty docker-compose.yml ([cec376a](https://github.com/Masutayunikon/FanKarr/commit/cec376ade6b394733d04581562c32f81acab49cf))
* entrypoint.sh config directory ([5e54e24](https://github.com/Masutayunikon/FanKarr/commit/5e54e24b60fae1ca0a9a4122efe1310728501b3d))
* export _isBunBinary ([4c7936b](https://github.com/Masutayunikon/FanKarr/commit/4c7936b019cd710dc9665d12316b1a617894b99d))
* fallback de noms si les noms de torrents se ressemble il fallback sur les noms dans nyaa ([86df305](https://github.com/Masutayunikon/FanKarr/commit/86df3054dd1944eabb0a4246d9b5557a4459f85b))
* formatage ([176dfed](https://github.com/Masutayunikon/FanKarr/commit/176dfed0aff94d7e3334dbbfa854175ac6a979d0))
* formatage ([3405763](https://github.com/Masutayunikon/FanKarr/commit/34057638ca2c389439a52777bb67f15aad524d18))
* import manuelle desactivé pour le moment ([9576ec9](https://github.com/Masutayunikon/FanKarr/commit/9576ec9b238c090faceda57e0546e691c37f8a9e))
* improve container detection to support Podman and other runtimes ([7661b65](https://github.com/Masutayunikon/FanKarr/commit/7661b65df48639b527435b1d42b630c93c9720a4))
* improve torrent organization and cleanup logic ([8bec4c6](https://github.com/Masutayunikon/FanKarr/commit/8bec4c62fa5eee6072f94c3718fa497798a7da75))
* l'import a le meme comportement que radarr/sonarr en ouvrant l'import dans le dossier de la serie attendu directement ([73b401f](https://github.com/Masutayunikon/FanKarr/commit/73b401f3e745eebd292b1a9a181975ba8efe6857))
* l'organiseur prend les fichiers renommer maintenant ([8ec323d](https://github.com/Masutayunikon/FanKarr/commit/8ec323dc95171ce0d19110019295d4daf5786502))
* la version dev se met uniquement en dev ([f96565a](https://github.com/Masutayunikon/FanKarr/commit/f96565a3015f7b28b2613a8afbd32cd52843300d))
* le badge de rename utilise la meme logique que coté serveur et n'apparait plus sur les vue series si il ne devrais pas ([f00556a](https://github.com/Masutayunikon/FanKarr/commit/f00556ab517e360a827c605dc30c663c44631d6c))
* le bouton "tous télécharger" ne s'affiche plus si la series de contient que des integrales comme torrent ([3a65a4b](https://github.com/Masutayunikon/FanKarr/commit/3a65a4bb39c2e002e8a74fe0d64669d0489f1780))
* le bouton tout telecharger apparait sur les packs de saisons et les integrals + autres et pas que sur les series avec des episodes telechargable ([4e84879](https://github.com/Masutayunikon/FanKarr/commit/4e8487967c70bbfd0cc83f4b7020e369b62f8377))
* le driver de Transmission n'est plus basé sur android ([f3a36af](https://github.com/Masutayunikon/FanKarr/commit/f3a36af6299d0ae83f2ff6652aa562b4296a3b9b))
* le dropdown apparait sur le bouton de telechargement et pas les 3 petit points pour les multiples ([497ad7b](https://github.com/Masutayunikon/FanKarr/commit/497ad7bdc8793cab53d0834141b4b745681ebb21))
* le folder picker affiche tous les disques depuis le bouton homes sous windows ([a7c90b6](https://github.com/Masutayunikon/FanKarr/commit/a7c90b63df641ead164c983db79fb9013fe8184c))
* le setup plex peux maintenant etre utilisé sur un serveur local (probleme de certificat) ([cfd0914](https://github.com/Masutayunikon/FanKarr/commit/cfd0914b9bd88ebc0a098f190bd67823c8811ef5))
* les fichiers non selectionner sur un torrent ne produise plus d'erreurs d'import ([f1c4086](https://github.com/Masutayunikon/FanKarr/commit/f1c40865dac436caccfd6e4b0c3db715e001d17f))
* les fichiers non selectionner sur un torrent ne sont plus en "attente d'import" sur l'affichage de la serie ([9ee4fac](https://github.com/Masutayunikon/FanKarr/commit/9ee4face7370e66f0233a7035bfe5db345eaaaf0))
* les series sans torrent et non ajoutées manuellement sont bien grisé ([e02650d](https://github.com/Masutayunikon/FanKarr/commit/e02650d1ccef63f16689c21343bc0738c5cd2da5))
* les series sans torrent et non ajoutées manuellement sont bien grisé ([45bf17c](https://github.com/Masutayunikon/FanKarr/commit/45bf17c48fb3fa5752f55f634f5358fc476244d4))
* les series sans torrents sont bien organiser si importé manuellement ([89f225b](https://github.com/Masutayunikon/FanKarr/commit/89f225b980c7f560e9b64dd158b7faa549cb97af))
* les series sans torrents sont bien organiser si importé manuellement ([66b0313](https://github.com/Masutayunikon/FanKarr/commit/66b0313ae993f41dc0d066bbf2dd2154dcfb4d5e))
* les torrent inconnue en états seront mis dans la catégorie terminée ([f3a36af](https://github.com/Masutayunikon/FanKarr/commit/f3a36af6299d0ae83f2ff6652aa562b4296a3b9b))
* les torrents sont stopé lors de la selection de fichier pour eviter qu'il commence le telechargement des autres fichiers avant de set les indexs ([b3ff17a](https://github.com/Masutayunikon/FanKarr/commit/b3ff17ab11f66efa4d15c7da81cb19da77882b09))
* les torrents sont stopé lors de la selection de fichier pour eviter qu'il commence le telechargement des autres fichiers avant de set les indexs ([f19cc02](https://github.com/Masutayunikon/FanKarr/commit/f19cc027eed5661d154309ed7da3c43a0c514a4a))
* log ([08c4122](https://github.com/Masutayunikon/FanKarr/commit/08c4122d5e6835eb542f5f051e41760a53a3f8a5))
* logger third args ([dd320e9](https://github.com/Masutayunikon/FanKarr/commit/dd320e92dcc4eba0d4e614ec9ae67532b5a13d50))
* MediaManagementView.vue api call is now in mounted ([1562ca3](https://github.com/Masutayunikon/FanKarr/commit/1562ca32f9762e1aa9f17b6cfdecf11501aeed8c))
* move plex settings en haut des boutons ([bb21add](https://github.com/Masutayunikon/FanKarr/commit/bb21addebb06f31f68b7cecfc21f56c50d58b714))
* n'affiche plus tous les épisodes en train de se telecharger si seulement un fichier est selectionner ([e6ca1d2](https://github.com/Masutayunikon/FanKarr/commit/e6ca1d2a36f412bed98f15ff3b8adea6b10152f9))
* n'affiche plus tous les épisodes en train de se telecharger si seulement un fichier est selectionner ([c9534c2](https://github.com/Masutayunikon/FanKarr/commit/c9534c201142d7a0be4860c02f33e8c06bb34c3a))
* ne retire pas les fichiers quand on en ajoute sur le torrent ([79b6a8b](https://github.com/Masutayunikon/FanKarr/commit/79b6a8bbb4e8e74e0838737f6364be71ff8abf97))
* ne sauvegarde plus le mots de passe "fake" quand on edit un client ([8ec323d](https://github.com/Masutayunikon/FanKarr/commit/8ec323dc95171ce0d19110019295d4daf5786502))
* nfo settings and add json file when not existing ([054dcb9](https://github.com/Masutayunikon/FanKarr/commit/054dcb915a0d7994f9e6be348f3b8da2aaf2e6ae))
* organisation utilise l'extension du fichier au lieu de tester si ça existe ([21bcb2b](https://github.com/Masutayunikon/FanKarr/commit/21bcb2ba238e07ed85be754d3f73b5c3bbba28f6))
* organiser take correct name ([0e09c85](https://github.com/Masutayunikon/FanKarr/commit/0e09c85efddaaac933f40002fdcf81e92b6764d3))
* organize file ([dd1ead4](https://github.com/Masutayunikon/FanKarr/commit/dd1ead4568b7d4f037dcb1af0449333a76bc16e9))
* organize use torrent hash and not name ([38282fd](https://github.com/Masutayunikon/FanKarr/commit/38282fd854eb330a1077ba24f7ab49f07a50227d))
* **organize:** buildFileMap matche par infohash au lieu d'index ou titre ([329150f](https://github.com/Masutayunikon/FanKarr/commit/329150f1c4c968ed2e111113aab008f3d534a7b1))
* **organize:** migration vers paths { infohash, path } pour le matching fichiers ([329150f](https://github.com/Masutayunikon/FanKarr/commit/329150f1c4c968ed2e111113aab008f3d534a7b1))
* organizer reuse the wrong name for gitlab path ([84ef033](https://github.com/Masutayunikon/FanKarr/commit/84ef0333f366a713f84f569049be063830a2d350))
* **organize:** retry sur les erreurs réseau dans enrichSeriesDataWithOriginalFilenames ([c374ceb](https://github.com/Masutayunikon/FanKarr/commit/c374ceb0a700d9d8da0c6c2e6c2ca7fcdba92cf9))
* **organize:** sanitisation des caractères spéciaux dans les noms de dossiers ([c374ceb](https://github.com/Masutayunikon/FanKarr/commit/c374ceb0a700d9d8da0c6c2e6c2ca7fcdba92cf9))
* **organize:** scanMediaPath adapté au nouveau format paths[] ([329150f](https://github.com/Masutayunikon/FanKarr/commit/329150f1c4c968ed2e111113aab008f3d534a7b1))
* **organize:** source fichier via save_path qBittorrent + fullPath relatif ([329150f](https://github.com/Masutayunikon/FanKarr/commit/329150f1c4c968ed2e111113aab008f3d534a7b1))
* path ([733f879](https://github.com/Masutayunikon/FanKarr/commit/733f8790ca56282458db6526c7f6f41e43f8ee22))
* path ([bef9918](https://github.com/Masutayunikon/FanKarr/commit/bef99183aa91e4bae4bbde88cfb3dff62d94d5f3))
* path ([77d918f](https://github.com/Masutayunikon/FanKarr/commit/77d918fbe0a09befd29668dc74ca40dcfbfbf58e))
* path ([0f0b0c0](https://github.com/Masutayunikon/FanKarr/commit/0f0b0c07f6d046f8fd314deb80b3ca40a8fee974))
* path now work on every device ([4aa6f99](https://github.com/Masutayunikon/FanKarr/commit/4aa6f996765119ad2b755230411526602b196ea5))
* plex catcher ([609ddc7](https://github.com/Masutayunikon/FanKarr/commit/609ddc777fec0e5915db2cf8091886c37f226339))
* polling des torrents à 60s ([debf61f](https://github.com/Masutayunikon/FanKarr/commit/debf61f7143c4e595c078e7969e78d674fa61846))
* port 9898, /config volume, Kaï→Kai matching, NFO pagination GitLab, saison 0 specials, JoJo/Hokuto strict season resolve ([7a0917e](https://github.com/Masutayunikon/FanKarr/commit/7a0917e05328d72b0583c7859875d466fadd49c3))
* prise en charge de multiple torrent sur les telechargement d'episodes ([f897116](https://github.com/Masutayunikon/FanKarr/commit/f897116e308e507a93c6392ef59a94378a414f1b))
* qbit utilisation de /start au lieu de /resume pour la v5 ([4955a73](https://github.com/Masutayunikon/FanKarr/commit/4955a730b7190a988ff3942f00014b1acdf93dcc))
* recuperation des episodes avec un delai ([ac03aa3](https://github.com/Masutayunikon/FanKarr/commit/ac03aa3c11682798369c69513c08b339ac43d1fa))
* remove log for mapping ([8ec323d](https://github.com/Masutayunikon/FanKarr/commit/8ec323dc95171ce0d19110019295d4daf5786502))
* remove log for mapping ([630374d](https://github.com/Masutayunikon/FanKarr/commit/630374def734f41243c2dc57842b5140880e0cb0))
* remove logo ([215d802](https://github.com/Masutayunikon/FanKarr/commit/215d802b12dbb15d260860e7608952d21ac05683))
* remove plex settings ([83a2fb9](https://github.com/Masutayunikon/FanKarr/commit/83a2fb9860e94910925f61f007c57d6453acaf73))
* remove user creation in entrypoint.sh ([27f55ab](https://github.com/Masutayunikon/FanKarr/commit/27f55ab2bea1250be52a1ee01301f7cbe9f50af3))
* rename if the torrent name is not the same as the api ([510e1f7](https://github.com/Masutayunikon/FanKarr/commit/510e1f7b5ad4948d95d676816937d4f4d4c42558))
* renommage d'episodes qui ne fonctionne pas en 1 par 1 ([e1e68ef](https://github.com/Masutayunikon/FanKarr/commit/e1e68ef2bf742cab23e8080aac7817be835c2e2c))
* season 0 not clonficting anymore ([33d0b9a](https://github.com/Masutayunikon/FanKarr/commit/33d0b9a52d27bea0fbbdb122796565be75ee1785))
* season 0 resolved is no longer skipped in the worker ([232ede4](https://github.com/Masutayunikon/FanKarr/commit/232ede42923e6fd324a7243a01e564e1cbe7e6ea))
* season fallback ([8fab68a](https://github.com/Masutayunikon/FanKarr/commit/8fab68a0e4db0c5975ef175d584c48e38ea35af1))
* **series:** boutons saison Yu-Gi-Oh via fallback season_number ([d5c37e8](https://github.com/Masutayunikon/FanKarr/commit/d5c37e8f2c92f334e9d31daafc0165a207164384))
* **series:** résolution boutons de téléchargement saisons Yu-Gi-Oh et séries similaires ([13f9a27](https://github.com/Masutayunikon/FanKarr/commit/13f9a27af86e4d358cea7e7fe80322a7b9f0ecb7))
* settings ([271fc14](https://github.com/Masutayunikon/FanKarr/commit/271fc1438692dec1aa6f8613bf58d23cef7d377f))
* skip excluded folders ([c097cd4](https://github.com/Masutayunikon/FanKarr/commit/c097cd4d1fc0f45ea6270023d335eabc22d3b45f))
* suppression de dest_filename du fichier d'organisation qui est faux et ne sert à rien ([5e79699](https://github.com/Masutayunikon/FanKarr/commit/5e79699ed9b413ee4228c364e2ed43094c612ff0))
* title readme align ([a6fc655](https://github.com/Masutayunikon/FanKarr/commit/a6fc655cb7d6ae93b67519c1104645ca822a41ed))
* torrent for multiple seasons is now working ([6d110b8](https://github.com/Masutayunikon/FanKarr/commit/6d110b86dd2db00af63c030ab3c841e0435e946b))
* torrent path to hash ([23967a8](https://github.com/Masutayunikon/FanKarr/commit/23967a81d65a1f3698c2914568bcb6bde856267c))
* type ([8c2d61d](https://github.com/Masutayunikon/FanKarr/commit/8c2d61de066a1265e498c91c991dd6fe24fa57e2))
* type ([87fd964](https://github.com/Masutayunikon/FanKarr/commit/87fd964374711a50551dc33dce49e39bec30ef46))
* typo ([482743b](https://github.com/Masutayunikon/FanKarr/commit/482743bf3a4a0f4382887e3caaaecf6bde58b170))
* unlink before move ([8ec323d](https://github.com/Masutayunikon/FanKarr/commit/8ec323dc95171ce0d19110019295d4daf5786502))
* unlink before move ([630374d](https://github.com/Masutayunikon/FanKarr/commit/630374def734f41243c2dc57842b5140880e0cb0))
* use bcryptjs for compilation ([372359d](https://github.com/Masutayunikon/FanKarr/commit/372359d040c3d123c0e21ff6c08d8ebc83c95555))
* use fetch instead of useFetch ([f092da4](https://github.com/Masutayunikon/FanKarr/commit/f092da410812853da83db3d712756609f2c3d92a))
* use magnet before torrent ([4594dc5](https://github.com/Masutayunikon/FanKarr/commit/4594dc5189dd8239fafd1691f88cccc9b43a7104))
* use season number from resolved episodes in priority ([3dd517c](https://github.com/Masutayunikon/FanKarr/commit/3dd517c37f1d5c55367be37c852df7ea5025fcf2))
* utilisation de nfo_filename au lieu de original_filename ([f3a36af](https://github.com/Masutayunikon/FanKarr/commit/f3a36af6299d0ae83f2ff6652aa562b4296a3b9b))
* utilisation de svg pour les drapeau ([77cc97f](https://github.com/Masutayunikon/FanKarr/commit/77cc97f0f058829c0cb09b9134ec49b31cbe6c5b))
* utilisation des noms de dossier du torrent pour l'affichage plutot que le nom sur nyaa (notament pour gto kai qui a plusieurs integral et qui est plus explicite qque le nom nyaa) ([10a9b75](https://github.com/Masutayunikon/FanKarr/commit/10a9b756855bd450ca830ed7a8e2f411a9ecb7fa))
* utilisation du fichier torrent avec le magnet pour les bug de metadonnées ([f897116](https://github.com/Masutayunikon/FanKarr/commit/f897116e308e507a93c6392ef59a94378a414f1b))
* utorrent path for import ([2d0abab](https://github.com/Masutayunikon/FanKarr/commit/2d0abab222d5aa774c8b8bff5a38578146778794))
* utorrent prend desormais le dossier cible correctement ([1b1dbd3](https://github.com/Masutayunikon/FanKarr/commit/1b1dbd3ec8ce33d5471bc6d0f4718e4566fe57c0))
* vue des series importer ([6078aac](https://github.com/Masutayunikon/FanKarr/commit/6078aac714cffdc23b40611b9699899aea936a34))
* vue des series importer ([c61bd05](https://github.com/Masutayunikon/FanKarr/commit/c61bd05f750be43a4ff0a3ccd691c6a5051aabda))
* windows baseline ([31779d8](https://github.com/Masutayunikon/FanKarr/commit/31779d8f7ebc96d5537b75bd41bada2ee101e0c4))
* worker now work on multiple github files pages ([2f0be50](https://github.com/Masutayunikon/FanKarr/commit/2f0be502c3e689109eece31e12fff9b8cabb1cce))
* worker outside the exe ([27092b3](https://github.com/Masutayunikon/FanKarr/commit/27092b396860f9fd3b11fd020777b6110a8f0cba))
* worker outside the exe ([ed75280](https://github.com/Masutayunikon/FanKarr/commit/ed75280e7018b5a20ba92be17446978be1bbed4c))
* worker path ([b0e8116](https://github.com/Masutayunikon/FanKarr/commit/b0e81166e131ee025a76307ccaf3b7dab06c8419))
* worker path ([78e3055](https://github.com/Masutayunikon/FanKarr/commit/78e30553444390f906a8b66adb63c01047a182ce))
* workflow directory ([16b2800](https://github.com/Masutayunikon/FanKarr/commit/16b28004cf6de4d11f3a456d8c5a6ef1390cd89e))
* workflow directory ([465d3db](https://github.com/Masutayunikon/FanKarr/commit/465d3dba8bbc11f8c18e27001f3c809c636d5e66))
* workflow permmisions ([af03aec](https://github.com/Masutayunikon/FanKarr/commit/af03aecf0dca808c564b8f770f5838b0279121e0))
* wrong file copy ([7f0e363](https://github.com/Masutayunikon/FanKarr/commit/7f0e363cfe97f7bd7e3f715af14eb44db569adf6))

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
