# The Sixcharge character look: measured description and a prompt to make more

Everything below was MEASURED from the game's own sheets (`img/kit/front.webp`, `back.webp`, `field.webp`, `bat-back.webp`: the pace
bowler from the front and behind, the fielders, the batter from behind), not guessed. Figure heights: 580 px (bowler, front), 563 px
(bowler, back), 441 px (fielders), 522 px (batter). A figure is about 1.85 m tall.

---------------------------------------------------------------------------------------------------
## 1. What the characters are

A hand-inked **comic-book / anime-sports** look, like a polished mobile sports game. Clean digital cel shading, NOT painterly and NOT 3D.
Athletic adult men, about 7.5 heads tall, broad shoulders, muscular forearms and calves, realistic proportions with slightly strong
comic jaws and brows. Faces are simple: dark determined brows, small dark eyes with one white highlight, a straight nose drawn with 2-3
lines, a small mouth, short ears. No pores, no stubble texture (beards and hair are added in code).

## 2. The outline (the most recognisable thing)

- Colour: a blue-black ink, **#070610** (median of the darkest pixels; it is never pure #000000).
- Thickness: about **2.8 px on a 580 px figure** (0.5% of the height). Range 2 to 4 px: a heavier line only where the figure turns
  away from us (under the arm, under the chin, where a limb overlaps the body). On the 441 px fielders it is 2 px.
- It is ONE continuous closed line around the whole silhouette, then thinner interior lines (about 60% of the outer weight) for: the
  collar and cuffs, the edge of the trouser stripe, the ear, the fingers and knuckles, the folds at elbows, knees and ankles, the
  lace and sole lines on the boots, the hairline.
- Slightly tapered: thicker in the middle of a stroke and finer at the ends, as if inked with a brush pen, but clean with no
  sketchiness, no double lines, no wobble.
- About 22% of the figure's pixels are ink (it is a strong outline, not a hairline).
- No coloured outlines. No glow. No drop shadow. The white boots and white pads are outlined in the same ink.

## 3. Colours (the club kit as drawn: Thunder Strikers blue)

The kit is drawn in ONE club's colours and re-coloured by the game for every other club, so keep the colour REGIONS clean (see 6).

| Part | Tone steps, dark to light | Hex (measured) |
|---|---|---|
| **Main blue** (shirt, trousers) | deep shadow | `#020922` |
| | shadow (folds, under the arm) | `#092b6e` |
| | mid-shadow | `#0642a9` |
| | **base (about 62% of the cloth)** | `#025be0` (range `#0459da` to `#0368f9`) |
| | pale highlight streaks | `#2b73ce` to `#388ee7` |
| | gloss streaks (see 4) | `#a8d8ff` to `#b3d7fe` |
| **Yellow trim** (collar, sleeve cuffs, belt band, trouser side stripe) | shadow | `#787113` |
| | mid | `#ceb822` |
| | **base (about 54%)** | `#f8f00b` |
| | highlight | `#efec43` |
| **Skin** (medium warm tan) | deep shadow (under chin, in the elbow) | `#994922` |
| | shadow | `#b1714e` / `#d76b35` |
| | mid | `#ed8651` |
| | **base (about 70%)** | `#faac70` |
| | highlight (forehead, cheek, knuckles) | `#feb57e` to `#ffd8b6` |
| **White** (boots, pads, gloves) | base | `#fcfbfa` |
| | shadow | `#d9dde6` |
| **Boot soles and studs** | | the kit blue `#0642a9` with yellow studs `#f8f00b` |
| **Cricket ball** | red | `#a00804`, seam `#fcfbfa` |
| **Bat** (willow) | pale wood | `#f2c581` with a darker edge `#c8884a` |
| **Helmet** (batter) | the kit blue, with a yellow band and a grey grille | `#0958d4`, `#f9f40d`, `#8b95a8` |

Skin tone is a placeholder: the game paints each player's own skin over the orange regions (see 6), so draw all skin in the base
tan above.

## 4. The glossy effect (how the shine is drawn)

It is a **cel-shaded "polyester sports shirt" sheen**, not a soft glow:
- **Pale-blue gloss streaks** (`#a8d8ff` to `#b3d7fe`): thin, sharp-edged strips about 2 to 6 px wide that follow the folds: one down
  the top of each shoulder, one along the upper arm, a short one on the chest, a long one down the front of each thigh and a short
  one on each knee. Together they cover only about **2% of the blue area**. Hard edges, no gradient across them.
- **Broad highlight band**: the base blue `#025be0` simply gets a little lighter (`#0368f9`, `#0470f5`) on the side facing the light
  (upper side of shoulders, front of the thighs). Hard-edged shapes, two steps at most.
