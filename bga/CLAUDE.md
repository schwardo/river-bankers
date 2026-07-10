# River Bankers BGA — Claude notes

Project-specific guidance for the BoardGameArena implementation. See `README.md`
for the framework overview, client build model, and the SVN-commit deploy gotcha.

## Player scores: counters + the getAllDatas gotcha (READ THIS)

VP and the tie-breaker live in the framework's standard `player` table columns
`player_score` and `player_score_aux`. **Manipulate them only through the
framework PlayerCounter properties — never raw SQL:**

- `$this->bga->playerScore` ↔ `player_score` (the VP shown in the player panel)
- `$this->bga->playerScoreAux` ↔ `player_score_aux` (tie-breaker; here `-fish`)

These counters hang off `$this->bga`, so the same access works from both `Game`
and state classes. (`Game` also inherits a `$this->playerScore` shorthand for the
same object — the existing `refreshScores()` code uses it — but prefer the
`$this->bga->…` form everywhere for consistency.)

Read/write with `->get($pid)` / `->set($pid, $value)`. Setting a counter pushes a
**live** score update to the panel automatically. `refreshScores()` is the single
place that recomputes and pushes both; call it after anything that changes VP
(builds, auction resolution) and once with `->set` at setup so panels seed to 0.

**The recurring bug — always exposing score in `getAllDatas()`:** the counters only
notify the client on *change*, so they do **nothing on first load or a page
reload**. The initial panel score comes from the `players` collection returned by
`getAllDatas()`. If that SELECT omits the score, the panel renders `-` on every
load and only fills in transiently after the next live update. So `getAllDatas()`
**must** select it:

```php
"SELECT `player_id` AS `id`, `player_score` AS `score`, ... FROM `player`"
```

(`Game.php` getAllDatas, the `score` alias.) `player_score_aux` is a hidden
tie-breaker and does **not** need to be in `getAllDatas`. If VP shows `-` on load
but updates correctly during play, this SELECT is the cause — not a config setting.
