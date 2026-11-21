# Open-source credits and asset licences

UP includes the following third-party material. Keep these notices with redistributed builds.

## Miso animated pet

- Project: [PixelPets](https://github.com/JOhnsonKC201/pixelpets)
- Upstream browser renderer: `site/cat-sprite.js` and `site/cat-live.js`
- Licence: MIT
- Copyright: © 2026 JOhnsonKC201
- Local copies: `public/miso/`
- The upstream MIT licence is included at `public/miso/LICENSE`.

UP uses the PixelPets pixel-cat renderer and interaction engine as the basis for Miso, with UP-specific controls, positioning, naming, and sound behaviour.

## Ambient alarm recordings

The following recordings are sourced from the Ambient Sounds library's versioned manifest and are identified there as CC0 1.0 recordings. Web previews use the library's release URLs. Android builds download and transcode local copies into the APK so alarms can play without a network connection.

| UP sound | Creator | Original source | Licence |
|---|---|---|---|
| Rain on the Window | barkenov | [Freesound 640655](https://freesound.org/people/barkenov/sounds/640655/) | CC0 1.0 |
| Little Brook | SamsterBirdies | [Freesound 584269](https://freesound.org/people/SamsterBirdies/sounds/584269/) | CC0 1.0 |
| River Current | JW_Audio | [Freesound 810231](https://freesound.org/people/JW_Audio/sounds/810231/) | CC0 1.0 |
| Open Window | keweldog | [Freesound 181801](https://freesound.org/people/keweldog/sounds/181801/) | CC0 1.0 |
| Forest Morning | Sadiquecat | [Freesound 799439](https://freesound.org/people/Sadiquecat/sounds/799439/) | CC0 1.0 |
| Miso's Purr | Trautwein | [Freesound 260881](https://freesound.org/people/Trautwein/sounds/260881/) | CC0 1.0 |
| Quiet Room | TimBahrij | [Freesound 234918](https://freesound.org/people/TimBahrij/sounds/234918/) | CC0 1.0 |

- Library manifest: [Leminno-org/ambient-sounds-library](https://github.com/Leminno-org/ambient-sounds-library)
- Licence: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- The creator and source details above are retained as courtesy attribution even though CC0 does not require attribution.

The web previews require an internet connection. Android native alarm playback uses the compressed assets bundled at build time. iOS AlarmKit currently uses the system alarm sound; selected custom audio is not yet wired into Apple's alarm presentation.
