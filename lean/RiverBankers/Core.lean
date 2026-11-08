/-
River Bankers: the core rules, formalized in Lean 4 (core library only, no Mathlib).

Source: rulebook/rulebook.html. Rule quotes in comments are verbatim from it.

This covers the rule *engine*, not the 50 structure cards or the 11 material-card
effects. What is modeled:

  1. Prices: per-item rates, action costs, discounts, the 1-fish floor
  2. Auctions: bid cap, pay-first, plenty vs. jam, overbid, first-mover consolation
  3. Card movement: the slide / graduate rule (plus Flotsam Raft as a variant)
  4. The fish track: laps, the finish line, turn order
  5. Final scoring: leftover-worker pairs, including wildcard cards

Every `theorem` below is machine-checked. From `lean/`, run `lake build`; a
clean build means everything type-checks. The other modules in this directory
build on this one:

  Deck          deck composition and per-material availability
  Retire        finish spaces never collide; early retirement takes the lowest
  Conservation  8 workers per player; icon states partition each card
  TurnOrder     the next-player rule, and why being behind never hurts
  Interactions  once-per-game readying is bounded; reducer order matters
  Raft          ferrying pays back at most 3🐟 per worker, boundedly often
  Loop          the game need NOT end: the Portage ping-pong at River 1
-/

namespace RiverBankers

/-! ## Arithmetic helpers

Core Lean's `omega` treats `a * r` as an opaque atom when neither side is a
literal, so these two small lemmas carry the multiplication facts it can't see. -/

theorem mul_le_mul_rate {a b : Nat} (h : a ≤ b) : ∀ r : Nat, a * r ≤ b * r
  | 0 => by simp
  | r + 1 => by
    have ih := mul_le_mul_rate h r
    rw [Nat.mul_succ, Nat.mul_succ]
    omega

theorem mul_lt_mul_rate {a b : Nat} (h : a < b) (r : Nat) (hr : 0 < r) :
    a * r < b * r := by
  cases r with
  | zero => omega
  | succ k =>
    have := mul_le_mul_rate (Nat.le_of_lt h) k
    rw [Nat.mul_succ, Nat.mul_succ]
    omega

/-! ## 1. Board positions and prices -/

inductive Material where
  | logs | reeds | mud | clay | stones | vines
  deriving DecidableEq, Repr

/-- Where a material card can be. Headwaters slots are 1–3, river spaces 1–4,
matching the rulebook's numbering. Indices outside those ranges are excluded by
the `Valid` predicate below rather than by the type, which keeps `omega` happy. -/
inductive Loc where
  | headwaters (slot : Nat)
  | river (space : Nat)
  | shoreline
  deriving DecidableEq, Repr

def Loc.Valid : Loc → Prop
  | .headwaters s => 1 ≤ s ∧ s ≤ 3
  | .river s => 1 ≤ s ∧ s ≤ 4
  | .shoreline => True

/-- "Shoreline cards can't be auctioned." -/
def Loc.Auctionable : Loc → Prop
  | .headwaters _ => True
  | .river _ => True
  | .shoreline => False

/-- "Headwaters auctions resolve at a flat Headwaters rate of 1🐟/item."
"River 1 = 2🐟/item, River 2 = 3🐟/item, River 3 = 4🐟/item, River 4 = 5🐟/item." -/
def baseRate : Loc → Nat
  | .headwaters _ => 1
  | .river s => s + 1
  | .shoreline => 0

/-- Pull: "2🐟 for Headwaters 1, 3🐟 for Headwaters 2, 4🐟 for Headwaters 3". -/
def pullCost (slot : Nat) : Nat := slot + 1
def swimCost : Nat := 1
def flushCost : Nat := 5
/-- Invent: "the fish cost is exactly the number you draw", 2 ≤ N ≤ 5. -/
def inventCost (n : Nat) : Nat := n

