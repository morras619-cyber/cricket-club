# Shirt print style (name + number on the back)

The one style for every player's back print. Any new sheet (more bowler poses, batters,
non-strikers, fielders) follows these rules; only the per-frame placement is new work.

## Look
- **Content:** the player's LAST NAME (upper case) above his SHIRT NUMBER.
- **Font:** Barlow Condensed ExtraBold in the game (mockups used Inter ExtraBold at 80% width).
- **Sizes (relative to the print block width W):** name cap height 0.13 W, number height
  0.52 W; 26/400 W gap between them. Every player's print is the same size; a long name
  (e.g. VAN DER BERG) is only narrowed to fit W, never made smaller in height.
- **Colour:** the club's trim colour. A thin outline in the suit colour darkened to 35% is
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
