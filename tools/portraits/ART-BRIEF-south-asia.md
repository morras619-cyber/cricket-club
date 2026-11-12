# Art brief: 140 new South Asian player portraits

For Sixcharge: Superhero Cricket. This is the brief to give to whoever makes the portraits (an illustrator or an image-generation workflow). It is written so each tile can be pasted straight into a prompt.

## 1. Why we need them

A new career now starts entirely in South Asia: about 255 South Asian players need a painted face each. The game has only **118** painted South Asian portraits, and they are almost all one skin tone, so about 2 in 3 players currently share a face with someone in another club.

| What the game has now (skin steps 1 to 5) | 1 light | 2 medium tan | 3 medium-deep | 4 deep | 5 very deep |
|---|---|---|---|---|---|
| South Asian portraits today | 13 | 89 | 14 | 2 | 0 |
| **New portraits needed (this brief)** | **13** | **41** | **43** | **25** | **18** |
| Total after | 26 | 130 | 57 | 27 | 18 |

With all 140 new faces there are enough for every South Asian player to have a face of their own. **Even a partial delivery helps. The first priority is skin steps 3, 4 and 5**, because the game has almost none.

## 2. Style: match the existing portraits exactly

The reference is `tools/portraits/league-1.png` (attached with this brief). Every new portrait must look like it belongs on that sheet:
- Comic-book illustration with **heavy clean ink outlines**, warm cel-shaded lighting, strong highlights on the cheekbones and nose.
- **Head and shoulders**, the face slightly turned and tilted up (a confident, heroic angle), eyes looking just past the viewer. Faces are about 60% of the tile's width.
- A **blue polo shirt with a yellow collar**, showing at the bottom of the tile. The shirt is recoloured to each club's colours in the game, so keep it plain: no logos, no stripes, no numbers.
- **No props**: no bat, no ball, no gloves, no helmet. The face is all that matters.
- Hair must not touch the edge of the tile. Shoulders may run off the bottom and sides.
- A mix of expressions: about half smiling, half serious. Everyone looks like a professional cricketer in good shape.

## 3. Sheet format (this is what the game's cutting tools expect)