/-- "a per-item cost never drops below 1🐟". Discounts stack, so `d` is their sum. -/
def discountedRate (base d : Nat) : Nat := max 1 (base - d)

/-- "A wildcard counts as both of its materials for discounts (use the larger if
both apply)." -/
def wildRate (base da db : Nat) : Nat := discountedRate base (max da db)

theorem baseRate_pos {l : Loc} (h : l.Auctionable) : 1 ≤ baseRate l := by
  cases l with
  | headwaters _ => simp [baseRate]
  | river s => simp [baseRate]
  | shoreline => exact absurd h id

/-- Rates rise by exactly one per river space downstream. -/
theorem baseRate_downstream (s : Nat) :
    baseRate (.river (s + 1)) = baseRate (.river s) + 1 := by
  simp [baseRate]

/-- Headwaters is "slightly cheaper than River 1". -/
theorem headwaters_cheaper_than_river (s t : Nat) (ht : 1 ≤ t) :
    baseRate (.headwaters s) < baseRate (.river t) := by
  simp [baseRate]; omega

theorem discountedRate_pos (base d : Nat) : 1 ≤ discountedRate base d :=
  Nat.le_max_left 1 _

theorem discountedRate_le (base d : Nat) (hb : 1 ≤ base) :
    discountedRate base d ≤ base := by
  simp [discountedRate]; omega

/-- Discounts never make a card *more* expensive, and more discount is never worse. -/
theorem discountedRate_antitone (base d d' : Nat) (h : d ≤ d') :
    discountedRate base d' ≤ discountedRate base d := by
  simp [discountedRate]; omega

/-- A wildcard is never more expensive than either of its materials alone would be. -/
theorem wildRate_le_left (base da db : Nat) :
    wildRate base da db ≤ discountedRate base da :=
  discountedRate_antitone base da (max da db) (Nat.le_max_left da db)

theorem wildRate_le_right (base da db : Nat) :
    wildRate base da db ≤ discountedRate base db :=
  discountedRate_antitone base db (max da db) (Nat.le_max_right da db)

/-- Every action that triggers an auction costs at least 1 fish up front. -/
theorem auction_actions_cost_pos (slot : Nat) :
    1 ≤ pullCost slot ∧ 1 ≤ swimCost ∧ 1 ≤ flushCost := by
  simp [pullCost, swimCost, flushCost]

/-! ## 2. Auctions

Bids are a list, one entry per player. `opn` is the number of uncovered icons.
The rules this section encodes:

  * "A bid is capped at the number of uncovered icons on the card."
  * "The triggering player must bid at least one; other players may bid zero."
  * "If the total fits on the card (bids ≤ icons), everyone gets exactly what they bid."
  * "If the total goes over (bids > icons), the river jams. ... Each player takes
    their own bid minus the overbid."
  * "If no one bid more than the overbid ..., the player who initiated the auction
    still claims one item as a consolation prize."
-/

def total : List Nat → Nat
  | [] => 0
  | b :: bs => b + total bs

/-- "Count how many extra workers were bid beyond the card's capacity — that's the
overbid." -/
def overbid (opn : Nat) (bids : List Nat) : Nat := total bids - opn

def IsJam (opn : Nat) (bids : List Nat) : Prop := opn < total bids

/-- Rulebook phrasing: what a player who bid `b` places, before the consolation. -/
def place (opn : Nat) (bids : List Nat) (b : Nat) : Nat :=
  if total bids ≤ opn then b else b - overbid opn bids

/-- Sum over all players of `b - o` (truncated at zero). -/
def clinchSum (o : Nat) : List Nat → Nat
  | [] => 0
  | b :: bs => (b - o) + clinchSum o bs

/-- How many players bid strictly more than the overbid, i.e. actually clinch. -/
def winners (o : Nat) : List Nat → Nat
  | [] => 0
  | b :: bs => (if o < b then 1 else 0) + winners o bs

