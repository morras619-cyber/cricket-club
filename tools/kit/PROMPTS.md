# Image prompts for new player animation sheets

Written from the real sheets in `tools/kit/src/` (measured, not guessed). Paste the MASTER STYLE BLOCK
at the top of every prompt, then ONE sheet block, then the NEGATIVE block. Always attach a reference sheet
(see "References") and say "match this sheet's drawing style, line weight, colours, proportions and scale exactly".

---------------------------------------------------------------------------------------------------
## MASTER STYLE BLOCK (paste first, every time)

```
Character pose sheet for a 2D mobile cricket game. Hand-inked comic-book style: confident black ink
outline, flat cel shading with exactly two tone steps per colour (base + one shadow) and one small
highlight, no gradients, no texture, no halftone, no painterly blur. Semi-realistic athletic proportions
(adult man, 1.85 m, about 7.5 heads tall), muscular but not exaggerated. NOT chibi, NOT photoreal.

LINE: solid near-black ink #030309. Outer silhouette line about 0.5% of the figure height
(on a 640 px tall figure: 3 px; never thinner than 2 px, never thicker than 4 px). Inner lines (folds,
fingers, seams) about half that weight, same colour. Lines are clean, continuous, no sketchy double lines,
no coloured outlines, no glow, no drop shadow.

COLOURS (use exactly these; shades are the cel-shadow step, not new colours):
- Shirt and trousers (the club kit, always this blue):  base #016BFB   shadow #0242CA   highlight #0578F9
- Trim (collar, sleeve cuffs, side stripe, belt piping): base #FAF20A   shadow #F4C546
- Skin:                                                  base #FCB87C   shadow #F6AD6E
- White (boots, gloves, pads, ball seam):                base #FDFCFC   shadow #D9DDE6
- Boot soles and studs, bat handle grip:                 #0242CA and #030309
- Ball: red #D2232A with a white seam #FDFCFC
Do not use any other hue on the figure. No logo, no text, no name, no number, no crest on the kit
(they are added by the game).

BACKGROUND: one flat solid magenta #FF00FF filling the whole image. No ground, no shadow under the
feet, no gradient, no vignette, no frame. The figures never touch each other or the image edge; leave at
least 60 px of magenta between neighbouring poses.

SCALE AND CAMERA: every figure on the sheet is the same size: a 1.85 m player stands exactly 640 px from
boot sole to top of head (cap/helmet included for fielders), image 1984 x 793 px, landscape. Camera is
the same for all poses: slightly above head height looking down about 12 degrees, no perspective
distortion, no fisheye. Each pose is shown full body, feet fully visible, limbs never cropped.
Poses are laid out left to right in the order listed, in ONE row (up to 5 poses per sheet).

CONSISTENCY: the SAME man in every pose: same face, same build, same kit, same cap/helmet shape.
Only the pose changes. Keep the shirt cut (polo with collar, short sleeves with yellow cuffs) and
trousers (straight, yellow side stripe) identical in every pose.
```

---------------------------------------------------------------------------------------------------
## NEGATIVE BLOCK (paste last)

```
Do NOT draw: any background other than flat #FF00FF, ground or shadow, text, numbers, logos, watermarks,
speech bubbles, motion lines, speed lines, dust, extra people, extra limbs, merged or missing fingers,
different kit colours, hair on the bowler sheets (bald head), a different face between poses, crops,
foreshortened giant hands, rainbow or neon colours, 3D render look, glossy plastic shading, soft airbrush,
sketch lines, a drawn ball in mid-air (the game draws the ball), anything outside the listed poses.
```

---------------------------------------------------------------------------------------------------
## References to attach (so the generator copies the real style)

- Bowler from behind (10 poses): `img/kit/back.webp` (shown on magenta in `back_prev.png`)
- Bowler from the front (10 poses): `img/kit/front.webp`
- Spinner (15 poses, premium kit): `img/kit/spin-back.webp`, `img/kit/spin-front.webp`
- Batter from behind (26 poses): `img/kit/bat-back.webp`
- Fielders, keeper, non-striker (the 10 source sheets): `tools/kit/src/field-sheets/*.png`
  (1-ready, 2-run-away, 3-run-side, 4-run-turn, 5-dive, 6-catch, 7-keeper-front, 8-keeper-back,
  9-nonstriker, 10-walk). These are the exact format to match: 1983 x 793, magenta, poses in a row.

Tell the generator: "The attached image is the style reference. Draw new poses of the same man in the same
style, same line weight, same colours, same scale. Do not copy its poses."

---------------------------------------------------------------------------------------------------
## What the game does with the sheets (why the rules above matter)

