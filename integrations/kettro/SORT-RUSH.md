# Sort Rush playable

Standalone HTML ad, built with `node scripts/playable/build.cjs`; validate with `node scripts/playable/test.cjs` from the Sort Rush root. Three actual starter boards, legal contiguous same-colour transfers, hints, undo, replay, German/English, portrait/landscape. Embedded current app icon; no downloads or tracking while playing. Host events: `wm:ready`, `wm:cleared`, `wm:cta`. The host controls closing and reward eligibility.

Published like Arrow Puzzle at https://patrickuhl1988.github.io/Werbung/playables/sort-rush.html (GitHub Pages, not jsDelivr's text/plain HTML endpoint).

Shared module source: `D:/Claude/Werbemodul`; `node scripts/build-playables.mjs` copies HTML and generates the React Native string asset. The Kettro remote config selects only `arrow-puzzle-playable` and `sort-rush-playable`, uniformly at random (50% probability per impression, not guaranteed alternation).

Kettro's older Godot adapter explicitly permits only Arrow Puzzle and ignores random rotation. The updated adapter in `D:/Claude/Zip - Zahlen/sky-heist/scripts/promo.gd` allows the two exact package/HTML pairs and samples once per displayed rewarded offer. Availability probes do not consume the selection. Native package metadata controls the store target. Existing offline image fallback and reward gating are retained. Existing installed versions require the new Kettro build to show Sort Rush.

Checks: all three boards solved through UI handlers; invalid moves, undo, restart and bridge events; mobile and landscape browser inspection; Godot 1,000 deterministic sampling intervals split 500/500; existing test_levels suite passed 8,761 checks.