# Subreddit corpus (2026-10-27)

## Method and honest limits
Read through the assistant's browser. Reddit's JSON and HTML pages cost ~5-8k characters per post, so only a small hand-read sample was feasible; the requested ~900 posts were NOT collected. RSS feeds (old.reddit.com/.../.rss) were the cheapest readable format; they carry no scores (score is null).

Counts (51 labelled posts): r/TrueOpenSource 19 (about 20 of its ~60 posts; the rest were not read), r/ClaudeAI 14 (targeted TV/device searches, so biased toward hardware), r/opensource 4, r/selfhosted 7, r/linux 7. r/OpenSourceAIAllowed, r/ActuallyOpenSource and r/ClaudeCode were not read. Meta posts (rules, AI-ban arguments) were skipped.

## Fit against the current 123 groups
- Overall: 12 of 51 = 24% fit a current group.
- r/TrueOpenSource alone: 5 of 19 = 26% (keyboards, file-transfer, video-editing, email, tasks).
- Target is 85-90%. The current map is nowhere near it on this sample, mainly because "fits" requires a closed paid app, and most posts are original tools, dev utilities, or device hacks.

## Areas that do NOT fit (by post count in this sample)
1. TV firmware / launchers / debloat: 10 (all in the sample's TV searches)
2. AI agent tooling (memory, account switching, usage meters, approval gates, prototyping): 5
3. Dev tooling (build caching, QA test data): 2
4. Terminal apps (scores, lyrics): 2
5. Programming languages / transpilers: 2
6. OS internals (kernel console, core dumps): 2
7. Secret sharing
8. Desktop utilities (brightness, volume)
9. File utilities (bulk rename)
10. Dev libraries (realtime networking)
11. Local media players
12. Social VR / games
13. E-reader hacks (Kindle)
14. Peripheral configuration (Razer mice)
15. Self-hosted RAG / OCR infrastructure
16. Clipboard sync
17. Self-hosted mail server
18. NAS / home-server hardware
19. Self-hosting operations
20. GPS tracking
21. Linux on mobile / compatibility layers
22. Window managers / Wayland utilities
23. Desktop OS distros and desktop environments (partly covered by existing desktop-os, but it lacks kernel / DE / distro splits)
24. Accessibility (live captions; transcription group partly fits)
25. Paid-app clone waves (remade.wiki "Craft" Rust clones of Adobe, Office, Outlook, ElevenLabs, Fusion 360): these fit existing groups app by app, but a "who is cloning what" view is missing.
Only 22 distinct non-fitting areas surfaced; the sample is too small for a true top 25.

## TV and device swaps found (r/ClaudeAI unless noted)
These are mostly debloat plus replacement launchers over ADB, not full OS swaps (Fire OS refuses a replaced launcher).
- tv-vibehack (Gathin23, MIT, ~150 TV models, 50 brands): https://old.reddit.com/r/ClaudeAI/comments/1xbrzo0/ and https://github.com/Gathin23/tv-vibehack
- TCL Beyond TV using tv-vibehack: https://old.reddit.com/r/ClaudeAI/comments/1xa9f5d/
- Samsung Tizen TV cleanup plus custom home screen: https://old.reddit.com/r/ClaudeAI/comments/1xbj7jr/
- Nullofy TV, TCL Google TV launcher: https://old.reddit.com/r/ClaudeAI/comments/1xfk98m/
- Homestead, Fire TV home screen: https://old.reddit.com/r/ClaudeAI/comments/1xb00lj/ (https://github.com/Sarg338/Homestead)
- skippy-tv, Shield and Fire TV Stick launcher: https://old.reddit.com/r/ClaudeAI/comments/1xftb0a/ (https://github.com/cascodigital/skippy-tv)
- Fire Stick cleanup prompt (Projectivy, SmartTube): https://old.reddit.com/r/ClaudeAI/comments/1xggxqy/
- LG C1 OLED request: https://old.reddit.com/r/ClaudeAI/comments/1xgd270/
- Security worry thread: https://old.reddit.com/r/ClaudeAI/comments/1xgd6gt/
- r/opensource "Smart TV OS replacements?" (Samsung Tizen): https://old.reddit.com/r/opensource/comments/1xgauog/
- Related device hacks: Kindle as clock (https://old.reddit.com/r/ClaudeAI/comments/1xcfgop/), Razer mouse tool Snakecharmer (https://old.reddit.com/r/opensource/comments/1xgai7b/), Linux on iPhone (https://old.reddit.com/r/linux/comments/1xgns59/).

## Takeaways for category design
Add a Devices area (TV launchers and debloaters by brand/OS, e-readers, mice/keyboards, routers), an OS area (distro, desktop environment, kernel/console, mobile compat), and dev-tooling and AI-agent-tooling areas with no required closed competitor. A "closed product replaced" requirement cannot reach 85%.
