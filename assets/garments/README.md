# Garment photography

Product photos for each colourway, one file per garment + colour.

Expected filenames are already listed in `data/catalog.json` — every colour carries an
`_image` line naming the file it is waiting for, e.g. `tee-bone.jpg`.

To activate one: drop the file here, then rename that colour's `"_image"` key to `"image"`.
Colours with no image keep rendering as a drawn vector, so this can be done one at a time.

## What the photos need to be

- **Front-on, flat lay or ghost mannequin**, on a plain light ground.
- **Identical framing and crop for every colour of a style.** The print position is defined
  once per garment as fractions of the image, so if the garment sits in a different place
  from one shot to the next, the print will too.
- **Portrait 4:5** (e.g. 1600 × 2000px). Other ratios are cropped to fill, not letterboxed.
- Web-sized and compressed — these load on the shop grid, so keep them a few hundred KB.

For the jacket, shoot the **back**, since that is the print surface.

Check with Print Poppa that their product photography can be used on this storefront
before publishing it.
