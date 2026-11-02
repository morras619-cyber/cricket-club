# Spinner sheets: the exact prompts (v2, pace-bowler quality)

Why a new pack: the pace bowler's figures are about 580 px (front) and 563 px (back) tall in the game's sheets.
The spinner sheets so far were 365 to 440 px, because 15 poses were packed into one picture, so the game had to
stretch them. Everything below is built to fix that: **5 poses per picture, 640 px per figure.**

What to generate, per view (back and front), per action (off-spin and leg-spin):
**3 pictures x 5 poses = 15 poses.** That is 6 pictures per action, 12 in all. Do the off-spinner first.

How to work (important):
1. Generate **picture 1** of a view first. Check it against the checklist at the bottom.
2. Attach picture 1 as the reference for pictures 2 and 3 of the same view, and say "same man, same kit, same size".
3. Do the other view the same way. Do not attach the fast bowler's sheets as a pose reference: the generator copies the poses.
4. Send me the pictures as **PNG**. I measure figure height, colours, outline and handedness before anything is wired.

---------------------------------------------------------------------------------------------------
## 1. MASTER BLOCK (paste first, every time)

```
Character pose sheet for a 2D mobile cricket game. One horizontal row of exactly 5 poses of the SAME man,
on a flat magenta background. Hand-inked comic-book style, like a premium mobile sports game: confident
near-black ink outline, flat cel shading with exactly two tone steps per colour (base + one shadow) and a small
highlight, no gradients, no texture, no halftone, no painterly blur, no airbrush. Semi-realistic athletic proportions
(adult man, about 7.5 heads tall), lean spin-bowler build, not bulky. NOT chibi, NOT photoreal, NOT a 3D render.

IMAGE SIZE: 2048 x 900 px, landscape. Five poses laid out left to right, in the order listed, in ONE row,
each centred in its own fifth of the image (about 410 px wide), at least 70 px of magenta between neighbouring
figures and from the image edge. Nothing is cropped. No labels, no numbers, no text anywhere.

SCALE (very important): in the standing pose the figure is exactly 640 px tall, boot sole to top of head.
Every other pose uses the SAME scale (the same man at the same distance from the camera), so a figure that is
bent over is shorter and a figure with a raised arm is taller. Never shrink a figure to make it fit.
Fill the picture: do not draw small figures in a big empty image.

CAMERA: the same for all five poses: a fixed camera at about chest height, no perspective distortion, no
fisheye, no close-up. Full body in every pose, both boots fully visible. The ground line is the same in every pose.

LINE: solid near-black ink #030309. Outer silhouette line 3 px (never under 2 px, never over 4 px). Inner lines
(folds, seams, fingers) about half that. Same colour. Clean, continuous, no sketchy double lines, no coloured
outlines, no glow, no drop shadow.

KIT (the club's premium spinner kit, use exactly these):
- Main blue (shirt body, trousers):        base #0164F3   shadow #0242CA   highlight #0578F9
- Navy yoke across the shoulders, navy side panels down the shirt sides and down the outside of the trousers:
                                           base #031545   shadow #020C2A
- Thin yellow piping along every navy edge, collar, sleeve cuffs, waistband and trouser stripe:
                                           base #F6F416   shadow #F4C546
- Skin:                                    base #FCAA6E   shadow #F6A064
- White (boots, ball seam):                base #FDFCFC   shadow #D9DDE6
- Boot soles and studs: #0242CA
- Ball: red #A00804 with a white seam #FDFCFC
No other hue on the figure. The yellow piping is CLEAN thin lines, never splashes, flames or lightning patterns.
No logo, no crest, no name, no number, no text anywhere on the kit: the game adds them. The back of the shirt
and the chest are PLAIN (only the navy yoke and the thin piping).

HEAD: completely BALD, bare scalp, no hair, no beard, no cap, no helmet, no headband. Plain face with
simple determined eyes and brows (the game adds hair and beards). A small ear on each side.

CONSISTENCY: the same man, face, build and kit in every pose and in every picture of the set. Only the pose changes.
Same polo shirt with collar and short sleeves with yellow cuffs, same straight trousers with navy side panel
and yellow piping.
```

---------------------------------------------------------------------------------------------------
## 2. HANDEDNESS BLOCK (paste after the master block, every picture)

```
HANDEDNESS (the most important rule; previous pictures broke it): this is a RIGHT-ARM bowler. The red ball is in
his RIGHT hand in every pose until it is released, and the ball is always visible (never hidden behind his body, hip or
head). His LEFT arm is the balance arm: it is the arm that points at the target, swings out wide or is held across the chest.
He never points with the right arm and never holds the ball in the left hand.

The camera tells you which side of the picture his right arm is on:
- VIEW = FROM BEHIND (camera behind him, he runs away from us): his RIGHT arm is on the RIGHT side of the picture.
  The bowling arm rises on the RIGHT of his head. The pointing arm is on the LEFT.
- VIEW = FROM THE FRONT (camera in front, he runs toward us): his RIGHT arm is on the LEFT side of the picture.
  The bowling arm rises on the LEFT of his head. The pointing arm is on the RIGHT.
Check before you finish: in every pose with the ball in his hand, the ball is on the side given above.
```

