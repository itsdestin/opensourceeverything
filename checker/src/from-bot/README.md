# Copied from the subreddit's mod bot — do not edit here

`rules.ts` and `github.ts` are exact copies of `src/features/checker/` in
[itsdestin/trueopensource-bot](https://github.com/itsdestin/trueopensource-bot) at commit `8e60cff`.

WHY copies: the bot and the Alternatives Map must judge projects the same way (what counts as "too new",
which licenses are open source). Fix or extend these rules in the bot first, then run
`npm run sync-from-bot` here. `npm test` fails if these files drift from the bot's copy on this computer.

License: BSD-3-Clause, see `LICENSE-trueopensource-bot.md`.
