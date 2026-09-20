<p align="center">
  <strong>English</strong> · <a href="CAMERA_TESTS_ES.md">Español</a>
</p>

# The 14 recipes, re-run here

LoopForge verified its fourteen shots on an RTX 5090 at 1344x768, with its own characters and
locations. These are the same recipes, exactly as the Prompt node's buttons write them, on a
different character and different locations, on a 16 GB RTX 4060 Ti.

**Shared settings:** MiniMax H3 Singularity ref2va int8, one character plate and no background
plate, `ref_image_size: max`, 124 frames (192 where noted), 20 steps, `res_multistep` / `simple`,
seed 552013742, turbo LoRA off, no upscale or refinement pass. The camera tests rendered at
288x512 (9:16, 0.15 MP), and the orbit was also confirmed at 480x832: **resolution did not change
the camera behaviour**, only the detail in the image.

## Results

| Shot | Result | What you see |
| --- | --- | --- |
| Crash zoom | ✅ | Locked-off wide for about two seconds, one violent zoom to a close-up, and the reaction lands **after** the zoom. |
| Yo-yo zoom | ✅ with caveats | All three phases fit in 192 frames, but the wide section runs long. LoopForge also records it as imperfect. |
| Dolly zoom | ✅ | The subject holds its size and position while the background recedes and spreads apart. |
| Snorricam | ✅ partial | The face stays dead-centre at constant size, which is the shot; the background moves little in an empty meadow. Use a place with nearer landmarks. |
| Rack focus | ✅ | Static frame, focus travels from the near subject to the two figures behind. Needs `<Picture 2>` and `<Picture 3>`. |
| Split screen | ✅ | Three panels open one after another, then run in sync. At 9:16 the panels are very narrow: prefer 16:9. |
| Whip pan | ✅ | Real smear through the middle, and the shot ends held on the second subject. Needs `<Picture 2>`. |
| Dutch angle | ✅ seed-dependent | On another seed the frame tilts progressively and ends canted. On LoopForge's seed at 9:16 it ran backwards (opened canted, levelled out), and at 16:9 it rendered canted from the first frame. Watch the first render and change the seed if it runs backwards. |
| Super dolly in | ✅ | Extreme wide, near trunks sweep out of frame, ends in a tight close-up. |
| Eyes in | ✅ | Travels past the face until the eye fills the frame edge to edge. |
| Aerial pullback | ✅ | Rises and retreats until the subject is a small lone figure. |
| Handheld | ✅ | Tracks the running subject, lurching and correcting with every stride. |
| 360° orbit | ✅ | Front → one profile → rear → the **opposite** profile → front, in one direction. |
| Crane rise | ✅ | Starts at foot level, climbs and tilts down. It does not reach straight overhead. |

## Five things we learned here

**Length decides the orbit.** At 124 frames (5.17 s) the circle completes. The same recipe at 192
frames (8 s) does not close it: it reaches the rear and comes back along the same side. The model
compresses the move into its own window and pads the rest.

**A sentence that pins the opening kills the move.** Adding *"The frame opens level, the horizon and
every vertical perfectly straight"* to the dutch angle left the frame level from start to finish.
It is the same effect LoopForge measured with a background plate and with impossible poses.

**The dutch angle depends on the seed.** Three renders of the same recipe gave three different
things: backwards, canted from the start, and correct. It is the only one of the fourteen that
needed the first result watched and re-run. Changing the seed is enough; the text does not need
touching.

**A scene written for another shot does not carry over, and it shows late.** The split screen came
out right on its own scene and came out broken when it was run over the orbit's scene: the camera
text ended up describing the armchair instead of the action. The recipe supplies the camera; the
scene has to be that shot's own.

⚠️ **Unconfirmed:** in that failed render the model painted the character sheet's panels (face,
front, back) instead of the three angles, which looked like the fault of naming those panels in
`subject_definitions`. But the render that worked carries the same sentence. Too much differs
between the two to blame either: watch the first render before rewriting anything.

**The recipe works on a seated subject.** The orbit circles someone sitting in an armchair, as long
as they are already seated when the shot starts. Put the act of sitting down inside the shot and it
eats the camera move.