/-- Total workers placed on the card by one auction, consolation included. -/
def placedTotal (opn : Nat) (bids : List Nat) : Nat :=
  if total bids ≤ opn then total bids
  else
    let c := clinchSum (overbid opn bids) bids
    if c = 0 then 1 else c

/-- A legal set of bids: every bid within the cap, and the initiator bid ≥ 1. -/
structure LegalBids (opn : Nat) (bids : List Nat) (init : Nat) : Prop where
  init_lt : init < bids.length
  capped : ∀ b ∈ bids, b ≤ opn
  init_pos : 1 ≤ bids[init]'init_lt

/-! ### Per-player view

Hold everyone else's bids fixed and call their sum `others`. This is the view a
bidder actually faces, and it is where the strategic theorems live. -/

/-- What a player bidding `b` places, given the sum of everyone else's bids. -/
def clinch (opn b others : Nat) : Nat :=
  if b + others ≤ opn then b else b - (b + others - opn)

/-- The per-player formula is the rulebook's "bid minus the overbid", restated. -/
theorem clinch_eq_place (opn b others : Nat) (bids : List Nat)
    (ht : total bids = b + others) :
    clinch opn b others = place opn bids b := by
  simp [clinch, place, overbid, ht]

/-- **The jam theorem.** In a jam, what you clinch is `opn - others`: it does not
depend on your own bid at all. Bidding into a jam only changes what you *pay*. -/
theorem clinch_jam (opn b others : Nat) (h : opn < b + others) :
    clinch opn b others = opn - others := by
  have hx : ¬ (b + others ≤ opn) := by omega
  simp only [clinch, hx, ↓reduceIte]
  omega

theorem clinch_le_bid (opn b others : Nat) : clinch opn b others ≤ b := by
  simp only [clinch]; split <;> omega

/-- You can never take more than the room the other bidders leave you. -/
theorem clinch_le_room (opn b others : Nat) : clinch opn b others ≤ opn - others := by
  simp only [clinch]; split <;> omega

/-- Raising your bid never loses you items (weakly monotone in your own bid). -/
theorem clinch_mono_bid (opn b b' others : Nat) (h : b ≤ b') :
    clinch opn b others ≤ clinch opn b' others := by
  simp only [clinch]; split <;> split <;> omega

/-- More competition never helps you. -/
theorem clinch_antitone_others (opn b s s' : Nat) (h : s ≤ s') :
    clinch opn b s' ≤ clinch opn b s := by
  simp only [clinch]; split <;> split <;> omega

/-- **Exact fill is the best response.** Given the others' total `s`, bidding
`opn - s` already clinches the most you can possibly get. -/
theorem exact_fill_is_optimal (opn s b : Nat) :
    clinch opn b s ≤ clinch opn (opn - s) s := by
  simp only [clinch]; split <;> split <;> omega

/-- ...and it is the *cheapest* bid that does: any bid clinching the maximum
`opn - s` is at least `opn - s`. -/
theorem exact_fill_is_cheapest (opn s b : Nat)
    (h : clinch opn b s = opn - s) : opn - s ≤ b := by
  have := clinch_le_bid opn b s; omega