- **Fold shadows**: the darker blues (`#0642a9`, `#092b6e`) in flat, hard-edged shapes in every crease: under the armpit, the collar
  shadow on the chest, behind the knees, the ankle bunching, the waistband underside.
- **White boots** get the same treatment: a pale grey `#d9dde6` underside and a bright white top, with a yellow-and-blue sole.
- Skin has a light highlight (`#ffd8b6`) on the forehead, the cheekbone, the top of the shoulder and the knuckles, and a warm
  shadow (`#b1714e`) under the chin, in the armpit and in the crook of the elbow.
- Overall the cloth looks slightly shiny and satin, never matte, never metallic or wet.

## 5. The lighting

- A single soft key light from **above and very slightly from the viewer's left**: measured, the tops of the shirt are about 6 to
  12% brighter than the bottoms, and the left side of the shirt is brighter than the right by only 0 to 4%. So: "overhead, a touch
  from the left".
- Shadows are **cel shaded**: hard-edged flat darker tone shapes on the underside of forms (below the chin, under the sleeve, under
  the belt, inside the legs), never a soft gradient.
- NO cast shadow on the ground and NO background in the sheets: the game adds a soft elliptical shadow under the feet at run time.
- NO rim light, NO coloured reflected light, NO ambient occlusion, NO bloom or glow.
- Contrast is high: the deepest shadows reach `#020922` (almost black blue) so the figure reads on any background.

## 6. Clothing (exactly what is drawn)

**Bowler and fielders** (the same polo kit in every pose):
- **Shirt**: a short-sleeved polo, base blue, with a **yellow folded collar** with a small V opening at the front (the front of the
  shirt shows two small collar points), **yellow sleeve cuffs** (a 12 to 14 px band at the end of each sleeve), a **yellow waist band** at the
  hem of the shirt (the shirt hem is tucked, with a wide yellow band at the belt line), and thin yellow piping down the side seam on
  some frames. The sleeve is short and fitted over the biceps. The shirt has soft folds across the chest and at the armpits.
- **Trousers**: straight-cut long cricket trousers in the base blue, with a **bold yellow stripe down each outside leg** (about
  16 to 24 px wide on a 580 px figure, hard-edged and slightly curved with the leg), narrowing slightly at the ankle, bunching a
  little over the shoe.
- **Shoes**: white cricket boots with a pale-grey underside shadow, blue laces and heel patch, **blue soles with yellow studs**.
- **Fielder headwear**: a **blue baseball-style cap** with a yellow band/button and a short curved peak, worn forward; the bowler is
  bald here (hair, beards, caps are added in code).
- **Back of the shirt**: plain. The player's NAME and NUMBER are printed by the game (a condensed bold font in the trim colour). The
  chest is plain too; the club crest is placed by the game on the left chest.
- **Keeper**: white gloves, white pads, a blue helmet with a grille.

**Batter (from behind)**: a **blue helmet** with a yellow band and chrome grille, the same polo shirt in a short-sleeve cut, the blue
trousers with the yellow stripe, **white batting pads** with three horizontal strap bands each (alternate blue and yellow, with
white buckles), **white batting gloves** with blue cuffs, white boots with blue soles, and a **pale willow bat** with a
darker edge and a blue grip.

## 7. How the game uses the art (why the colour regions matter)

