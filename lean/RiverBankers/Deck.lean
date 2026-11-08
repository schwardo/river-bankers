/-
Property 7: the material deck, as printed (bga/modules/php/Material.php, which
matches the rulebook's card list and badges).

Checks the rulebook's deck claims by computation:
  * "26 material cards"
  * "This makes the 2-player deck 11 cards."
  * "one card each at 4, 5, 7, and 8 icons (24 icons per material across its
    four cards ...)" and the tier rules for which sizes join at which count.
  * "Every material is equally available." This one is only true of the printed
    grid. Counting what a worker can actually *yield*, wildcards included, Reeds
    and Mud come out ahead at every player count (see `availability_*`).
-/
import RiverBankers.Core

namespace RiverBankers.Deck
open RiverBankers

/-- When a card joins the deck (its top-right badge). -/
inductive Tier where
  | always     -- un-badged
  | threePlus  -- "3+"
  | fourP      -- "4P"
  | twoOnly    -- "2P"
  deriving DecidableEq, Repr

structure MCard where
  name : String
  /-- The material grid slot the card fills; `none` for the Flotsam Raft. -/
  primary : Option Material
  /-- A wildcard's second material. -/
  alt : Option Material
  icons : Nat
  tier : Tier

open Material Tier in
/-- All 26 material cards. -/
def cards : List MCard := [
  ⟨"Fallen Limb",      some logs,   none,       4, threePlus⟩,
  ⟨"Driftwood Tangle", some logs,   some reeds, 5, always⟩,
  ⟨"Logjam",           some logs,   none,       7, always⟩,
  ⟨"Old Growth",       some logs,   none,       8, fourP⟩,
  ⟨"Cairn",            some stones, none,       4, threePlus⟩,
  ⟨"Rocky Shoal",      some stones, none,       5, threePlus⟩,
  ⟨"Basking Rocks",    some stones, none,       7, always⟩,
  ⟨"Quarry Bank",      some stones, none,       8, fourP⟩,
  ⟨"Hidden Inlet",     some reeds,  none,       4, threePlus⟩,
  ⟨"Reed Stand",       some reeds,  none,       5, always⟩,
  ⟨"Marsh Edge",       some reeds,  none,       7, always⟩,
  ⟨"Cattail Cluster",  some reeds,  none,       8, fourP⟩,
  ⟨"Mud Wallow",       some mud,    none,       4, threePlus⟩,
  ⟨"Mud Flat",         some mud,    none,       5, always⟩,
  ⟨"Silt Bank",        some mud,    none,       7, always⟩,
  ⟨"Floodplain",       some mud,    none,       8, fourP⟩,
  ⟨"Vine Curtain",     some vines,  none,       4, threePlus⟩,
  ⟨"Trailing Vine",    some vines,  none,       5, threePlus⟩,
  ⟨"Vine Thicket",     some vines,  none,       7, always⟩,
  ⟨"Strangler Knot",   some vines,  none,       8, fourP⟩,
  ⟨"Clay Seep",        some clay,   none,       4, threePlus⟩,
  ⟨"Clay Bank",        some clay,   none,       5, always⟩,
  ⟨"Mud Slick",        some clay,   some mud,   7, always⟩,
  ⟨"Slipping Sandbar", some clay,   none,       8, fourP⟩,
  ⟨"Bramble Shoal",    some stones, some vines, 5, twoOnly⟩,
  ⟨"Flotsam Raft",     none,        none,       6, threePlus⟩
]

def Tier.inDeck (n : Nat) : Tier → Bool
  | .always => true
  | .threePlus => 3 ≤ n
  | .fourP => 4 ≤ n
  | .twoOnly => n == 2

/-- The deck for `n` players. -/
def deck (n : Nat) : List MCard := cards.filter (·.tier.inDeck n)

def iconSum (l : List MCard) : Nat := (l.map (·.icons)).foldr (· + ·) 0

/-- A material's grid row: its cards at every tier except the 2P-only swap-in. -/
def row (m : Material) : List MCard :=
  cards.filter (fun c => c.primary == some m && c.tier != .twoOnly)

/-- Icons a worker could turn into material `m` at `n` players: solid cards of
`m`, plus wildcards that offer `m` as either option. -/
def available (n : Nat) (m : Material) : Nat :=
  iconSum ((deck n).filter (fun c => c.primary == some m || c.alt == some m))

def allMaterials : List Material := [.logs, .reeds, .mud, .clay, .stones, .vines]

theorem twenty_six_cards : cards.length = 26 := by decide

theorem two_player_deck_is_11 : (deck 2).length = 11 := by decide

/-- Deck sizes at 3 and 4 players (the Raft included). -/
theorem deck_sizes : (deck 3).length = 19 ∧ (deck 4).length = 25 := by decide

/-- The printed grid: every material's row has icon sizes 4, 5, 7, 8 (24 icons). -/
theorem grid_rows :
    allMaterials.all (fun m => ((row m).map (·.icons)) == [4, 5, 7, 8]) = true := by
  decide

/-- "the 7-icon cards are always in, the 4-icon cards join at 3+ players, and the
8-icon cards at 4 players." (Bramble Shoal and the Raft sit outside the grid.) -/
theorem tier_by_size :
    (cards.filter (·.primary.isSome)).all (fun c =>
      c.name == "Bramble Shoal" ||
      (c.icons == 7 && c.tier == .always) ||
      (c.icons == 4 && c.tier == .threePlus) ||
      (c.icons == 8 && c.tier == .fourP) ||
      (c.icons == 5 && (c.tier == .always || c.tier == .threePlus))) = true := by
  decide

/-- **Availability is not equal.** Counting wild icons toward both materials,
Reeds and Mud have more icons than the other four at every player count. Logs
spends its 5-slot on Driftwood Tangle and Clay its 7-slot on Mud Slick; their
partners (Reeds, Mud) get those icons on top of a full row of their own. -/
theorem availability_2p :
    allMaterials.map (available 2) = [12, 17, 19, 12, 12, 12] := by decide

theorem availability_3p :
    allMaterials.map (available 3) = [16, 21, 23, 16, 16, 16] := by decide

theorem availability_4p :
    allMaterials.map (available 4) = [24, 29, 31, 24, 24, 24] := by decide

/-- The surplus is exactly the partner's wildcard, at every count. -/
theorem surplus_is_the_wildcard (n : Nat) (h : 2 ≤ n) (h' : n ≤ 4) :
    available n .reeds = available n .logs + 5 ∧
    available n .mud = available n .clay + 7 := by
  have : n = 2 ∨ n = 3 ∨ n = 4 := by omega
  rcases this with rfl | rfl | rfl <;> decide

/-- The 4P Bramble Shoal idea (TODO in river-bankers.org): adding it at 4P brings
Stones and Vines up to exactly the Reeds surplus. -/
def deck4WithBramble : List MCard :=
  cards.filter (fun c => c.tier.inDeck 4 || c.name == "Bramble Shoal")

def available4B (m : Material) : Nat :=
  iconSum (deck4WithBramble.filter (fun c => c.primary == some m || c.alt == some m))

theorem bramble_at_4p :
    allMaterials.map available4B = [24, 29, 31, 24, 29, 29] ∧
    deck4WithBramble.length = 26 := by decide

end RiverBankers.Deck