- Magenta is keyed out, so it must be flat. Kit blue / trim yellow / skin are re-coloured per club and per
  player by colour region, so the three hues above must stay distinct and unmixed (no blue skin shadows,
  no yellow highlights on the blue).
- Bowlers are BALD on purpose: hair, beards and caps are separate layers drawn on top.
- Fielders and keepers show a face and wear a blue cap (fielders) or helmet (keeper), as in the sources.
- Name and number are printed by the game on the back of the shirt: keep the back of the shirt plain.
- Left-arm bowlers do NOT need drawing: the game can mirror right-arm sheets. Draw right-arm only.
- One pose = one clear key moment. The game plays them in sequence, so neighbouring poses must be
  reachable in about 60-100 ms of motion (small change between frames in a run, big in a leap).

---------------------------------------------------------------------------------------------------
## SHEET BLOCKS (paste one after the master block)

Each bowler action is drawn TWICE: once from behind (camera behind the bowler, used when you bowl) and
once from the front (camera in front of the bowler running toward us, used when you bat). Use the same
prompt twice, changing only the VIEW line. 10 poses = two sheets of 5.

### B1. EXPRESS FAST BOWLER (long run-up, big leap)

```
SHEET: right-arm express fast bowler, bald, no cap. VIEW: [from directly BEHIND | from directly in FRONT,
running toward the camera]. 5 poses per sheet.
Sheet 1:
1. Standing at the end of his run, weight on the front foot, leaning slightly forward, ball held in the
   right hand at the chest, left hand over it, eyes on the target.
2. Early run-up stride: body 10 degrees forward lean, knees driving high, elbows bent at 90 degrees,
   ball in right hand pumped at hip height.
3. Full sprint: 20 degrees forward lean, long stride, back foot kicked up behind, both fists clenched,
   ball hand tight to the chest.
4. The gather: last stride, body upright, left knee driving up high, both arms rising, ball hand lifting.
5. The leap: both feet off the ground, body turning side-on, left arm reaching high toward the target,
   right arm cocked back behind the hip, back arched slightly, legs scissored.
Sheet 2:
6. The coil (back foot lands): side-on, left arm pointing up and out at the target, right arm straight
   back holding the ball, chin over the front shoulder, knees bent and loaded.
7. Front foot plants: front leg braced straight, chest rotating to the camera, left arm pulling down
   hard to the hip, right arm vertical above the head at release, ball just leaving the fingertips.
8. Follow-through 1: right arm swinging down across the body, trunk bent forward 50 degrees, back leg
   whipping through off the ground.
9. Follow-through 2: bent almost double, right hand near the left knee, back foot landing in a stride
   forward, head up looking down the pitch.
10. Recovery: upright jog, both arms loose, eyes on the batter, breathing hard, chest heaving.
```

### B2. MEDIUM-PACE SEAMER (short run, upright, repeatable)

```
SHEET: right-arm medium-pace seam bowler, bald, no cap. VIEW: [BEHIND | FRONT]. Short, rhythmic,
upright run (about 8 strides). Poses:
1 standing at his mark, ball in both hands at the chest; 2 jogging stride, upright, relaxed arms;
3 quicker stride, ball in right hand; 4 gather: left knee up, left arm rising, body upright, hardly
leaning; 5 coil: side-on, left arm pointing at the target, ball hand behind the hip, little leap;
6 front foot plants, right arm straight up above the head at release, wrist behind the ball (seam
upright); 7 follow-through, arm across the body, trunk bent 30 degrees; 8 follow-through 2, running on
down the pitch, hands low; 9 straightening up; 10 walking back, wiping the ball on the trouser.
```

### B3. OFF-SPINNER (short skip approach, finger flick)

```
SHEET: right-arm off-spin bowler, bald, no cap, a short walking-skipping approach of 3 strides, stays
upright and balanced. VIEW: [BEHIND | FRONT]. Poses:
1 standing, ball in right fingers at the chest, left hand cupped under it; 2 first step, left foot
forward, shoulders level; 3 second step, small hop, ball hand rising; 4 side-on gather, left arm up and
pointing, ball hand tucked under the chin; 5 arm going over, right arm vertical, wrist cocked, fingers
spread across the seam; 6 release: the hand FLICKS down the off side of the ball, fingers clearly
clockwise, front knee braced; 7 follow-through, right arm across the left hip, body rotated;
8 balanced finish on the front foot, back leg trailing; 9 straightening, watching the ball; 10 standing,
hands on hips, eyes on the batter.
```

### B4. LEG-SPINNER (skippy, big wrist action)