The game finds three regions by colour and recolours them for each club and player: the **blue** (the club's main colour), the
**yellow** (the club's trim colour), and the **orange skin** (each player's own skin tone). It also prints a crest and the name and
number in code. So when you draw new sprites: keep blue, yellow and skin as clearly separate flat regions, do not mix them (no blue
shadows on skin, no yellow reflections on the blue), keep the back and chest plain, and draw the head BALD (hair, beards and caps are
separate pieces added by the game).

---------------------------------------------------------------------------------------------------
## 8. THE PROMPT (paste this first, every time; then add the pose and view)

```
Character art for a 2D mobile cricket game. Style: a polished hand-inked comic-book / anime-sports look with clean digital cel shading,
like a premium mobile sports game. NOT painterly, NOT 3D, NOT photoreal, NOT chibi. An adult male athlete, about 7.5 heads tall, 1.85 m,
broad shoulders, muscular forearms and calves, a strong jaw, short ears, a plain determined face: dark straight brows, small dark eyes
with a single white highlight, a simple nose drawn with 2 to 3 lines, a small closed mouth. BALD (no hair, no beard, no cap): hair is
added later by the game.

OUTLINE: one continuous closed ink line around the whole figure in a blue-black ink, #070610 (never pure black), about 2.8 px thick on a
580 px tall figure (0.5% of the height; 2 px minimum, 4 px at most, thicker only where a limb overlaps the body or turns away), brush-pen
quality: slightly tapered, clean, no sketchiness, no double lines, no wobble. Thinner interior lines (about 60% of the outer weight) for
the collar, cuffs, stripe edges, ears, fingers and knuckles, folds at elbows, knees and ankles, boot laces and sole lines, the hairline.
The outline is a strong part of the look (about one fifth of the figure's pixels are ink). No coloured outlines, no glow, no drop shadow.

SHADING: flat cel shading with HARD edges: a base tone, 2 to 3 darker fold tones, and bright highlight streaks. No soft gradients, no
airbrush, no texture, no halftone. Exactly these tones:
- MAIN BLUE cloth (shirt and trousers): deep shadow #020922, shadow #092b6e, mid-shadow #0642a9, BASE #025be0 (the biggest area),
  lighter side #0368f9 to #0470f5.
- GLOSS: thin sharp-edged pale-blue streaks, #a8d8ff to #b3d7fe, 2 to 6 px wide, following the folds (down the top of each shoulder,
  along the upper arm, a short one on the chest, a long one down the front of each thigh, a short one on each knee), covering only about
  2% of the cloth. The cloth looks like slightly shiny satin sports polyester: never matte, never metallic, never wet.
- YELLOW TRIM: shadow #787113, mid #ceb822, BASE #f8f00b, highlight #efec43.
- SKIN (a medium warm tan): deep shadow #994922, shadow #b1714e, mid #ed8651, BASE #faac70, highlight #ffd8b6 on the forehead,
  cheekbone, top of the shoulder and knuckles; warm shadow under the chin, in the armpit and in the crook of the elbow.
- WHITE (boots, pads, gloves): base #fcfbfa, shadow #d9dde6. Boot soles blue #0642a9 with yellow studs #f8f00b.
- Cricket ball: red #a00804 with a white seam #fcfbfa.

LIGHTING: one soft key light from above and a touch from the viewer's left. Tops of forms about 10% lighter than undersides. Shadows are
hard-edged flat shapes on the undersides (under the chin, under the sleeve, under the belt, inside the legs). No cast shadow on the
ground, no rim light, no coloured bounce light, no ambient occlusion, no glow or bloom. High contrast: the darkest shadows are almost
black blue (#020922) so the figure reads on any background.

KIT (draw it exactly): a SHORT-SLEEVED POLO SHIRT in the base blue with a YELLOW folded collar with a small V opening (two collar points
at the front), YELLOW sleeve cuffs (a band about 12 to 14 px at the end of each sleeve), a wide YELLOW BAND at the shirt hem at the
belt line, soft folds across the chest and at the armpits. STRAIGHT-CUT LONG CRICKET TROUSERS in the base blue with a BOLD YELLOW STRIPE
down each outside leg (about 16 to 24 px wide on a 580 px figure, hard-edged), narrowing slightly at the ankle and bunching a little over
the shoe. WHITE CRICKET BOOTS with a pale-grey underside, blue laces and heel patch, blue soles with yellow studs. The chest and the back of
the shirt are PLAIN: no logo, no crest, no name, no number, no text (the game adds them). Keep blue, yellow and skin as clean, separate,
flat colour regions (the game recolours them): no blue shadows on skin, no yellow reflections on the blue.

BACKGROUND: one flat solid magenta #FF00FF, nothing else: no ground, no shadow under the feet, no gradient, no frame, no text.
SCALE: boot sole to top of head is exactly 640 px in the standing pose, the same scale in every pose, never cropped.
```

Fielders: add "wearing a blue baseball-style cap with a yellow band and a short curved peak, worn forward; a plain face".
Batter from behind: add "a blue helmet with a yellow band and a chrome grille, white batting pads with three horizontal straps each
(alternate blue and yellow with white buckles), white batting gloves with blue cuffs, a pale willow bat #f2c581 with a darker edge
#c8884a and a blue grip".
Keeper: add "white keeping gloves, white pads, a blue helmet with a grille".

## 9. Check a new sprite against this (I measure all of these)

1. Outline colour is blue-black (#070610 area), 2 to 4 px on a 580 px figure, continuous, no coloured outline.
2. Base blue about #025be0 and the shadow steps as above; gloss streaks pale blue, thin, only about 2% of the cloth.
3. Yellow base about #f8f00b, skin base about #faac70, whites #fcfbfa.
4. Hard-edged flat shading, no gradients; light from above and slightly left.
5. Bald head, plain chest and back, no crest, no number.
6. Flat magenta background, no shadow.
7. Same man, same kit, same scale in every pose.
