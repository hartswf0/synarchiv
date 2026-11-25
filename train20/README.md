# Bees on a Train — the sealed line (`train-brain20.html`)

> This train now also lives in make-photo as the level `train/` ("The Sealed Line"), where it runs on make-photo's cast, joins the overworld at its halts, and has authored camera moves and seeds for world-model takes. New work goes there; this copy is the first version.

A train you can walk through, built to be filmed inside. The locomotive and seven carriages cross a looping
highland route; each carriage has a threshold that opens onto worlds made from the project's own train footage
and from generated keyframes. `train-brain19.html` now forwards here (`?legacy` keeps the old simulator,
`?film19` its first film mode).

## Playing it

| | Phone | Desktop |
|---|---|---|
| Move the traveler | left thumb stick | W A S D or arrows |
| Aim the lens | drag anywhere | drag |
| Change focal length | pinch | wheel |
| Stand, sit, step through a threshold | the brass button | E |
| Change camera position | the ribbon along the bottom | 1–9, or C for the next |
| Run the unattended take | ▶ | T |
| Still, recording, sound, hide interface | top right | P, –, –, H |

URL parameters: `?shot=track`, `?take`, `?world=f997_window`, `?at=3200` (metres along the route),
`?footage=<base url>` to read clips from somewhere other than the el-desierto pages.

## The train

| # | Carriage | What it holds | Opens onto |
|---|---|---|---|
| 0 | Locomotive | cab, long hood, the hatch | the sacred engine (W-0063), clip 1020, the Lumière arrival |
| 1 | Quiet car | bench bays, the traveler's seat and coffee cup | clip 997 (highland noir), W-0046, Amba halt |
| 2 | Dining car | linen tables, lamps, the violinist | clip 092, W-0079, clip 1022 |
| 3 | Greenhouse | glass roof, planters, hive boxes | W-0073, clip 870, the impossible hive |
| 4 | Apiary car | painted hive panels, vitrines, hanging hives | W-0108, clips 1022 and 870 |
| 5 | Mirror corridor | compartments and the gilt mirror | clip 1007 |
| 6 | Surveillance car | monitor walls playing the archive | Genome II, clips 995, 866, 861 |
| 7 | Cinema car | velvet rows, projector, screen | La Ciotat (clip 866), W-0206, clip 1020 |

The route is 9 km and loops: viaduct, tunnel, a salt lake at dusk, Amba halt (the train stops for a quarter of
a minute), the impossible hive on the horizon, a second tunnel. The train is the fixed frame and the land is
resampled under it, so the interior never jitters and a camera can be attached to anything.

## The camera rig (`js/rig.js`)

A shot is one entry: what it is attached to, a lens, and a function from the shared context to a position and
a look-at point. Sixteen ship: with the traveler (follow, profile, eyes), in the carriage (aisle, window, CCTV),
with the bee, on the train (lean out, tracking, wheels, roof, engine, tail, witness) and from the land
(Lumière, vista), which stay put while the train passes.

`trainFilm.rig(1280, 720)` returns every shot as a posed pinhole camera in the train's frame (three.js axes,
metres), in the shape Atlas takes as `targetCameras`. That is the hand-off for any generator that accepts
camera poses: the same sixteen positions can be asked of a real carriage reconstruction or a Genie take.

## World slots (`data/worlds.json`)

A world is an image, a 16-bit inverse-depth map, a field of view and a near and far distance. On the train it
is drawn as a pane with depth parallax. Stepping through builds the same two files into a relief you can move
inside. Footage worlds also carry their clip and the shot boundaries around the chosen frame, so the clip can
play across the relief without crossing a cut.

To add a generation (a Genie take, a new keyframe, another clip): put `<id>.jpg` and `<id>.depth.png` in
`assets/worlds/`, add the entry to `worlds`, and list the id under a carriage in `cars`. Nothing else changes.

## Where the pictures came from (`tools/`)

- `atlas_gen.py keyframes.json out/` — text to image with metric depth (World Labs Atlas `atlasTextToImage`).
  Twelve carriage and landscape keyframes, two horizon panoramas and three flat textures. Prompts are in the
  job files and repeated per world in `worlds.json`.
- `footage_depth.py footage.json out/` — pulls one frame from an el-desierto final and asks Atlas
  `images2PosedRGBD` for its camera and depth. 24 frames from clips 092, 861, 866, 870, 995, 997, 1007, 1020, 1022.
- `pack_world.py` — packs an image and its depth EXR into the two web files and prints the registry numbers.

Set `ATLAS_API_KEY`. The tools need `curl`, `ffmpeg`, Pillow, NumPy and OpenEXR.

## Scripting

`window.trainFilm`: `camera(id)`, `take()`, `act()`, `stand()`, `sit()`, `walkTo(car)`, `enter(worldId)`,
`exit()`, `next(±1)`, `live()`, `swarm()`, `jump(km)`, `still()`, `record()`, `observe()`, `log()`, `rig()`.
`observe()` reports position, carriage, shot, route segment and draw statistics, which is what a vision agent
or a test needs to check that an event happened.

## Credits

People and motion: the Dawn Wellhead figures and Mesh2Motion clips from make-photo's Motion Lab, both CC0,
with its retargeter. three.js r160 (MIT). Notices are in `assets/licenses/`.