---------------------------------------------------------------------------------------------------
## 3. VIEW LINES (paste ONE after the handedness block)

```
VIEW = FROM BEHIND. The camera is directly behind the bowler, he is running away from us towards the batter.
We see the back of his head and the back of his shirt. His right arm is on the RIGHT of the picture.
```
```
VIEW = FROM THE FRONT. The camera is directly in front of the bowler, he is running toward us. We see his face and
the front of his shirt. His right arm is on the LEFT of the picture.
```

---------------------------------------------------------------------------------------------------
## 4. THE OFF-SPINNER (right-arm off-break). Paste ONE of the three pictures below.

SPIN ACTION RULES (paste with every off-spin picture, they are what makes him a spinner, not a fast bowler):
```
ACTION: right-arm OFF-SPIN bowler. A short, light, upright approach of three small walking steps. He NEVER leaps,
NEVER sprints, NEVER kicks a leg up behind him. At least one boot is touching the ground in every pose. His body
is upright (no more than 10 degrees of forward lean) except in the last two follow-through poses (at most 25 degrees).
The ball is held in the FINGERTIPS, never in the fist. At release the right wrist is cocked and the fingers FLICK
across the ball (fingers spread, index finger leading) with the arm high and straight. The front leg is braced and
planted at release. The follow-through is small and controlled: the bowling arm swings down across the body to the
left hip and he finishes balanced, on both feet, watching the ball.
```

### Picture 1 of 3: approach (poses 1 to 5)
```
1. STANDING at his mark: feet together shoulder-width apart, upright, ball held in the fingertips of the right hand at
   chest height, left hand cupped under it, eyes on the batter. (This is the 640 px reference pose.)
2. FIRST STEP: left foot forward a short step, right heel up, upright, ball still at the chest in both hands.
3. SECOND STEP: right foot forward a short step, shoulders level, ball in the right fingertips at chest height, left
   hand relaxed and loosely open at his side.
4. THIRD STEP: left foot forward, the ball hand starting to rise to shoulder height, the left arm lifting in front,
   still upright.
5. GATHER: the body turning side-on, weight on the back foot, the left arm lifting and reaching forward at shoulder
   height, the ball hand tucked in at the chin.
```
### Picture 2 of 3: delivery (poses 6 to 10)
```
6. COIL: side-on to the batter, the left arm pointing straight at the target at shoulder height, the right hand with
   the ball cocked back beside the ear, front knee slightly bent.
7. LOADED: the left arm pointing up and out, the right elbow high and the right hand with the ball behind the head,
   chin over the front shoulder.
8. ARM OVER: chest opening to the batter, the right arm rising to nearly vertical, the ball hand cocked, the left arm
   pulling down to the hip, front foot just planting.
9. RELEASE: the right arm fully vertical and straight above the shoulder, the wrist cocked and the fingers flicking, the
   ball at the fingertips at the very top, the front leg braced and straight, the left arm tucked to the chest.
10. JUST AFTER RELEASE: the right arm swinging down and out to shoulder height, the hand open with the fingers spread
    (the ball has gone, draw NO ball), the body rotating, weight on the front foot.
```
### Picture 3 of 3: follow-through (poses 11 to 15)
```
11. FOLLOW 1: the right arm sweeping across the body towards the left hip, the shoulders turning, the front leg braced.
12. FOLLOW 2: the trunk bent forward 20 degrees, the right hand low near the left knee, the left arm out for balance.
13. FOLLOW 3: bent forward 25 degrees, both arms low and loose, the back foot stepping through onto the ground beside the
    front foot.
14. STRAIGHTENING: upright again, a small step forward, both arms loosely at the sides, eyes on the ball.
15. FINISH: standing balanced, feet shoulder-width apart, both hands on his hips, chest rising, looking down the pitch.
```

---------------------------------------------------------------------------------------------------
## 5. THE LEG-SPINNER (right-arm leg-break / googly). Paste ONE of the three pictures below.