```
SHEET: right-arm wrist-spin (leg-spin) bowler, bald, no cap. Short bouncy run of 5 skipping strides with a
small hop before delivery. VIEW: [BEHIND | FRONT]. Poses:
1 standing, ball in the fingertips of the right hand, held up in front of the face for a moment;
2 bouncy first stride, up on the toes, arms swinging; 3 second skipping stride, both feet briefly off the
ground; 4 the hop: both feet in the air, body turning side-on, left arm up and pointing, ball hand behind
the ear; 5 loaded: back foot landing, wrist cocked back sharply, elbow high; 6 release: arm high and
loose, wrist whipping over the top, fingers fanned, the hand seen tilting toward the body (leg-break
grip), front leg braced; 7 follow-through: arm sweeping across, shoulder dropping, trailing leg kicked
up; 8 follow-through 2, hands apart, stumbling forward a half step; 9 straightening, eyes on the ball;
10 standing, shrugging both shoulders.
```

### B5. SLINGY ROUND-ARM BOWLER (low arm, whipping)

```
SHEET: right-arm round-arm slinging bowler (very low arm, almost sidearm, like a yorker specialist),
bald, no cap, a bouncy 10-stride run. VIEW: [BEHIND | FRONT]. Poses:
1 standing, ball in the right hand at the hip; 2 bouncing stride, arms low and loose; 3 faster stride,
head tilting to the left; 4 gather: left arm pointing, body leaning sideways to the left, right arm
trailing low behind; 5 loaded: side-on, hips thrust forward, right arm swinging back and low at knee
height; 6 release: right arm whipping around at SHOULDER height (arm horizontal, elbow straight),
ball leaving the hand, head tilted away; 7 follow-through: arm sweeping across the chest, body falling
away to the left; 8 off balance, left foot catching the ground, right leg trailing; 9 recovering, hands
low; 10 standing and shaking the right arm out.
```

---------------------------------------------------------------------------------------------------
## FIELDING SHEETS (camera slightly above, figure as in the sources: face visible, blue cap, yellow trim)

