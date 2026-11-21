# Open-source credits and asset licences

UP includes the following third-party material. Keep these notices with redistributed builds.

## Miso animated pet

- Project: [PixelPets](https://github.com/JOhnsonKC201/pixelpets)
- Upstream browser renderer: `site/cat-sprite.js` and `site/cat-live.js`
- Licence: MIT
- Copyright: © 2026 JOhnsonKC201
- Local copies: `public/miso/`
- The upstream MIT licence is included at `public/miso/LICENSE`.

UP uses the PixelPets pixel-cat renderer and interaction engine as the basis for Miso, with UP-specific dragging, naming, controls, and sound behaviour.

## Alarm sound library

The following 22 sounds are sourced from the Ambient Sounds library and are marked CC0 1.0 in its manifest. Seven are recorded field sounds; 15 are original procedural soundscapes. Web previews stream from versioned GitHub releases. Android builds download and transcode local copies into MP3 resources so alarms can play offline.

| UP sound | Creator / source | Licence |
|---|---|---|
| Rain on the Window | barkenov · [Freesound 640655](https://freesound.org/people/barkenov/sounds/640655/) | CC0 1.0 |
| Rainstorm | Leminno original sound design | CC0 1.0 |
| Rain on a Tin Roof | Leminno original sound design | CC0 1.0 |
| Rain in the Leaves | Leminno original sound design | CC0 1.0 |
| Little Brook | SamsterBirdies · [Freesound 584269](https://freesound.org/people/SamsterBirdies/sounds/584269/) | CC0 1.0 |
| River Current | JW_Audio · [Freesound 810231](https://freesound.org/people/JW_Audio/sounds/810231/) | CC0 1.0 |
| Ocean Shore | Leminno original sound design | CC0 1.0 |
| Open Window | keweldog · [Freesound 181801](https://freesound.org/people/keweldog/sounds/181801/) | CC0 1.0 |
| Wind Through Pines | Leminno original sound design | CC0 1.0 |
| Forest Morning | Sadiquecat · [Freesound 799439](https://freesound.org/people/Sadiquecat/sounds/799439/) | CC0 1.0 |
| Jungle Canopy | Leminno original sound design | CC0 1.0 |
| Meadow at Dawn | Leminno original sound design | CC0 1.0 |
| Campfire | Leminno original sound design | CC0 1.0 |
| Fireplace | Leminno original sound design | CC0 1.0 |
| Miso's Purr | Trautwein · [Freesound 260881](https://freesound.org/people/Trautwein/sounds/260881/) | CC0 1.0 |
| Night Owl | Leminno original sound design | CC0 1.0 |
| Frogs by the Pond | Leminno original sound design | CC0 1.0 |
| Quiet Room | TimBahrij · [Freesound 234918](https://freesound.org/people/TimBahrij/sounds/234918/) | CC0 1.0 |
| City from Afar | Leminno original sound design | CC0 1.0 |
| The Quiet Observatory | Leminno original sound design | CC0 1.0 |
| Soft Clockwork | Leminno original sound design | CC0 1.0 |
| Cabin Ambience | Leminno original sound design | CC0 1.0 |

- Library manifest: [Leminno-org/ambient-sounds-library](https://github.com/Leminno-org/ambient-sounds-library)
- Licence: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)
- The creator and source details are retained as courtesy attribution even though CC0 does not require attribution.

Web previews require an internet connection. Android native alarms use compressed assets bundled at build time. iOS AlarmKit currently uses the system alarm sound; selected custom audio is not yet wired into Apple's alarm presentation.