```
ACTION: right-arm LEG-SPIN (wrist-spin) bowler. A bouncy, skipping approach of five short steps with a small
hop before delivery. The hop is low: both boots are never more than 15 cm above the ground, and at least one boot
touches the ground in every pose except the single hop pose. Light on his toes. The free (left) arm is held wide and
high for balance. The right arm comes over loose and high with a big whipping wrist: at release the hand is seen
turning over, the fingers fanned, the palm turning toward his body (the leg-break grip). The front leg is braced.
The follow-through is looser and bigger than the off-spinner's: the arm sweeps right across the body, the shoulder
drops, the back leg trails and he takes a small stumbling step forward. NEVER a sprint, NEVER a fast-bowler leap or a
leg kicked up behind him.
```
### Picture 1 of 3: approach (poses 1 to 5)
```
1. STANDING at his mark, upright, the ball in the fingertips of the right hand held up in front of his face at eye
   level for a moment, the left hand open at his chest. (The 640 px reference pose.)
2. FIRST SKIP: up on the toes of the left foot, the right knee lifted slightly, the ball hand dropping to the chest.
3. SECOND SKIP: up on the toes of the right foot, arms swinging loosely, the left arm lifting out to the side.
4. THIRD SKIP: a quick light step, the left arm out wide at shoulder height, the ball hand cocked at the chest.
5. THE HOP: a small hop, body starting to turn side-on, left arm out wide, ball hand tucked behind the ear. (The only
   pose where both boots may leave the ground, by no more than 15 cm.)
```
### Picture 2 of 3: delivery (poses 6 to 10)
```
6. LANDING: the back foot lands, side-on to the batter, the left arm high and out pointing at the target, the right hand
   with the ball cocked behind the ear, knees bent.
7. LOADED: the right wrist cocked back sharply, elbow high, the left arm pointing up, chin over the front shoulder.
8. ARM OVER: the chest opening, the right arm whipping up toward vertical, the front foot planting, the left arm
   pulling down and in.
9. RELEASE: the right arm high and loose, the hand turning over, the fingers fanned, the ball at the fingertips, the
   front leg braced and straight, the left arm wide.
10. JUST AFTER RELEASE: the right arm sweeping down across the body, the hand open and turned, the shoulder dropping
    (draw NO ball, it has gone), weight on the front foot.
```
### Picture 3 of 3: follow-through (poses 11 to 15)
```
11. FOLLOW 1: the right arm swinging across to the left hip, the trailing leg lifting a little behind him (a few cm only).
12. FOLLOW 2: the shoulder dropped low, the trunk bent forward 25 degrees, the hands apart, one small stumbling step.
13. FOLLOW 3: the hands low, the back foot stepping through, the head up, eyes on the ball.
14. STRAIGHTENING: upright, both arms loose, a small shrug of the shoulders.
15. FINISH: standing, feet apart, both hands on his hips, looking down the pitch.
```

---------------------------------------------------------------------------------------------------
## 6. NEGATIVE BLOCK (paste last, every picture)

```
Do NOT draw: any background other than ONE flat magenta #FF00FF, a ground, grass, pitch or stumps, a shadow under
the feet, text, numbers, labels, pose numbers, logos, crests, watermarks, speech bubbles, speed lines, motion
blur, dust. No hair, no beard, no cap, no helmet, no headband. No yellow splashes, flames, lightning or any pattern
on the shirt. No different kit colours between poses. No different face or build between poses. No cropped limbs or
feet. No giant hands, no extra fingers, no merged fingers. No ball drawn in flight. No white ball: the ball is red.
No fast-bowler leap, no sprint, no leg kicked up behind. No 3D render look, no glossy plastic shading, no soft
airbrush, no sketch lines. No more or fewer than 5 poses. No poses outside the list.
```

---------------------------------------------------------------------------------------------------
## 7. The paste order for ONE picture

`MASTER BLOCK` + `HANDEDNESS BLOCK` + `VIEW LINE` + `ACTION RULES` (off-spin or leg-spin) + `the 5 poses` + `NEGATIVE BLOCK`

Example for the off-spinner from behind, picture 2: master, handedness, "VIEW = FROM BEHIND", the off-spin action rules,
"Picture 2 of 3", the negative block, and attach picture 1 as "same man, kit, size and style".

---------------------------------------------------------------------------------------------------
## 8. Check each picture before you send it (I measure all of this too)

1. **Five poses**, left to right, in order, in one row, nothing cropped, 70 px or more of magenta between them.
2. **Figure height 600 to 640 px** in the standing pose (picture 1) and the same scale in every other pose.
   If the figures are under 560 px tall, regenerate: this is the whole reason for this pack.
3. **One flat magenta** (#FF00FF) background. No ground, no shadow.
4. **Outline** thin near-black ink, about 3 px. No coloured outline.
5. **Kit colours** main blue #0164F3, navy #031545, yellow #F6F416, skin #FCAA6E. Yellow only as thin clean piping.
6. **Bald, no beard, no cap.**
7. **Red ball** in his RIGHT hand, on the correct side of the picture for the view, in every pose until release.
   Pose 10 and later: no ball.
8. **Spinner, not a fast bowler:** a boot on the ground in every pose (leg-spin: only the hop pose may leave it, by a
   hand's breadth), small follow-through, upright body.
9. **Back of the shirt and chest plain**, no crest, no number, no text.
10. Same man, same kit, same size in all three pictures of a view.

Send them as PNG (not JPEG: JPEG blurs the magenta). Order: off-spin back (3), off-spin front (3), then leg-spin.
