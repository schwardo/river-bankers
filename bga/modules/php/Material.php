<?php
/**
 * River Bankers — card catalogs (generated from the graphics deck cards.json files).
 * card_type_arg in the `card` table = the 0-based index into the matching array.
 * Effects are descriptive text for now; effect *logic* is implemented in the
 * state machine (Phase 4), not here.
 */
declare(strict_types=1);

namespace Bga\Games\RiverBankers;

class Material
{
    // 24 base material cards = 6 materials x 4 icon tiers (4,5,7,8), plus the
    // 2P-only Bramble Shoal wild (arg 24). Tier inclusion + the 2P wild swap
    // are decided in Game::setupNewGame().
    public const ROCKY_SHOAL_ARG = 5;    // stones-5, swapped out at 2P
    public const TRAILING_VINE_ARG = 17; // vines-5, swapped out at 2P
    public const BRAMBLE_SHOAL_ARG = 24; // shared stones/vines wild-5, 2P only
    public static array $MATERIAL = [
        0 => ['name' => 'Fallen Limb', 'material' => 'logs', 'icons' => 4],
        1 => ['name' => 'Driftwood Tangle', 'material' => 'logs', 'icons' => 5, 'wildAlt' => 'reeds', 'effect' => 'Wild: each claimed icon yields Logs OR Reeds (chosen at build time).'],
        2 => ['name' => 'Logjam', 'material' => 'logs', 'icons' => 7],
        3 => ['name' => 'Old Growth', 'material' => 'logs', 'icons' => 8, 'effect' => 'If this card is at River 3 or 4, each worker you retrieve yields 2 Logs instead of 1.'],
        4 => ['name' => 'Cairn', 'material' => 'stones', 'icons' => 4],
        5 => ['name' => 'Rocky Shoal', 'material' => 'stones', 'icons' => 5],
        6 => ['name' => 'Boulder Field', 'material' => 'stones', 'icons' => 7],
        7 => ['name' => 'Quarry Bank', 'material' => 'stones', 'icons' => 8],
        8 => ['name' => 'Hidden Inlet', 'material' => 'reeds', 'icons' => 4, 'effect' => 'If exactly one player has workers on this card when it reaches shoreline, that player moves back 1 space on the fish track per worker.'],
        9 => ['name' => 'Reed Stand', 'material' => 'reeds', 'icons' => 5],
        10 => ['name' => 'Marsh Edge', 'material' => 'reeds', 'icons' => 7],
        11 => ['name' => 'Cattail Cluster', 'material' => 'reeds', 'icons' => 8, 'effect' => 'When this card reaches shoreline, the player with the most workers moves back 3 spaces on the fish track. Ties: nobody.'],
        12 => ['name' => 'Mud Wallow', 'material' => 'mud', 'icons' => 4, 'effect' => 'When this card reaches shoreline, the player with the most workers moves back 2 spaces on the fish track. Ties: nobody.'],
        13 => ['name' => 'Mud Flat', 'material' => 'mud', 'icons' => 5],
        14 => ['name' => 'Silt Bank', 'material' => 'mud', 'icons' => 7],
        15 => ['name' => 'Floodplain', 'material' => 'mud', 'icons' => 8],
        16 => ['name' => 'Vine Curtain', 'material' => 'vines', 'icons' => 4, 'effect' => 'When you build using workers from this card, peek at the top 2 material cards and rearrange them.'],
        17 => ['name' => 'Trailing Vine', 'material' => 'vines', 'icons' => 5],
        18 => ['name' => 'Vine Thicket', 'material' => 'vines', 'icons' => 7],
        19 => ['name' => 'Strangler Knot', 'material' => 'vines', 'icons' => 8],
        20 => ['name' => 'Clay Seep', 'material' => 'clay', 'icons' => 4],
        21 => ['name' => 'Clay Bank', 'material' => 'clay', 'icons' => 5],
        22 => ['name' => 'Mud Slick', 'material' => 'clay', 'icons' => 7, 'wildAlt' => 'mud', 'effect' => 'Wild: each claimed icon yields Mud OR Clay (chosen at build time).'],
        23 => ['name' => 'Slipping Sandbar', 'material' => 'clay', 'icons' => 8, 'effect' => 'Enters the river at River 4. After an auction on this card, slides one slot upstream instead of downstream. At River 1, retires to shoreline instead.'],
        // 2P-ONLY shared stones/vines wild-5. At 2 players this replaces Rocky
        // Shoal (arg 5) + Trailing Vine (arg 17); at 3P+ it is left out of the
        // deck and the two vanilla 5s are used instead (see Game::setupNewGame).
        24 => ['name' => 'Bramble Shoal', 'material' => 'stones', 'icons' => 5, 'wildAlt' => 'vines', 'effect' => 'Wild: each claimed icon yields Stones OR Vines (chosen at build time).'],
    ];

