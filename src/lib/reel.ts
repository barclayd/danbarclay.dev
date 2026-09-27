// Showreel hosted on R2 (bucket: danbarclay-dev-media). Files are immutable -
// upload a re-cut under a new version folder rather than overwriting.
export const REEL = {
  base: "https://media.danbarclay.dev/reel/v1",
  duration: 30,
  uploadDate: "2026-09-27",
  description:
    "A 30-second motion graphics showreel introducing Dan Barclay and the three products he builds: Promptly, the CMS for AI prompts; KeepFresh, the iOS app for ending food waste; and Stitch, which merges split Strava rides into one activity.",
  // Chapter starts (seconds) match the cuts in the reel. `cta` overrides the
  // "OPEN /" link label when it differs from the chapter name.
  chapters: [
    { name: "INTRO", start: 0, href: "/about", cta: "ABOUT" },
    { name: "PROMPTLY", start: 7.85, href: "/promptly" },
    { name: "KEEPFRESH", start: 13.83, href: "/keepfresh" },
    { name: "STITCH", start: 19.83, href: "/stitch" },
    { name: "CONTACT", start: 26.5, href: "#comms" },
  ],
};
