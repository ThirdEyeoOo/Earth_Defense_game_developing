---
name: weapon-modules
description: Use when adding, swapping, or debugging Earth Defense weapon modules / turrets mounted on units (F-22, UFO) — projectiles, muzzle/origin placement, fire animation, sizing, or damage, in the FTL combat window or on the 3D globe.
---

# Weapon modules (Earth Defense)

## Core model
A weapon is a **data id** (`WeaponModuleId`) with two registries on opposite sides of the sim/render boundary, fired by a **real-time** engine, and rendered as **DOM/SVG only — never a Three.js mesh** (even though the SVG is solid-fill; DOM keeps all weapons one interchangeable mechanism).

- **Stats (sim, pure):** `src/sim/weapons.ts` → `WeaponModuleId` union + `WEAPON_STATS[id] = { cooldownGameMinutes, damage }`. Cadence is in **game-minutes** (real-time, scales with speed / freezes on pause).
- **Art (render):** `src/render/weaponModules.ts` → `WEAPON_MODULES[id] = { raw, viewW, viewH, fireStyleLoop, fireStyleOneShot }`. Fire CSS is scoped `.weapon-module.on #…`.
- **A unit declares its weapon** via one config field: `CONFIG.squadron.weaponModule` (F-22) / `CONFIG.ufoAbductor.weaponModule` (UFO), `satisfies WeaponModuleId`. One weapon id per unit type today.
- **Asset:** `Assets/<faction>/Armamenti/<name>.svg` (+ `.integration.json`), route `dom`, header `<!-- ed-asset … -->` (see `docs/EARTH-DEFENSE-ASSET-RULES.md`). Muzzle points "up" (−Y). Animate via `id`'d parts driven by `.weapon-module.on` descendant selectors.

## Combat engine (real-time, bidirectional)
`src/render/combatEngine.ts` (`CombatEngine`), ticked from `main.ts` with `(state, gameMinutes, speed)`. Reads `activeBattles(state)` (`src/sim/combat.ts`, the single source of "who fights"). Each **hardpoint = a fire source** keyed `kind:id:side` (`SIDES=['left','right']`, right offset half a cooldown). Emits `Shot { id, weapon, damage, from:{kind,id,side}, to:{kind}, t0, t1, landed }`; at `t1` applies damage **once** via `cmdDamageSquadron` / `cmdDamageUfo` (UFO death → `removeUfo(...,'shotDown')`). `speed > HIGH_SPEED` (10) = block resolution (no projectiles); the per-shot loop is capped (`MAX_QUEUED` for projectiles, `BLOCK_CAP` for block) — **the cap must not throttle a high-cadence weapon below its rate** or fast weapons lose their DPS advantage. A new weapon needs **no engine edits**.

## Two render routes
| Host | Globe | Combat window |
|---|---|---|
| **UFO** (DOM overlay) | turret nested in UFO SVG shadow at `#hardpoint-left/right`; muzzle via `ufos.turretMuzzleRect` (`ufoLayer.ts`) | turret as overlay div over the UFO hardpoint (`combatWindow.ts`) |
| **F-22** (Three.js **mesh**) | screen-space DOM overlay in own shadow root, placed by projecting the real hardpoint `units.projectSquadronPoint(id, x, y, camera)`; muzzle via `minigunMuzzleRect` (`squadronWeapons.ts`) | weapon **nested inside the inline jet SVG** (`mgGroup` → `JET_WITH_MG`) so it inherits the jet's rotation/scale |

## Adding a weapon module — checklist
1. `Assets/<faction>/Armamenti/<name>.svg` + `.integration.json` (mirror `minigun-rotante.*`).
2. `src/sim/weapons.ts`: add id to union + `WEAPON_STATS` entry.
3. `src/render/weaponModules.ts`: import `?raw`, add registry entry with `fireStyleLoop`/`fireStyleOneShot` (keyframes scoped `.weapon-module.on #…`).
4. `src/sim/config.ts`: point the unit's `weaponModule` at it.
5. **FX branch (TWO files + CSS):** `combatFx.ts` (`proj`/`spawnImpact`) and `combatWindow.ts` (`renderShots` `tracer = …`, `ensureProj`, `impactAt`) select visuals by `shot.weapon`; add `style.css` classes/keyframes. Skip this → the new weapon renders with another weapon's style.
6. If on the **F-22 in the combat window**: the nested-group transform `translate(x 190) scale(0.34375) translate(-32 -16)` is tuned to the minigun viewBox/pivot — **recompute scale + recenter for a different asset**.
7. i18n only if a user-visible string is added (the id is internal).

## Gotchas (the non-obvious ones)
| Pitfall | Fix |
|---|---|
| Projectiles spawn **off the unit / both barrels from one point** | A `r=0` muzzle anchor (`#bocca_3`) gives a **degenerate `getBoundingClientRect`**. Use the weapon group's **bbox edge toward the target** (`muzzleEdge`) in the window, and a computed screen point (`minigunMuzzleRect`) on the globe. `combatFx` falls back to unit center if the muzzle is null. |
| Weapon **too big / looks at wing tip** on the globe | Match the window's proportion: `MINIGUN_TO_JET_WIDTH ≈ 0.11` (= asset 64×0.34375 / jet 200). Keep `MIN_PX` low so it shrinks with tiny patrol jets. |
| New weapon **looks like the other faction's** projectile | The `shot.weapon === '…'` FX branch is binary in `combatFx.ts` **and** `combatWindow.ts` — extend both + CSS. |
| Combat-window animation **doesn't fire / wrong element** | The inline jet art is **id-stripped (`sanitize`) and CSS-rotated 90°** (nose → right). Drive animation by `.weapon-module.on` **descendant** selectors (not ids); ids collide across the two wing groups. |
| `.on` collides with the UFO beam | Fire CSS is `.weapon-module.on #…` (scoped), never bare `.on` — the UFO SVG uses `.on` for its abduction beam. Globe = `fireStyleLoop` (toggle by engagement); window = `fireStyleOneShot` (timed `.on` per shot, `ON_DURATION_MS`). |
| Weapon **steals clicks** / missing in transfer | Mount host `pointer-events:none` (squadron picking is a raycaster). Mount weapons in patrol **and** transfer. |
| Hardpoint projection wrong on the mesh | `projectSquadronPoint` maps SVG `(x,y)` → model space with the same flip/scale as `buildSvgModel` (`(x-100, -(y-150))·sModel`), then `localToWorld` → screen. Hardpoints `HARDPOINTS={left:{53,190},right:{147,190}}`. |

## Key files
`sim/weapons.ts` · `sim/combat.ts` (`activeBattles`) · `sim/commands.ts` (`cmdDamage{Squadron,Ufo}`) · `sim/config.ts` · `render/combatEngine.ts` · `render/weaponModules.ts` · `render/squadronWeapons.ts` · `render/combatFx.ts` · `render/units.ts` (`projectSquadronPoint`, `squadronRect`) · `render/ufoLayer.ts` (`turretMuzzleRect`, `ufoBodyRect`) · `ui/combatWindow.ts` · `ui/style.css`.
