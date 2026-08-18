Founder headshots
=================

The founder cards fall back to a typographic monogram (SG / KO). To use a real
photo, put the file here with the exact filename:

    sameer.jpg      -> Sameer Gul
    kenneth.jpg     -> Kenneth Obanor

No code change needed. components/Founders.tsx sets the path as an inline
background-image on .founder-photo, which sits over the monogram:

    <span class="founder-photo" style={{ backgroundImage: `url("/founders/${f.slug}.jpg")` }} />

While a file is absent the layer simply doesn't paint and the monogram shows
through, with no broken-image glyph and no JavaScript in the path.

(Do not move the url() into a CSS custom property in globals.css. A relative
url() inside a custom property resolves against the stylesheet's base URL, not
the document's, which silently doubles the path. That bug cost an afternoon.)

Current state
-------------
    kenneth.jpg     present (288x288, metadata stripped)
    sameer.jpg      present (288x288, metadata stripped)

Both are cropped from graduation photos at matching tightness: face roughly 44%
of the frame height, head and shoulders, gown visible. Keep that ratio if either
is ever replaced.

Strip EXIF first
----------------
Photos straight off a phone routinely carry GPS coordinates, camera serial
numbers and timestamps. Publishing a headshot with your home location embedded
is a real privacy leak. Before adding a file:

    exiftool -all= -overwrite_original sameer.jpg

Or re-encode through Pillow, which is what was done for kenneth.jpg:

    from PIL import Image
    im = Image.open('in.jpg').crop(box).resize((288, 288), Image.LANCZOS)
    out = Image.new('RGB', im.size); out.putdata(list(im.getdata()))
    out.save('sameer.jpg', 'JPEG', quality=86, optimize=True, progressive=True)

Image guidance
--------------
- Square crop. The frame is 72px with background-size: cover, so any square
  works. 288x288 is 4x the slot and stays crisp on retina.
- Head and shoulders, face in the upper third, a little headroom above the hair.
- Match kenneth.jpg: same rough crop tightness, similar lighting, uncluttered
  background. Two mismatched photos look worse than two monograms.
- A plain or softly blurred background suits the cream palette best.

Appears on: the home page founders section (/#founders).