    // 48 shared structure-deck cards (excludes species starters). NOTE: Slipstream
    // (id 43 in sim.js/web/cards.json) is intentionally NOT in the BGA port — its
    // "interrupt after another player" timing has no clean BGA realization. See the
    // "Cards not present in the BGA port" section in games/board-games.org.
    public static array $STRUCTURE = [
        0 => ['name' => 'Spillway', 'cost' => ['logs' => 4, 'mud' => 2], 'time' => 0, 'vp' => '6', 'effect' => 'When built: wash one card from River 1 to the shoreline (workers carry along).'],
        1 => ['name' => 'Hollowed-out Log', 'cost' => ['logs' => 3, 'reeds' => 1], 'time' => 2, 'vp' => '5', 'effect' => 'Once per game (flip card): recall one worker from a river card (no blank).'],
        2 => ['name' => 'Snag Pile', 'cost' => ['reeds' => 2, 'stones' => 1], 'time' => 2, 'vp' => '3', 'effect' => 'When built: pull a Headwaters card to River 1; run an auction on it at 1🐟/item.'],
        3 => ['name' => 'Heron Watch', 'cost' => ['stones' => 4, 'logs' => 2], 'time' => 4, 'vp' => '0', 'effect' => 'End of game: +1 VP per shoreline card on the table (max +6).'],
        4 => ['name' => 'Reed Bed', 'cost' => ['reeds' => 3, 'mud' => 1], 'time' => 2, 'vp' => '4', 'effect' => 'Reed icons cost you 1 less 🐟 per item (min 1).'],
        5 => ['name' => 'Mud Levee', 'cost' => ['mud' => 3, 'stones' => 2], 'time' => 3, 'vp' => '6', 'effect' => 'When built: drop 2 blanks on uncovered icons in the river.'],
        6 => ['name' => 'Log Flume', 'cost' => ['mud' => 2, 'logs' => 1], 'time' => 1, 'vp' => '2', 'effect' => 'When you build: advance 3 fewer 🐟 (min 1).'],
        7 => ['name' => 'Cache Burrow', 'cost' => ['mud' => 2, 'reeds' => 2], 'time' => 2, 'vp' => '4', 'effect' => '+1 to your hand size. When built, draw a structure card.'],
        8 => ['name' => 'Vine Lattice', 'cost' => ['vines' => 3, 'reeds' => 2], 'time' => 3, 'vp' => '5', 'effect' => 'When built: draw 3 structure cards, keep 1, discard 2.'],
        9 => ['name' => 'Charcoal Pit', 'cost' => ['clay' => 4, 'logs' => 2], 'time' => 3, 'vp' => '6', 'effect' => 'When you build: 1 of your Clay workers may substitute for any other material.'],
        10 => ['name' => 'Lookout Tree', 'cost' => ['logs' => 5, 'stones' => 2], 'time' => 4, 'vp' => '8', 'effect' => 'Peek at the top of the material deck at any time.'],
        11 => ['name' => 'Pier', 'cost' => ['logs' => 3, 'stones' => 2], 'time' => 3, 'vp' => '0', 'effect' => 'End of game: +2 VP per shoreline card with at least one of your workers (max +6).'],
        12 => ['name' => 'Cattail Marsh', 'cost' => ['reeds' => 4, 'mud' => 2], 'time' => 3, 'vp' => '5', 'effect' => 'When you build: each Reed worker counts as 2 reeds.'],
        13 => ['name' => 'Wood Pile', 'cost' => ['logs' => 4], 'time' => 2, 'vp' => '4', 'effect' => 'Once per game (flip card): claim 1 uncovered Log icon from any non-wild river card for 1🐟.'],
        14 => ['name' => 'Heron Roost', 'cost' => ['reeds' => 3, 'vines' => 2], 'time' => 3, 'vp' => '6', 'effect' => 'As an action: pay 1🐟 to replace a Headwaters card with the top of the material deck; shuffle the replaced card back into the deck.'],
        15 => ['name' => 'Pontoon', 'cost' => ['logs' => 4, 'reeds' => 1], 'time' => 3, 'vp' => '4', 'effect' => 'When a jammed auction makes you place fewer workers than your bid, pay 🐟 for one fewer worker.'],
        16 => ['name' => 'Mill Wheel', 'cost' => ['logs' => 3, 'stones' => 2], 'time' => 4, 'vp' => '6', 'effect' => 'When built: activate one "when built" effect of a built structure controlled by the player to your left or right.

As an action: activate the "as an action" ability of a built structure controlled by the player to your left or right.'],
        17 => ['name' => 'Stone Pool', 'cost' => ['stones' => 3, 'clay' => 2], 'time' => 3, 'vp' => '6', 'effect' => 'When built: look at the top 5 material cards and rearrange them in any order.'],
        18 => ['name' => 'Flush Channel', 'cost' => ['mud' => 3, 'reeds' => 1], 'time' => 2, 'vp' => '6', 'effect' => 'When built: discard 1 Headwaters card (out of game) and refill that slot from the material deck. No auction.'],
        19 => ['name' => 'Granary', 'cost' => ['reeds' => 4, 'clay' => 1], 'time' => 3, 'vp' => '3', 'effect' => 'Once per game (flip card): your build costs 1 fewer of one listed material.'],
        20 => ['name' => 'Granite Spire', 'cost' => ['stones' => 6], 'time' => 4, 'vp' => '7'],
        21 => ['name' => 'Royal Lodge', 'cost' => ['logs' => 6, 'vines' => 2], 'time' => 5, 'vp' => '10', 'effect' => 'When built: take an immediate extra turn.'],
        22 => ['name' => 'Streambank Hollow', 'cost' => ['mud' => 3, 'vines' => 1], 'time' => 2, 'vp' => '4', 'effect' => 'When you recall workers before an auction, slide back 1🐟 per worker recalled.'],
        23 => ['name' => 'Floodgate', 'cost' => ['mud' => 4, 'clay' => 3], 'time' => 4, 'vp' => '8', 'effect' => 'Once per game (flip card): before an auction resolves, slide the auctioned card 1 space toward the Headwaters.'],
        24 => ['name' => 'Burrow Run', 'cost' => ['vines' => 3, 'mud' => 1], 'time' => 0, 'vp' => '4', 'effect' => 'When built: slide your pawn back 5 on 🐟 track.'],
        25 => ['name' => 'Sap Drip', 'cost' => ['logs' => 2, 'vines' => 2], 'time' => 2, 'vp' => '4', 'effect' => 'When built: place 2 free workers from your supply onto uncovered icons of one river card.'],
        26 => ['name' => 'Spy Mound', 'cost' => ['stones' => 4, 'clay' => 1], 'time' => 3, 'vp' => '6', 'effect' => 'Once per game (flip card): decide your auction bid after the other players reveal theirs.'],
        27 => ['name' => 'Vine Ladder', 'cost' => ['vines' => 4, 'stones' => 2], 'time' => 4, 'vp' => '0', 'effect' => 'End of game: +4 VP per built structure of yours that uses Vines (max +12).'],
        28 => ['name' => 'Vine Trellis', 'cost' => ['vines' => 3, 'stones' => 1], 'time' => 2, 'vp' => '0', 'effect' => 'When you build a structure that uses Vines: slide back 1🐟.

End of game: +2 VP per built structure of yours that uses Vines.'],
        29 => ['name' => 'Stone Causeway', 'cost' => ['stones' => 3, 'logs' => 2], 'time' => 3, 'vp' => '0', 'effect' => 'When you build a structure that uses Stones: draw 1 structure card and discard 1.

End of game: +2 VP per built structure of yours that uses Stones (max +8).'],
        30 => ['name' => 'Reed Walkway', 'cost' => ['reeds' => 4, 'mud' => 1], 'time' => 3, 'vp' => '0', 'effect' => 'When you build a structure that uses Reeds: place 1 free worker on a River 1 card.

End of game: +2 VP per built structure of yours that uses Reeds.'],
        31 => ['name' => 'Clay Vault', 'cost' => ['clay' => 3, 'vines' => 2], 'time' => 3, 'vp' => '0', 'effect' => 'When you build a structure that uses Clay: peek at the top of the structure deck; you may swap it with 1 card from your hand.

End of game: +3 VP per built structure of yours that uses Clay (max +12).'],
        32 => ['name' => 'Burrow Network', 'cost' => ['mud' => 3, 'reeds' => 2], 'time' => 3, 'vp' => '0', 'effect' => 'When you build a structure that uses Mud: move one of your workers to another river card with at least one of your workers (may replace a blank).

End of game: +3 VP per built structure of yours that uses Mud (max +9).'],
        33 => ['name' => 'Driftwood Snag', 'cost' => ['logs' => 2, 'reeds' => 2, 'mud' => 1], 'time' => 3, 'vp' => '6', 'effect' => 'As an action: pay 1🐟 to add a blank to any uncovered icon.'],
        34 => ['name' => 'Salt Lick', 'cost' => ['stones' => 3, 'logs' => 2, 'clay' => 1], 'time' => 3, 'vp' => '6', 'effect' => 'When built: look at every opponent\'s hand of structure cards.'],
        35 => ['name' => 'Hidden Cache', 'cost' => ['vines' => 2, 'stones' => 3, 'clay' => 2], 'time' => 3, 'vp' => '0', 'effect' => 'End of game: +3 VP per 2 distinct materials in your built structures (max +9).'],
        36 => ['name' => 'Treaty Stone', 'cost' => ['stones' => 3, 'clay' => 2], 'time' => 4, 'vp' => '3', 'effect' => 'When you build: you may spend 2 of any one material as 1 of any other. Once per build.'],
        37 => ['name' => 'Cattail Patch', 'cost' => ['reeds' => 3, 'mud' => 2], 'time' => 3, 'vp' => '0', 'effect' => 'End of game: VP equal to 1/1/2/3/5/8 for 1/2/3/4/5/6 distinct materials across your built structures.'],
        38 => ['name' => 'Pack Rat Burrow', 'cost' => ['reeds' => 2, 'mud' => 2], 'time' => 2, 'vp' => '4', 'effect' => 'Once per game (flip card): discard 1 structure from your hand and take one of your choice from the discard pile.'],
        39 => ['name' => 'Tribute Stone', 'cost' => ['clay' => 2, 'stones' => 2], 'time' => 3, 'vp' => '5', 'effect' => 'Once per game (flip card): force an opponent to recall one of their workers from a river card (drops a blank). They slide back 3🐟 in compensation.'],
        40 => ['name' => 'Tow Line', 'cost' => ['mud' => 4, 'clay' => 2, 'vines' => 1], 'time' => 4, 'vp' => '8', 'effect' => 'Once per game (flip card): move any river card to River 1, then run an auction on it (no flat 🐟).'],
        41 => ['name' => 'Portage', 'cost' => ['vines' => 3, 'stones' => 2], 'time' => 3, 'vp' => '6', 'effect' => 'As an action: swap one of your workers on a river card with another worker on a different river card. Pay the source card\'s per-item cost in 🐟.'],
        42 => ['name' => 'Salmon Run', 'cost' => ['logs' => 4, 'vines' => 2], 'time' => 4, 'vp' => '6', 'effect' => 'As an action: place 1-5 workers from your supply onto uncovered icons of one river card. 🐟 cost escalates 1/2/3/5/8 per successive worker.'],
        44 => ['name' => 'Trophy Lodge', 'cost' => ['clay' => 3, 'stones' => 2], 'time' => 3, 'vp' => '0', 'effect' => 'End of game: +3 VP per ?-VP structure you control, including this one (max +12).'],
        45 => ['name' => 'Springwater Pool', 'cost' => ['vines' => 3, 'mud' => 2], 'time' => 3, 'vp' => '5', 'effect' => 'When built: ready all of your spent once-per-game cards.'],
        46 => ['name' => 'Spring Cascade', 'cost' => ['logs' => 2, 'mud' => 1], 'time' => 1, 'vp' => '3', 'effect' => 'Once per game (flip card): ready one of your other spent once-per-game cards.'],
        47 => ['name' => 'Trading Post', 'cost' => ['clay' => 2, 'reeds' => 2], 'time' => 3, 'vp' => '5', 'effect' => 'As an action: pay 1🐟 to recall 1 worker each from 3 different-material cards (drops 3 blanks), then place 2 free workers from supply onto uncovered icons of one card.'],
        48 => ['name' => 'Confluence', 'cost' => ['reeds' => 2, 'stones' => 2], 'time' => 3, 'vp' => '5', 'effect' => 'As an action: pool two cards that share a material symbol into one combined auction, merging their uncovered icons. You pay the lower of the two trigger 🐟 costs to start it, and everyone bids at the lower of the two 🐟/item rates. Both cards then float downriver.'],
    ];

    // 12 species starter cards (3 per species).
    public static array $STARTER = [
        0 => ['name' => 'Lodge Foundation', 'species' => 'beaver', 'vp' => 1, 'effect' => 'When you build a structure that uses Logs, advance 1 fewer fish (min 1).'],
        1 => ['name' => 'Tail Slap', 'species' => 'beaver', 'vp' => 2, 'effect' => 'At the start of your turn, you may pay 1 fish to drop a blank on any uncovered icon on a River 1 card.'],
        2 => ['name' => 'Beaver Cache', 'species' => 'beaver', 'vp' => 1, 'effect' => '+1 to your hand size. When built, draw a structure card.'],
        3 => ['name' => 'Kelp Bed', 'species' => 'otter', 'vp' => 0, 'effect' => 'Reeds icons cost you 1 less fish per item (min 1).'],
        4 => ['name' => 'Rolling Float', 'species' => 'otter', 'vp' => 1, 'effect' => 'Once per game, swap one of your workers on a river card with another worker on a different card in the same river slot. No fish cost.'],
        5 => ['name' => 'Stone Tool', 'species' => 'otter', 'vp' => 0, 'effect' => 'Once per game, when building, 1 of your Stones workers may substitute for any other material.'],
        6 => ['name' => 'Mud Burrow', 'species' => 'muskrat', 'vp' => 0, 'effect' => 'Mud icons cost you 1 less fish per item (min 1).'],
        7 => ['name' => 'Channel Clearer', 'species' => 'muskrat', 'vp' => 1, 'effect' => 'At the start of your turn, you may pay 1 fish to discard 1 worker from any Reeds river card (not a wild card); it returns to that player\'s supply without a blank.'],
        8 => ['name' => 'Marsh Lookout', 'species' => 'muskrat', 'vp' => 2, 'effect' => 'Peek at the top card of the material deck at any time.'],
        9 => ['name' => 'Clay Den', 'species' => 'mink', 'vp' => 0, 'effect' => 'Clay icons cost you 2 less fish per item (min 1).'],
        10 => ['name' => 'Quick Strike', 'species' => 'mink', 'vp' => 2, 'effect' => 'When you trigger an auction, you may declare your bid last (after all other bids are revealed). You must still bid at least 1 worker, as the trigger always does.'],
        11 => ['name' => 'Snare Set', 'species' => 'mink', 'vp' => 1, 'effect' => 'Once per game, force an opponent to recall one of their workers from a river card (drops a blank). The opponent slides back 3 fish in compensation.'],
    ];
}
