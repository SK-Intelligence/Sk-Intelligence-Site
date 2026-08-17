Founder headshots — drop-in slot
================================

The founder cards render a typographic monogram (SG / KO) by default. To swap in
a real photo, just put the file here with the exact filename:

    sameer.jpg      -> Sameer Gul
    kenneth.jpg     -> Kenneth Obanor

No code change needed, and no JavaScript involved. Each portrait carries the
path as a CSS custom property:

    <span class="founder-portrait" style="--photo:url('assets/founders/sameer.jpg')">

which site.css paints onto a ::after layer over the monogram:

    .founder-portrait::after{ background-image: var(--photo, none); ... }

While the file is absent the background simply doesn't paint and the monogram
shows — no broken-image icon, and it behaves the same with scripting disabled.
The moment the file exists, the photo covers the monogram automatically.

(You will see two 404s for these filenames in the network tab until you add the
images. They are the only 404s on the site and they are harmless — nothing
renders differently because of them.)

Strip EXIF first (important)
---------------------------
Photos straight off a phone routinely carry GPS coordinates, camera serial
numbers and timestamps. Publishing a headshot with your home location embedded
is a real privacy leak. Before adding either file:

    exiftool -all= -overwrite_original sameer.jpg kenneth.jpg

(The four client logos in assets/clients/ were checked and are already clean.)

Image guidance
--------------
- Square crop. The frame is 72px and uses background-size: cover, so anything
  square works; 400x400 or larger keeps it crisp on retina displays.
- Head and shoulders, centred, with a little headroom.
- Keep the two consistent with each other — same rough crop, same lighting,
  same background. Two mismatched photos look worse than two monograms.
- A plain or softly blurred background suits the cream palette best.

Appears on: index.html (founders teaser) and founders.html (full blocks).