- One image per sheet, **1254 x 1254 px**, **4 x 4 tiles** (16 per sheet), tiles in reading order, left to right and top to bottom. The last sheet has 12.
- Each tile has a **thin gold frame** and a **flat, even sky-blue background (#1e90ff or close)**, exactly as in the reference. The flat background is what lets the cutter remove it cleanly: **no gradients, no glow, no vignette, no blue in the hair or beard.**
- Each tile is about 300 px wide. Ask for the largest clean output you can (2x is welcome, as long as the layout is the same).
- 9 sheets: eight full sheets and one of 12.

## 4. Skin tones: the main problem to get right

The game reads each portrait's skin colour from the face and uses it on the player's sprite, so **the face has to carry the intended tone**. Earlier batches of darker-skinned players came out too light, because warm lighting washed the skin out. So for steps 4 and 5 in particular:
- Aim for these mid-tone colours on the cheek in even light (not the highlight):

| Step | Description | Cheek mid-tone |
|---|---|---|
| 1 | light wheatish | #e8b48c |
| 2 | medium tan | #c98e63 |
| 3 | medium-deep brown | #a8714f |
| 4 | deep brown | #7f4f33 |
| 5 | very deep brown | #553322 |

- Keep highlights soft and small on the darker tones. Do not lighten the skin to make it read better. A step 5 face should still be clearly very deep brown next to a step 2 face.
- Real variety within each tone: undertones (warm, neutral, cool), freckles and moles on a few, different noses, jaws, eyebrows and ears.

## 5. Variety: no two faces alike

The whole point is that nobody shares a face. When you generate a sheet:
- Give every tile its **own** description from the list in section 7. Do not ask for "16 South Asian men" in one go: that produces near-identical faces.
- Vary face shape (long, round, square, narrow, broad), nose, eyebrow weight, jawline, ear size, hairline and age lines.
- Hair: black or very dark brown for nearly everyone. A few with a brown tint, a few with grey (the 32+ group). Cuts: short messy, side parting, curly, close crop, spiky, swept back, man bun, wavy, ponytail.
- Facial hair as listed: roughly a third clean shaven, a quarter light stubble, the rest moustaches, goatees and full beards.
- A few turbans (listed), a few caps and headbands (listed). Nobody wears glasses or a helmet.
- Ages as listed: 18 to 38, looking exactly that age.

## 6. Copy-and-paste prompt for each sheet

> Sixcharge cricket player portrait sheet. A 4 by 4 grid of 16 separate square tiles, each with a thin gold frame and a flat, even sky-blue background (#1e90ff), no gradient. Each tile: head-and-shoulders comic-book illustration of a different South Asian male cricketer, heavy clean black ink outlines, warm cel-shaded lighting, the face slightly turned and tilted up, looking just past the viewer, wearing a plain blue polo shirt with a yellow collar, no logos, no props, no glasses. The faces are all different from each other (different face shape, nose, jaw, eyebrows, ears). Skin tones must be exactly as described for each tile and must not be lightened. Same style as the attached reference sheet. Tiles in reading order, left to right, top to bottom:
>
> *(paste the 16 tile lines of the sheet here)*

If your tool cannot hold 16 different faces in one image, make each tile separately at the same size and style on the same flat background, and I will assemble the sheet.

## 7. The 140 faces, sheet by sheet

Format: tile number, **name** (used as the file name), country the name is from, age, skin step (and its description), hair, facial hair, anything else. The names do not clash with any player already in the game.


### Sheet 1 (16 tiles)

1. **Qais Barakzai** (Afghanistan), age 29, skin step 2 (medium tan, #c98e63), short messy, light stubble
2. **Fazal Safi** (Afghanistan), age 19, skin step 1 (light wheatish, #e8b48c), curly, moustache
3. **Nazmul Molla** (Bangladesh), age 22, skin step 2 (medium tan, #c98e63), man bun, full beard
4. **Vihaan Nanda** (India), age 31, skin step 4 (deep brown, #7f4f33), ponytail, clean shaven
5. **Pranav Saxena** (India), age 28, skin step 5 (very deep brown, #553322), close crop / buzz, clean shaven
6. **Aditya Iyer** (India), age 27, skin step 4 (deep brown, #7f4f33), longer, swept back, clean shaven
7. **Kartik Trivedi** (India), age 20, skin step 4 (deep brown, #7f4f33), curly, goatee
8. **Sandun Herath-Senevi** (Sri Lanka), age 32, skin step 3 (medium-deep brown, #a8714f), close crop / buzz, moustache, plain cap
9. **Chathura Fonseka** (Sri Lanka), age 28, skin step 4 (deep brown, #7f4f33), close crop / buzz, goatee
10. **Imon Sarkar** (Bangladesh), age 26, skin step 2 (medium tan, #c98e63), man bun, light stubble
11. **Usama Kazmi** (Pakistan), age 32, skin step 2 (medium tan, #c98e63), curly, moustache
12. **Sahil Kulkarni** (India), age 19, skin step 4 (deep brown, #7f4f33), short messy, full beard
13. **Saad Niazi** (Pakistan), age 30, skin step 1 (light wheatish, #e8b48c), close crop / buzz, clean shaven
14. **Vihaan Rathore** (India), age 20, skin step 3 (medium-deep brown, #a8714f), spiky, moustache
15. **Rakibul Bhuiyan** (Bangladesh), age 23, skin step 2 (medium tan, #c98e63), wavy, medium length, light stubble
16. **Sahil Grewal** (India), age 29, skin step 3 (medium-deep brown, #a8714f), longer, swept back, moustache

### Sheet 2 (16 tiles)

1. **Vihaan Kulkarni** (India), age 24, skin step 5 (very deep brown, #553322), short side parting, clean shaven, headband
2. **Nazmul Talukder** (Bangladesh), age 38, skin step 3 (medium-deep brown, #a8714f), curly, clean shaven, plain cap
3. **Chathura Herath-Senevi** (Sri Lanka), age 26, skin step 3 (medium-deep brown, #a8714f), close crop / buzz, light stubble
4. **Faizan Malik** (Pakistan), age 19, skin step 2 (medium tan, #c98e63), wavy, medium length, moustache
5. **Farid Shinwari** (Afghanistan), age 32, skin step 2 (medium tan, #c98e63), longer, swept back, full beard, headband
6. **Muneeb Jatoi** (Pakistan), age 30, skin step 3 (medium-deep brown, #a8714f), longer, swept back, clean shaven, plain cap
7. **Kartik Bhalla** (India), age 27, skin step 3 (medium-deep brown, #a8714f), hair covered by the turban, full beard, turban
8. **Shohag Sikder** (Bangladesh), age 26, skin step 3 (medium-deep brown, #a8714f), short side parting, clean shaven
9. **Ahsan Niazi** (Pakistan), age 18, skin step 4 (deep brown, #7f4f33), man bun, clean shaven
10. **Pranav Trivedi** (India), age 20, skin step 1 (light wheatish, #e8b48c), close crop / buzz, clean shaven
11. **Niroshan Wijesekara** (Sri Lanka), age 30, skin step 4 (deep brown, #7f4f33), ponytail, light stubble
12. **Tanmay Saxena** (India), age 29, skin step 5 (very deep brown, #553322), ponytail, full beard
13. **Pranav Bhalla** (India), age 26, skin step 3 (medium-deep brown, #a8714f), hair covered by the turban, full beard, turban
14. **Sharif Kakar** (Afghanistan), age 22, skin step 3 (medium-deep brown, #a8714f), short messy, clean shaven, headband
15. **Pranav Menon** (India), age 27, skin step 5 (very deep brown, #553322), spiky, moustache
16. **Rifat Talukder** (Bangladesh), age 38, skin step 2 (medium tan, #c98e63), close crop / buzz, goatee

### Sheet 3 (16 tiles)

1. **Daniyal Hashmi** (Pakistan), age 25, skin step 3 (medium-deep brown, #a8714f), short side parting, clean shaven
2. **Yash Rathore** (India), age 19, skin step 4 (deep brown, #7f4f33), spiky, full beard
3. **Rafiq Chowdhury** (Bangladesh), age 31, skin step 2 (medium tan, #c98e63), man bun, full beard
4. **Saad Jatoi** (Pakistan), age 29, skin step 2 (medium tan, #c98e63), wavy, medium length, light stubble
5. **Vihaan Menon** (India), age 33, skin step 3 (medium-deep brown, #a8714f), short messy, full beard
6. **Rifat Mia** (Bangladesh), age 27, skin step 3 (medium-deep brown, #a8714f), spiky, full beard
7. **Isuru Wijesekara** (Sri Lanka), age 33, skin step 3 (medium-deep brown, #a8714f), short side parting, light stubble
8. **Ahsan Awan** (Pakistan), age 25, skin step 1 (light wheatish, #e8b48c), short messy, light stubble
9. **Daniyal Bajwa** (Pakistan), age 26, skin step 2 (medium tan, #c98e63), longer, swept back, light stubble, plain cap
10. **Yash Sharma** (India), age 22, skin step 2 (medium tan, #c98e63), man bun, clean shaven
11. **Rayyan Zaidi** (Pakistan), age 21, skin step 3 (medium-deep brown, #a8714f), short side parting, light stubble
12. **Ishaan Mathur** (India), age 32, skin step 5 (very deep brown, #553322), curly, moustache
13. **Tanvirul Molla** (Bangladesh), age 26, skin step 2 (medium tan, #c98e63), spiky, clean shaven
14. **Faizan Hashmi** (Pakistan), age 31, skin step 4 (deep brown, #7f4f33), curly, full beard, headband
15. **Hamid Jalali** (Afghanistan), age 29, skin step 2 (medium tan, #c98e63), close crop / buzz, clean shaven
16. **Kasun Jayasena** (Sri Lanka), age 30, skin step 4 (deep brown, #7f4f33), short messy, light stubble, plain cap

### Sheet 4 (16 tiles)

1. **Ashik Khondaker** (Bangladesh), age 37, skin step 5 (very deep brown, #553322), curly, light stubble
2. **Nuwan Kumara** (Sri Lanka), age 28, skin step 4 (deep brown, #7f4f33), longer, swept back, full beard
3. **Shohag Bhuiyan** (Bangladesh), age 32, skin step 3 (medium-deep brown, #a8714f), short messy, full beard
4. **Aarav Mathur** (India), age 26, skin step 4 (deep brown, #7f4f33), short side parting, full beard
5. **Shohag Talukder** (Bangladesh), age 18, skin step 2 (medium tan, #c98e63), man bun, light stubble
6. **Sahil Menon** (India), age 23, skin step 3 (medium-deep brown, #a8714f), short messy, full beard
7. **Mahfuz Bhuiyan** (Bangladesh), age 26, skin step 3 (medium-deep brown, #a8714f), close crop / buzz, goatee
8. **Ashik Karim** (Bangladesh), age 20, skin step 3 (medium-deep brown, #a8714f), short messy, full beard
9. **Rohit Sharma** (India), age 38, skin step 5 (very deep brown, #553322), ponytail, full beard, headband
10. **Pranav Mathur** (India), age 23, skin step 4 (deep brown, #7f4f33), ponytail, light stubble, headband
11. **Kartik Rathore** (India), age 20, skin step 3 (medium-deep brown, #a8714f), man bun, clean shaven
12. **Malith Herath-Senevi** (Sri Lanka), age 22, skin step 5 (very deep brown, #553322), short side parting, clean shaven
13. **Yash Grewal** (India), age 23, skin step 4 (deep brown, #7f4f33), ponytail, clean shaven
14. **Aditya Bhalla** (India), age 24, skin step 3 (medium-deep brown, #a8714f), wavy, medium length, full beard
15. **Sandun Dissanayake** (Sri Lanka), age 27, skin step 4 (deep brown, #7f4f33), curly, light stubble
16. **Zain Jatoi** (Pakistan), age 33, skin step 3 (medium-deep brown, #a8714f), curly, light stubble

### Sheet 5 (16 tiles)

1. **Kartik Menon** (India), age 19, skin step 4 (deep brown, #7f4f33), curly, clean shaven
2. **Varun Rathore** (India), age 32, skin step 1 (light wheatish, #e8b48c), man bun, light stubble
3. **Yash Iyer** (India), age 19, skin step 2 (medium tan, #c98e63), curly, clean shaven, headband
4. **Hamza Durrani** (Pakistan), age 21, skin step 1 (light wheatish, #e8b48c), wavy, medium length, moustache
5. **Sahan Herath-Senevi** (Sri Lanka), age 21, skin step 3 (medium-deep brown, #a8714f), spiky, full beard
6. **Ravindu Kumara** (Sri Lanka), age 38, skin step 3 (medium-deep brown, #a8714f), man bun, light stubble
7. **Daniyal Malik** (Pakistan), age 30, skin step 1 (light wheatish, #e8b48c), ponytail, light stubble
8. **Faizan Jatoi** (Pakistan), age 20, skin step 1 (light wheatish, #e8b48c), longer, swept back, moustache, plain cap
9. **Shayan Jatoi** (Pakistan), age 29, skin step 3 (medium-deep brown, #a8714f), close crop / buzz, moustache
10. **Muneeb Paracha** (Pakistan), age 32, skin step 2 (medium tan, #c98e63), man bun, clean shaven
11. **Shohag Karim** (Bangladesh), age 31, skin step 3 (medium-deep brown, #a8714f), man bun, light stubble
12. **Nuwan Rajapaksa-Perera** (Sri Lanka), age 28, skin step 3 (medium-deep brown, #a8714f), wavy, medium length, light stubble
13. **Nazmul Khondaker** (Bangladesh), age 26, skin step 5 (very deep brown, #553322), longer, swept back, light stubble
14. **Sajid Molla** (Bangladesh), age 28, skin step 3 (medium-deep brown, #a8714f), man bun, clean shaven
15. **Talha Paracha** (Pakistan), age 26, skin step 2 (medium tan, #c98e63), close crop / buzz, clean shaven
16. **Tanmay Mathur** (India), age 37, skin step 2 (medium tan, #c98e63), curly, moustache

### Sheet 6 (16 tiles)

1. **Shayan Malik** (Pakistan), age 26, skin step 3 (medium-deep brown, #a8714f), short side parting, light stubble
2. **Vihaan Chadha** (India), age 32, skin step 2 (medium tan, #c98e63), hair covered by the turban, full beard, turban
3. **Tharindu Silva** (Sri Lanka), age 31, skin step 4 (deep brown, #7f4f33), man bun, clean shaven, plain cap
4. **Rifat Chowdhury** (Bangladesh), age 24, skin step 2 (medium tan, #c98e63), longer, swept back, light stubble
5. **Kartik Mathur** (India), age 28, skin step 5 (very deep brown, #553322), spiky, full beard
6. **Reyansh Rathore** (India), age 36, skin step 4 (deep brown, #7f4f33), ponytail, clean shaven
7. **Tharindu Bandara** (Sri Lanka), age 30, skin step 3 (medium-deep brown, #a8714f), short messy, clean shaven
8. **Chathura Wijesekara** (Sri Lanka), age 31, skin step 5 (very deep brown, #553322), curly, light stubble
9. **Kartik Sharma** (India), age 24, skin step 2 (medium tan, #c98e63), man bun, moustache
10. **Usama Zaidi** (Pakistan), age 30, skin step 2 (medium tan, #c98e63), man bun, full beard
11. **Fazal Popalzai** (Afghanistan), age 24, skin step 3 (medium-deep brown, #a8714f), spiky, light stubble
12. **Aditya Rathore** (India), age 30, skin step 2 (medium tan, #c98e63), wavy, medium length, clean shaven
13. **Aarav Kulkarni** (India), age 21, skin step 5 (very deep brown, #553322), spiky, moustache
14. **Reyansh Kulkarni** (India), age 22, skin step 4 (deep brown, #7f4f33), close crop / buzz, light stubble
15. **Tanvirul Chowdhury** (Bangladesh), age 22, skin step 2 (medium tan, #c98e63), spiky, clean shaven
16. **Naveed Tarakai** (Afghanistan), age 20, skin step 2 (medium tan, #c98e63), spiky, light stubble

### Sheet 7 (16 tiles)

1. **Sharif Shinwari** (Afghanistan), age 24, skin step 2 (medium tan, #c98e63), short side parting, light stubble
2. **Varun Bhalla** (India), age 18, skin step 3 (medium-deep brown, #a8714f), hair covered by the turban, full beard, turban
3. **Talha Awan** (Pakistan), age 33, skin step 2 (medium tan, #c98e63), close crop / buzz, full beard
4. **Saad Bajwa** (Pakistan), age 27, skin step 2 (medium tan, #c98e63), close crop / buzz, moustache, plain cap
5. **Muneeb Durrani** (Pakistan), age 31, skin step 3 (medium-deep brown, #a8714f), man bun, light stubble
6. **Faizan Awan** (Pakistan), age 31, skin step 2 (medium tan, #c98e63), ponytail, clean shaven
7. **Aditya Kulkarni** (India), age 38, skin step 3 (medium-deep brown, #a8714f), short messy, light stubble
8. **Zubair Wardak** (Afghanistan), age 23, skin step 1 (light wheatish, #e8b48c), ponytail, clean shaven
9. **Haris Bajwa** (Pakistan), age 38, skin step 3 (medium-deep brown, #a8714f), man bun, full beard
10. **Daniyal Rind** (Pakistan), age 23, skin step 2 (medium tan, #c98e63), close crop / buzz, clean shaven
11. **Dinesh Kumara** (Sri Lanka), age 18, skin step 5 (very deep brown, #553322), short messy, clean shaven
12. **Dinesh Wijesekara** (Sri Lanka), age 21, skin step 4 (deep brown, #7f4f33), ponytail, clean shaven
13. **Usama Paracha** (Pakistan), age 23, skin step 4 (deep brown, #7f4f33), close crop / buzz, light stubble
14. **Zubair Ahmadzai** (Afghanistan), age 31, skin step 2 (medium tan, #c98e63), wavy, medium length, clean shaven
15. **Hamza Awan** (Pakistan), age 36, skin step 2 (medium tan, #c98e63), ponytail, moustache
16. **Wahid Popalzai** (Afghanistan), age 30, skin step 1 (light wheatish, #e8b48c), man bun, goatee

### Sheet 8 (16 tiles)

1. **Niroshan Wickramasinghe** (Sri Lanka), age 27, skin step 4 (deep brown, #7f4f33), man bun, moustache
2. **Malith Rajapaksa-Perera** (Sri Lanka), age 18, skin step 4 (deep brown, #7f4f33), curly, full beard
3. **Sharif Safi** (Afghanistan), age 19, skin step 1 (light wheatish, #e8b48c), curly, light stubble, plain cap
4. **Aditya Grewal** (India), age 28, skin step 2 (medium tan, #c98e63), spiky, full beard
5. **Varun Saxena** (India), age 38, skin step 5 (very deep brown, #553322), short side parting, light stubble, plain cap
6. **Rohit Kulkarni** (India), age 21, skin step 1 (light wheatish, #e8b48c), ponytail, clean shaven
7. **Rakibul Molla** (Bangladesh), age 24, skin step 3 (medium-deep brown, #a8714f), wavy, medium length, goatee
8. **Hamza Bajwa** (Pakistan), age 24, skin step 2 (medium tan, #c98e63), curly, light stubble
9. **Rohit Bhalla** (India), age 30, skin step 2 (medium tan, #c98e63), hair covered by the turban, full beard, turban
10. **Pranav Chadha** (India), age 28, skin step 5 (very deep brown, #553322), hair covered by the turban, full beard, turban
11. **Asad Barakzai** (Afghanistan), age 33, skin step 1 (light wheatish, #e8b48c), short side parting, clean shaven
12. **Haris Gondal** (Pakistan), age 38, skin step 3 (medium-deep brown, #a8714f), spiky, full beard
13. **Farhan Talukder** (Bangladesh), age 37, skin step 3 (medium-deep brown, #a8714f), spiky, full beard with grey
14. **Ishaan Iyer** (India), age 26, skin step 5 (very deep brown, #553322), short side parting, clean shaven
15. **Aarav Bhalla** (India), age 23, skin step 3 (medium-deep brown, #a8714f), curly, full beard
16. **Qais Ahmadzai** (Afghanistan), age 31, skin step 2 (medium tan, #c98e63), short side parting, full beard

### Sheet 9 (12 tiles)

1. **Talha Durrani** (Pakistan), age 30, skin step 2 (medium tan, #c98e63), short side parting, clean shaven
2. **Rafiq Hossain** (Bangladesh), age 28, skin step 3 (medium-deep brown, #a8714f), spiky, full beard
3. **Rohit Saxena** (India), age 23, skin step 5 (very deep brown, #553322), short messy, moustache
4. **Tanmay Grewal** (India), age 27, skin step 2 (medium tan, #c98e63), hair covered by the turban, full beard, turban
5. **Sahan Rajapaksa-Perera** (Sri Lanka), age 19, skin step 5 (very deep brown, #553322), spiky, clean shaven
6. **Bilal Wardak** (Afghanistan), age 31, skin step 3 (medium-deep brown, #a8714f), short messy, light stubble
7. **Wahid Ahmadzai** (Afghanistan), age 28, skin step 3 (medium-deep brown, #a8714f), close crop / buzz, full beard
8. **Malith Ekanayake** (Sri Lanka), age 34, skin step 3 (medium-deep brown, #a8714f), short side parting, full beard
9. **Shayan Niazi** (Pakistan), age 19, skin step 2 (medium tan, #c98e63), short side parting, clean shaven
10. **Shayan Zaidi** (Pakistan), age 23, skin step 2 (medium tan, #c98e63), man bun, clean shaven
11. **Ravindu Herath-Senevi** (Sri Lanka), age 20, skin step 4 (deep brown, #7f4f33), man bun, clean shaven
12. **Zain Zaidi** (Pakistan), age 26, skin step 4 (deep brown, #7f4f33), man bun, light stubble


## 8. What to send back and what I do with it

- The finished sheets as PNG files, named `south-asia-1.png` to `south-asia-9.png` (or the single tiles named by the face's name).
- Tell me if you changed any name, age or tone, so the game's records stay right.
- I cut each tile out, add it to the game (its age, its head square, its haircut and its skin and hair colours are read from the picture), run the existing checks that a player's face and sprite agree, and then replace the repeated faces in new careers. I'll show you a before-and-after of the repeated faces before anything goes live.

## 9. Quick check before sending

- [ ] Same ink-outline comic style as `league-1.png`, no photographic or 3D look.
- [ ] Flat sky-blue background and a gold frame on every tile.
- [ ] Skin tones match their step. The step 4 and 5 faces are clearly deep, not washed out.
- [ ] No two faces alike.
- [ ] Plain blue polo with a yellow collar, no props, no glasses.
