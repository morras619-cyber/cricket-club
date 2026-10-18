# Shirt print style (name + number on the back)

The one style for every player's back print. Any new sheet (more bowler poses, batters,
non-strikers, fielders) follows these rules; only the per-frame placement is new work.

## Look
- **Content:** the player's LAST NAME (upper case) above his SHIRT NUMBER.
- **Font:** Barlow Condensed ExtraBold in the game (mockups used Inter ExtraBold at 80% width).
- **Sizes (relative to the print block width W):** name cap height 0.13 W, number height
  0.52 W; 26/400 W gap between them. Every player's print is the same size; a long name
  (e.g. VAN DER BERG) is only narrowed to fit W, never made smaller in height.
- **Colour:** the club's trim colour blended into the shirt colour (12%; a very dark trim 42% toward a deep shade of the shirt, so black on orange reads as dark burnt orange, not stark black). A thin outline in the suit colour darkened to 35% is
  added only when trim and suit are close in brightness (difference under 0.35).
- **On the cloth:** clipped to the shirt (arms in front hide it), and darkened/lightened with
  the shirt's own folds (factor 0.55-1.15 of the local cloth brightness).

## Placement rules
1. Per frame, measure the **centre of the collar** and **centre of the waistband** (the spine).
2. The print block sits on that line, 42% of the way down from the collar, tilted with it.
3. Width: ~88% of a back-width unit (frame 1 = 88 px on the master sheet); turned frames
   squash horizontally (0.85-0.88), bent-forward frames squash vertically (0.75).
4. If the body twists so the spine line leaves the back (bent follow-throughs), centre the
   print between the shirt's left and right edges at print height, sleeves excluded.
5. Final check by eye at 2x zoom with the spine line drawn; nudge name and number
   separately when needed (stored as `name` / `number` offsets).

Placement data: `shirt-print-back.json` (frames 1-10 of the back sheet). Frames are counted
left to right, top row first, as on the sheet.

# Front: club crest only

The front of the shirt carries the club crest and nothing else (no name, no number).

## Look
- **Where:** the player's LEFT chest (the viewer's right), level with the bottom of the
  collar points, about halfway between the collar opening and the sleeve seam.
- **Size:** about 36 px on the 580 px standing frame (roughly the width of the collar's
  side), the same on every player and club.
- **Art:** the club's own logo (`img/logo-<club>.webp`) in full colour with a thin dark rim
  (rgb 14,12,24), so it reads on any kit colour, even a yellow crest on the Eagles' yellow.
- **On the cloth:** shaded by the shirt's folds (0.6-1.12 of the local brightness); hidden
  behind arms and hands in front of it; fold lines on the shirt do not cut through it.

## Placement rules
1. Per frame, place it by eye at 2x zoom on a 10 px grid, relative to the collar point and
   the sleeve seam on the player's left side.
2. Keep it clear of the sleeve seam and the arm (move it toward the collar rather than let
   the seam cut it).
3. Turned frames squash it horizontally (0.9-0.95), bent-forward frames vertically (0.85);
   tilt it with the chest when he leans (up to +/-5 deg).

Placement data: `crest-front.json` (frames 1-10 of the front sheet).
