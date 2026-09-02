# Bunyan — training & nutrition tracker

**بنيان** — structure, edifice, something built course by course.

A single-page app. No backend, no accounts, no cost. Everything is stored in your
phone's browser and never leaves the device.

## Put it online (about 10 minutes, free)

1. Create a free GitHub account.
2. Click **New repository**. Name it `bunyan`. Set it to **Public** — GitHub Pages
   only works on free public repos. Nothing sensitive is in the code; your data
   never goes near it.
3. On the repo page choose **Add file → Upload files**, drag in every file in this folder (there are eight), and commit.
4. Go to **Settings → Pages**. Under Source pick **Deploy from a branch**,
   branch `main`, folder `/ (root)`. Save.
5. Wait two minutes. Your link appears at the top of that page and looks like
   `https://yourname.github.io/bunyan/`.

## Put it on your home screen

Open the link in **Safari** (not Chrome, and not the in-app browser inside
Instagram or WhatsApp — those use separate storage and your data will not follow).
Tap the share icon, then **Add to Home Screen**. You now have an app icon that
opens full screen and works with no signal.

## Back up your data

Profile → Export a backup. Copy the text into a note or email it to yourself.
Do this every few weeks. If you clear Safari's data, change phones, or delete the
home screen app, the backup is the only way to get your history back.

## Profiles and sharing

**Profiles** live on one device. If a friend trains on your phone, give him his own
profile in Profile → Add a profile. Separate log, separate weight, separate everything.
The first profile is the admin and cannot be deleted.

**Share codes** are how you follow a friend on his own phone. He taps
Profile → Share my progress, copies the text, sends it to you. You open
Profile → Friends I follow, paste it, and see his sessions, volume, best lifts and
weight trend, read only.

It is a snapshot, not live sync. He sends a new code when he wants you to see an
update. He never sees your log, and his numbers never touch yours.

**Live sync is not possible without a server.** For your data to reach his phone it
would have to pass through one, which means accounts, passwords, a monthly bill past
the free tier, and you holding someone else's data. The share code gets you most of
the benefit at none of that cost.

## Changing the app later

Edit `index.html` on GitHub and commit. Then open `sw.js`, change `bunyan-v1` to
`bunyan-v2`, and commit that too — otherwise phones keep serving the cached old
version.

## The maths

- **Volume** = the sum of weight × reps for every set. Not weight × reps × sets,
  which is only right when every set is identical.
- **Estimated 1RM** = weight × (1 + reps ÷ 30), the Epley formula. Shown only for
  sets of 12 reps or fewer, where it is reasonably accurate.
- **Average RPE** = total RPE ÷ number of sets.
- **Calories from macros** = protein × 4 + carbs × 4 + fat × 9.
- **Remaining macros** = your daily target minus everything in meals you marked
  complete.
- **Maintenance calories** = Mifflin-St Jeor BMR × your activity multiplier.
- **Seven-day weight average** = the mean of your last seven weigh-ins. Use this,
  not the daily number.
- **Progression** fires when every working set reaches the top of its rep range.

## The identity

Red `#E63946` / `#FF4D5A` on `#0D0D0D`. Green `#4CAF6A` for completed states only.
Surfaces `#1A1A1A` and `#2C2C2C`, text `#EAEAEA`.


**Bunyan (بنيان)** means a structure or edifice — something built deliberately, course
upon course. The mark is three things stacked:

- **The stepped arch** — faceted and mitred, in the angular Kufic manner rather than
  the smooth curve. Shoulders step outward before rising to the point. Structure.
- **The crescent** — set where a lamp would hang in the arch.
- **The girih field** — an eight-pointed rosette tessellation inside the arch, quiet
  enough that it survives being shrunk to a home screen icon.
- **The barbells** — flanking the arch at mid-height, plates stepping down as they
  approach it, so the arch appears to carry the load.

Underneath, two courses of foundation stone. Nothing is built without them.

### Palette

| Role | Colour | Where it comes from |
| --- | --- | --- |
| Basalt | `#12100C` | Dark volcanic stone, the base of the whole interface |
| Brass | `#C9A227` | The brand, and personal records only. Never decoration |
| Bone | `#EDE3D2` | Text. Warmer and easier on the eye than white |
| Madder | `#B3342A` | The action colour, from the red dye used across the region for centuries |
| Tile | `#1A8079` | Completion and progress, from Isfahan dome tilework |
| Sandstone | `#F5F0E4` | The light theme background |

Brass is reserved. If everything is gold, nothing is. It appears on the logo and on
personal records, and nowhere else.