Fielder sheet rules (add to the master block): the fielder is clean-shaven
exactly as in `tools/kit/src/field-sheets/1-ready.png`: blue cap with yellow stitching and peak, clean
shaven, plain face with simple eyes and brows (the game paints skin tones over #FCB87C regions).
Boots white with blue soles. No gloves except the keeper (white keeping gloves).

### F1. DIVES (replace/extend `5-dive.png`: dive RIGHT; the game mirrors it for dive LEFT)

```
SHEET: fielder diving to his RIGHT, side view, 5 poses.
1. The push-off: low crouch, left leg drives, body tilted 30 degrees toward the right, right arm reaching
   across, left arm trailing.
2. Take-off: body parallel to the ground 40 cm up, both arms stretched out in front toward the ball,
   head up and eyes on the ball, legs trailing straight behind.
3. Full stretch: body flat and horizontal at maximum height, right hand open and reaching (palm toward
   the ball), left arm along the body, boots off the ground behind.
4. The grab: right hand clamped around a red cricket ball at the fingertips, arm fully extended,
   chin up, ground still not touched.
5. The landing: chest and left forearm sliding on the ground, ball held up in the right hand, legs
   trailing, head up looking at the ball.
```

Other dive sheets (same format, one prompt each):

```
F2 DIVE FORWARD (toward the camera, head first): 1 sprint, leaning 25 degrees; 2 launch, both feet
   off the ground, arms forward, seen head-on, foreshortening kept modest; 3 flying, body horizontal, both
   hands cupped in front; 4 ball caught in both hands at the fingertips; 5 landing on the chest, ball held.

F3 SLIDING STOP (knee-slide to stop the ball on the boundary): 1 sprint toward the ball; 2 drops to one
   knee, left leg forward, right knee skimming the ground, arms reaching low; 3 slide: right knee and shin
   on the ground, left foot ahead, right hand scooping a ball at ground level; 4 ball gathered, torso
   twisting toward the throw; 5 pushing up on the back foot, ball in the hand, cocking the arm.

F4 ONE-HANDED OVERHEAD JUMP CATCH: 1 running back, head turned over the shoulder; 2 leaping, both
   feet off the ground, left arm out for balance, right hand reaching high; 3 apex: body stretched,
   right hand wide open above the head, red ball in the palm at the fingertips; 4 landing, knees bent,
   ball clenched in the raised right hand; 5 standing, ball held up, mouth open (shout).

F5 RUNNING CATCH OVER THE SHOULDER (back view): 1 sprinting away, head turned; 2 reaching both hands
   forward over the shoulder; 3 the ball arrives into both hands; 4 slowing, cradling the ball against
   the chest; 5 turned to face the camera, ball held up.

F6 LOW SLIDING CATCH (shin-high): 1 running forward, hands low; 2 dropping onto one knee; 3 right hand
   scooping under the ball inches off the grass; 4 ball held in the palm, wrist turned up; 5 rolling onto
   the shoulder, ball held up.

F7 THROWS (side view): 1 gathering the ball, bent low; 2 the crow-hop, back leg crossing in front;
   3 arm cocked back, ball at the ear, left arm pointing at the target, chest open;
   4 release: arm fully extended forward-up, ball leaving the fingertips (no ball drawn in flight);
   5 follow-through: right shoulder dropped, trailing leg off the ground.

F8 UNDERARM FLICK (run-out flick): 1 charging at the ball; 2 scooping it with the right hand;
   3 the flick: arm swinging low from the knee, wrist snapping, ball at the fingertips; 4 follow-through,
   hand pointing at the stumps, body low; 5 standing with both hands on the knees.

F9 KEEPER STUMPING DIVE / TAKE (keeper sheets 7 and 8 style, helmet, white gloves, white pads):
   1 crouched low, gloves open; 2 rising, right glove stretching for a wide ball; 3 full-stretch dive, both
   gloves out; 4 ball clasped in both gloves, face up; 5 whipping the bails off: right glove sweeping to
   the stumps with the ball.
```

---------------------------------------------------------------------------------------------------
## CELEBRATION SHEETS (all poses facing the camera, same kit, bowler bald and fielder with cap)

```
C1 WICKET: 1 both arms raised, fists clenched, mouth open in a shout; 2 pointing at the batter with the
   right arm, left fist down; 3 pointing to the sky with the right index finger; 4 sprinting forward,
   both arms spread like wings; 5 the knee-slide: sliding on both knees, arms wide, head back.

C2 FIFTY / HUNDRED (batter, helmet on, bat in hand): 1 bat raised overhead in one hand; 2 bat raised, the
   other hand pointing to the sky; 3 helmet off, held out to the crowd, bat under the arm; 4 kissing the
   crest on the chest (right hand over the chest); 5 both arms wide, bat in the right hand, looking up.

C3 TEAM: 1 two fielders in a high five (draw ONE man, his right hand raised to meet an invisible hand);
   2 chest bump, one man leaning in, shoulder forward; 3 hug: arms out wide; 4 team huddle:
   arms around imaginary shoulders on both sides; 5 both fists pumped, shouting at the sky.
```

---------------------------------------------------------------------------------------------------
## Quick quality checklist (check each generated sheet before sending)

1. Background is ONE flat magenta (#FF00FF, not purple, not gradient). No shadow.
2. Outline is thin black ink, about 3 px on a 640 px figure. No coloured outline.
3. Kit blue is #016BFB with exactly one darker shadow (#0242CA); trim yellow #FAF20A; skin #FCB87C.
4. Same man, same kit, same size, same camera in every pose; feet visible; nothing cropped.
5. Number and name absent; crest absent; ball in flight absent.
6. Left to right in the listed order; at least 60 px of magenta between poses.
7. Hands have five fingers or a believable fist/glove; boots white with blue soles.

Send the sheets as PNG (not JPEG: JPEG blurs the magenta key) at 1984 x 793 or larger.

---------------------------------------------------------------------------------------------------
## SPINNERS WEAR THE PREMIUM KIT (use this instead of the standard kit lines for B3 and B4)

The game's spinner sheets (`img/kit/spin-front.webp`, `spin-back.webp`) are drawn in three colours, not two.
Replace the COLOURS line of the master block with:

```
Shirt and trousers main blue base #0164F3 (shadow #0242CA); a NAVY yoke across the shoulders and navy side
panels down the shirt and trousers, base #031545 (shadow #020C2A); thin YELLOW piping along the navy edges,
collar and cuffs, base #F6F416 (shadow #F4C546). Skin base #FCAA6E (shadow #F6A064). White boots #FDFCFC.
```

Attach `ref-spinner` sheets (`img/kit/spin-front.webp`, `img/kit/spin-back.webp` on magenta) as the style reference.

## Measured on the first generated pace sheets (front + back, 10 poses each)

Outline about 2 px near-black navy, blue #0163F2/#016AF5, yellow #FAF409, skin #FCAC6B, flat magenta
(237,6,224, std 2): all inside the spec. Figures are about 380 px tall (spec 640): fine, the build rescales
by measuring, but ask for 640 if the generator allows. Keep the back of the shirt plain: yellow seam lines
down the back cross the name-and-number print.