/-- **Overbidding is strictly dominated.** If `b` already fills the card, any
larger `b'` clinches the same items and costs strictly more fish, at any positive
rate. -/
theorem overbid_dominated (opn s b b' rate : Nat)
    (hfill : opn ≤ b + s) (hb : b < b') (hr : 0 < rate) :
    clinch opn b' s = clinch opn b s ∧ b * rate < b' * rate := by
  constructor
  · simp only [clinch]; split <;> split <;> omega
  · exact mul_lt_mul_rate hb rate hr

/-- A jam is spite: in a jam, each extra worker you add takes exactly one item
away from each rival who is still clinching. Here `b` is the rival's bid and
`others` includes you. -/
theorem jam_bid_is_spite (opn b others : Nat) (h : opn < b + others)
    (hwin : others < opn) :
    clinch opn b (others + 1) + 1 = clinch opn b others := by
  rw [clinch_jam opn b others h, clinch_jam opn b (others + 1) (by omega)]
  omega

/-! ### Whole-auction view -/

theorem clinchSum_le (o : Nat) :
    ∀ l : List Nat, clinchSum o l ≤ total l - o := by
  intro l
  induction l with
  | nil => simp [clinchSum, total]
  | cons b bs ih => simp only [clinchSum, total]; omega

theorem clinchSum_zero_of_no_winners (o : Nat) :
    ∀ l : List Nat, winners o l = 0 → clinchSum o l = 0 := by
  intro l
  induction l with
  | nil => intro _; rfl
  | cons b bs ih =>
    intro h
    simp only [winners, clinchSum] at h ⊢
    by_cases hb : o < b
    · simp only [hb, ↓reduceIte] at h; omega
    · simp only [hb, ↓reduceIte] at h
      have := ih (by omega)
      omega

theorem clinchSum_pos_of_winner (o : Nat) :
    ∀ l : List Nat, 1 ≤ winners o l → 1 ≤ clinchSum o l := by
  intro l
  induction l with
  | nil => intro h; simp [winners] at h
  | cons b bs ih =>
    intro h
    simp only [winners, clinchSum] at h ⊢
    by_cases hb : o < b
    · omega
    · simp only [hb, ↓reduceIte] at h
      have := ih (by omega)
      omega

/-- One clinching player: the total placed is `b - o` plus nothing. -/
theorem clinchSum_one_winner (o cap : Nat) :
    ∀ l : List Nat, (∀ b ∈ l, b ≤ cap) → winners o l ≤ 1 → clinchSum o l ≤ cap - o := by
  intro l
  induction l with
  | nil => intros; simp [clinchSum]
  | cons b bs ih =>
    intro hcap hw
    simp only [winners, clinchSum] at hw ⊢
    have hb := hcap b (List.mem_cons_self ..)
    have hcap' : ∀ x ∈ bs, x ≤ cap := fun x hx => hcap x (List.mem_cons_of_mem _ hx)
    by_cases hob : o < b
    · simp only [hob, ↓reduceIte] at hw
      have := clinchSum_zero_of_no_winners o bs (by omega)
      omega
    · simp only [hob, ↓reduceIte] at hw
      have := ih hcap' (by omega)
      omega

/-- Each clinching player carries the overbid as dead weight. -/
theorem clinchSum_add_one (o : Nat) :
    ∀ l : List Nat, 1 ≤ winners o l → clinchSum o l + o ≤ total l := by
  intro l
  induction l with
  | nil => intro h; simp [winners] at h
  | cons b bs ih =>
    intro h
    simp only [winners, clinchSum, total] at h ⊢
    have := clinchSum_le o bs
    by_cases hb : o < b
    · omega
    · simp only [hb, ↓reduceIte] at h
      have := ih (by omega)
      omega

theorem clinchSum_add_two (o : Nat) :
    ∀ l : List Nat, 2 ≤ winners o l → clinchSum o l + 2 * o ≤ total l := by
  intro l
  induction l with
  | nil => intro h; simp [winners] at h
  | cons b bs ih =>
    intro h
    simp only [winners, clinchSum, total] at h ⊢
    by_cases hb : o < b
    · simp only [hb, ↓reduceIte] at h
      have := clinchSum_add_one o bs (by omega)
      omega
    · simp only [hb, ↓reduceIte] at h
      have := ih (by omega)
      omega

theorem total_zero_of_capped_zero :
    ∀ l : List Nat, (∀ b ∈ l, b ≤ 0) → total l = 0 := by
  intro l
  induction l with
  | nil => intro _; rfl
  | cons b bs ih =>
    intro h
    simp only [total]
    have := h b (List.mem_cons_self ..)
    have := ih (fun x hx => h x (List.mem_cons_of_mem _ hx))
    omega

theorem get_le_total : ∀ (l : List Nat) (i : Nat) (h : i < l.length), l[i] ≤ total l
  | [], _, h => by simp at h
  | b :: bs, 0, _ => by simp [total]
  | b :: bs, i + 1, h => by
    have := get_le_total bs i (by simp at h; omega)
    simp [total]; omega

/-- **Capacity.** An auction never places more workers than there are open icons —
including the first-mover consolation. -/
theorem placedTotal_le_open (opn : Nat) (bids : List Nat) (init : Nat)
    (hl : LegalBids opn bids init) : placedTotal opn bids ≤ opn := by
  have hopen : 1 ≤ opn := Nat.le_trans hl.init_pos (hl.capped _ (List.getElem_mem _))
  have hle := clinchSum_le (overbid opn bids) bids
  unfold overbid at hle
  by_cases ht : total bids ≤ opn
  · simp only [placedTotal, ht, ↓reduceIte]
  · by_cases hc : clinchSum (total bids - opn) bids = 0
    · simp only [placedTotal, overbid, ht, hc, ↓reduceIte]; omega
    · simp only [placedTotal, overbid, ht, hc, ↓reduceIte]; omega

/-- **Progress.** Every auction covers at least one icon. This is exactly what the
"initiator must bid ≥ 1" rule plus the first-mover consolation buy: without the
consolation, a full jam would cost everyone fish and change nothing on the board. -/
theorem placedTotal_pos (opn : Nat) (bids : List Nat) (init : Nat)
    (hl : LegalBids opn bids init) : 1 ≤ placedTotal opn bids := by
  have hinit : 1 ≤ total bids := Nat.le_trans hl.init_pos (get_le_total _ _ _)
  by_cases ht : total bids ≤ opn
  · simp only [placedTotal, ht, ↓reduceIte]; omega
  · by_cases hc : clinchSum (overbid opn bids) bids = 0
    · simp only [placedTotal, ht, hc, ↓reduceIte]; omega
    · simp only [placedTotal, ht, hc, ↓reduceIte]; omega

/-- Without the consolation the progress theorem is false: in the rulebook's own
first-mover example (three players each bid 2 on a 2-icon card), nobody clinches. -/
example : clinchSum (overbid 2 [2, 2, 2]) [2, 2, 2] = 0 := by decide

/-- **A jam never clears a card by itself.** If total bids overflow the card and
somebody clinches outright, at least one icon is left uncovered, so the card
slides rather than graduating. Needs the bid cap: one lone bid can't jam. -/
theorem jam_clinch_lt_open (opn : Nat) (bids : List Nat)
    (hcap : ∀ b ∈ bids, b ≤ opn) (hjam : IsJam opn bids) :
    clinchSum (overbid opn bids) bids < opn := by
  unfold IsJam at hjam
  unfold overbid
  have hopen : 1 ≤ opn := by
    cases Nat.eq_zero_or_pos opn with
    | inl h0 =>
      have := total_zero_of_capped_zero bids (fun b hb => h0 ▸ hcap b hb)
      omega
    | inr hp => exact hp
  generalize ho : total bids - opn = o
  by_cases h0 : winners o bids = 0
  · have := clinchSum_zero_of_no_winners o bids h0; omega
  · by_cases h1 : winners o bids = 1
    · have := clinchSum_one_winner o opn bids hcap (by omega); omega
    · have := clinchSum_add_two o bids (by omega); omega

/-- **...but the consolation can.** On a card with exactly one open icon, a full
jam's consolation item covers it, and the card leaves the river. This is the
*only* way a jam fills a card. -/
theorem jam_fills_card_only_when_one_icon (opn : Nat) (bids : List Nat)
    (hcap : ∀ b ∈ bids, b ≤ opn) (hjam : IsJam opn bids)
    (hfill : placedTotal opn bids = opn) : opn = 1 := by
  have hlt := jam_clinch_lt_open opn bids hcap hjam
  unfold IsJam at hjam
  have ht : ¬ (total bids ≤ opn) := by omega
  by_cases hc : clinchSum (overbid opn bids) bids = 0
  · simp only [placedTotal, ht, hc, ↓reduceIte] at hfill; omega
  · simp only [placedTotal, ht, hc, ↓reduceIte] at hfill; omega

/-- Concrete witness: one open icon, two bidders, one each. Both pay, the
initiator takes the last icon, and the card is full. -/
example : placedTotal 1 [1, 1] = 1 := by decide

/-! ## 3. Card movement

"If any icons are still uncovered, the card slides one space downstream —
Headwaters → River 1, River 1 → River 2, and so on. From River 4 it graduates to
the shoreline." "If every icon was claimed, the card ... goes straight to the
shoreline." -/

def slide : Loc → Loc
  | .headwaters _ => .river 1
  | .river s => if s < 4 then .river (s + 1) else .shoreline
  | .shoreline => .shoreline

def afterAuction (l : Loc) (remaining : Nat) : Loc :=
  if remaining = 0 then .shoreline else slide l

/-- Flotsam Raft: "it slides one space downstream as usual, even if every icon was
claimed ... but at River 4 it stays put instead of graduating." -/
def raftAfterAuction : Loc → Loc
  | .headwaters _ => .river 1
  | .river s => if s < 4 then .river (s + 1) else .river 4
  | .shoreline => .shoreline

/-- How many more auctions a card can take before it must leave the river. -/
def lifeLeft : Loc → Nat
  | .headwaters _ => 5
  | .river s => 5 - s
  | .shoreline => 0

theorem slide_valid {l : Loc} (h : l.Valid) : (slide l).Valid := by
  cases l with
  | headwaters _ => simp [slide, Loc.Valid]
  | river s =>
    simp only [slide]
    split
    · simp [Loc.Valid] at h ⊢; omega
    · trivial
  | shoreline => trivial

theorem afterAuction_valid {l : Loc} (r : Nat) (h : l.Valid) : (afterAuction l r).Valid := by
  simp only [afterAuction]
  split
  · trivial
  · exact slide_valid h

/-- Cards only ever move downstream: each auction strictly uses up life. -/
theorem afterAuction_lifeLeft_lt {l : Loc} (r : Nat) (hv : l.Valid) (ha : l.Auctionable) :
    lifeLeft (afterAuction l r) < lifeLeft l := by
  cases l with
  | headwaters _ =>
    simp only [afterAuction]; split <;> simp [slide, lifeLeft]
  | river s =>
    simp [Loc.Valid] at hv
    simp only [afterAuction]
    split
    · simp [lifeLeft]; omega
    · simp only [slide]; split <;> simp [lifeLeft] <;> omega
  | shoreline => exact absurd ha id

/-- Run a card through a sequence of auctions; each list entry is how many icons
were left uncovered afterward. Auctions stop once the card is off the river. -/
def runAuctions : List Nat → Loc → Loc
  | [], l => l
  | r :: rs, l =>
    match l with
    | .shoreline => .shoreline
    | l => runAuctions rs (afterAuction l r)

theorem runAuctions_shoreline : ∀ rs : List Nat, runAuctions rs .shoreline = .shoreline
  | [] => rfl
  | _ :: _ => rfl

/-- **Every ordinary card is auctioned at most 5 times** (once in the Headwaters,
once per river space), no matter how the bidding goes. -/
theorem card_graduates :
    ∀ (rs : List Nat) (l : Loc), l.Valid → lifeLeft l ≤ rs.length →
      runAuctions rs l = .shoreline := by
  intro rs
  induction rs with
  | nil =>
    intro l _ h
    cases l with
    | headwaters _ => simp [lifeLeft] at h
    | river s =>
      simp [lifeLeft] at h
      rename_i hv; simp [Loc.Valid] at hv; omega
    | shoreline => rfl
  | cons r rs ih =>
    intro l hv h
    cases l with
    | shoreline => rfl
    | headwaters s =>
      have hlt := afterAuction_lifeLeft_lt (l := .headwaters s) r hv trivial
      exact ih _ (afterAuction_valid r hv) (by simp at h ⊢; omega)
    | river s =>
      have hlt := afterAuction_lifeLeft_lt (l := .river s) r hv trivial
      exact ih _ (afterAuction_valid r hv) (by simp at h ⊢; omega)

/-- The raft breaks the position bound: at River 4 it can be auctioned forever as
far as position is concerned. -/
theorem raft_moors : raftAfterAuction (.river 4) = .river 4 := by decide

/-- What still bounds the raft is the progress theorem: its uncovered icons drop
by at least one per auction, so its 6 icons give at most 6 auctions. Here
`opn - placedTotal` is what's uncovered afterward. -/
theorem auction_shrinks_open (opn : Nat) (bids : List Nat) (init : Nat)
    (hl : LegalBids opn bids init) : opn - placedTotal opn bids < opn := by
  have := placedTotal_pos opn bids init hl
  have := placedTotal_le_open opn bids init hl
  omega

/-! ## 4. The fish track

"Your fish total is the space your pawn sits on plus 60 while it shows its '+60'
side." "The fish track has a single finish line at 90 fish ... (90 = space 30 on
the lap-2 side)." Pawns are modeled by their fish total; the board space and the
flip are derived. -/

def lap : Nat := 60
def finishLine : Nat := 90

def space (fish : Nat) : Nat := fish % lap
def flipped (fish : Nat) : Bool := decide (lap ≤ fish)

/-- The printed board, read back: space + 60 if flipped, recovers the fish total
for anyone who hasn't lapped twice. Nobody does, since the game ends at 90. -/
theorem board_reads_fish (fish : Nat) (h : fish < 2 * lap) :
    space fish + (if flipped fish then lap else 0) = fish := by
  simp only [space, flipped, lap] at *
  by_cases h60 : 60 ≤ fish
  · simp only [h60, decide_true, ↓reduceIte]; omega
  · simp only [h60, decide_false, Bool.false_eq_true, ↓reduceIte]; omega

theorem finish_is_space_30_lap_2 : space finishLine = 30 ∧ flipped finishLine = true := by
  decide

/-- A pawn. `height` orders pawns on the same space: "a pawn moving onto a space
stacks on top", so a later arrival gets a larger height. -/
structure Pawn where
  fish : Nat
  height : Nat
  deriving Repr

/-- `p` acts before `q`: farther back, or same total and higher in the stack. -/
def actsBefore (p q : Pawn) : Prop :=
  p.fish < q.fish ∨ (p.fish = q.fish ∧ q.height < p.height)

/-- Turn order is a strict order (no pawn acts before itself, and it chains). -/
theorem actsBefore_irrefl (p : Pawn) : ¬ actsBefore p p := by
  simp [actsBefore]

theorem actsBefore_trans (p q r : Pawn) :
    actsBefore p q → actsBefore q r → actsBefore p r := by
  simp only [actsBefore]; omega

/-- ...and total, as long as stack heights are distinct. So "who goes next" is
always well defined. -/
theorem actsBefore_total (p q : Pawn) (h : p.height ≠ q.height ∨ p.fish ≠ q.fish) :
    actsBefore p q ∨ actsBefore q p := by
  simp only [actsBefore]; omega

/-- **Tempo.** If you are next and your action costs `c` fish, you take the
following turn too exactly when you still sit behind the next pawn up. The
arriving pawn stacks on top, so a tie also keeps the turn. -/
theorem keeps_turn (me other : Pawn) (c : Nat) (newHeight : Nat)
    (hTop : other.height < newHeight) :
    actsBefore ⟨me.fish + c, newHeight⟩ other ↔ me.fish + c ≤ other.fish := by
  simp only [actsBefore]; omega

/-- Paying is commutative in the total: any spend plan reaching the same total
lands you on the same space. Turn order depends only on totals and stack order. -/
theorem pay_order_irrelevant (f a b : Nat) : f + a + b = f + b + a := by omega

/-! ## 5. Final scoring: leftover-worker pairs

"For each material, count your workers across all your cards of that material and
score floor(workers / 2)." "Wildcard cards ... let each of their workers count as
one of their two materials ... Assign each worker individually to maximize your
pair count."

For one wildcard pool between two materials: `a` solid workers of the first, `b`
of the second, `w` on the wildcard, `x` of which are assigned to the first. -/

def pairsWith (a b w x : Nat) : Nat := (a + x) / 2 + (b + (w - x)) / 2

/-- Closed form for the best assignment. -/
def bestPairs (a b w : Nat) : Nat := if w = 0 then a / 2 + b / 2 else (a + b + w) / 2

/-- No assignment beats the closed form. -/
theorem pairsWith_le_best (a b w x : Nat) (hx : x ≤ w) :
    pairsWith a b w x ≤ bestPairs a b w := by
  simp only [pairsWith, bestPairs]
  split <;> omega

/-- And the closed form is achieved: assign `a % 2` wild workers to the first
material (to even it out), the rest to the second. -/
theorem bestPairs_achieved (a b w : Nat) :
    pairsWith a b w (if w = 0 then 0 else a % 2) = bestPairs a b w := by
  simp only [pairsWith, bestPairs]
  split <;> omega

/-- **One wild worker is enough.** With a single wildcard worker, you score as if
every worker in the pool were one material: the wildcard removes all parity loss.
More wild workers add pairs only by adding workers. -/
theorem one_wild_suffices (a b w : Nat) (hw : 1 ≤ w) :
    bestPairs a b w = (a + b + w) / 2 := by
  have hw0 : ¬ (w = 0) := by omega
  simp only [bestPairs, hw0, ↓reduceIte]

/-- The most a wildcard can ever be worth over the same workers split solid is
one pair. -/
theorem wild_bonus_le_one (a b w x : Nat) (hx : x ≤ w) :
    bestPairs a b w ≤ (a + x) / 2 + (b + (w - x)) / 2 + 1 := by
  simp only [bestPairs]; split <;> omega

/-- Leftover pairs can never exceed half your workers: with 8 workers, at most 4★. -/
theorem pairs_le_half (a b w : Nat) : bestPairs a b w ≤ (a + b + w) / 2 := by
  simp only [bestPairs]; split <;> omega

theorem pairs_le_four (a b w : Nat) (h : a + b + w ≤ 8) : bestPairs a b w ≤ 4 := by
  have := pairs_le_half a b w; omega

/-! ## 6. Endgame tie-break

"Highest total wins; ties broken by the lower final fish total." -/

def beats (vp1 fish1 vp2 fish2 : Nat) : Prop := vp2 < vp1 ∨ (vp1 = vp2 ∧ fish1 < fish2)

theorem beats_asymm (v1 f1 v2 f2 : Nat) : beats v1 f1 v2 f2 → ¬ beats v2 f2 v1 f1 := by
  simp only [beats]; omega

/-- Two retired players never share a finish space, so the tiebreak is decisive
among retired players: equal VP still yields a unique winner. -/
theorem retired_tie_resolved (v f1 f2 : Nat) (h : f1 ≠ f2) :
    beats v f1 v f2 ∨ beats v f2 v f1 := by
  rcases Nat.lt_or_gt_of_ne h with h | h
  · exact Or.inl (Or.inr ⟨rfl, h⟩)
  · exact Or.inr (Or.inr ⟨rfl, h⟩)

end RiverBankers
