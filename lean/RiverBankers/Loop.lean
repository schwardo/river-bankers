/-
Property 1: does the game always end?

**No.** Portage ("As an action: swap one of your workers on a river card with
another player's worker on a different river card. Pay the source card's
per-item cost in 🐟. They slide back 2🐟 in compensation.") costs exactly 2🐟 at
River 1, and the victim gets exactly 2🐟 back. Two players who want each other's
spot can swap the same pair of workers back and forth forever: the second via
Mill Wheel's "As an action: activate the 'as an action' ability of a built
structure controlled by the player to your left or right". Total fish never
moves, no card moves, the deck never shrinks, so the end-of-deck drift never
starts. sim.js hit this (~1 in 1,500 greedy 3P games) and patched its *AI* with
an anti-ping-pong check (sim.js "Anti ping-pong"). Neither the rulebook nor BGA
(`Game::portageSwap`) forbids it.

This file proves:
  * `portage_loop_forever`: an explicit legal position that repeats forever;
  * `drift_breaks_the_loop`: once the material deck is empty, the +1 drift makes
    the same exchange end;
  * the general picture, as a ledger argument. Every action except Portage at
    River 1 either moves the fish track forward or uses up something finite (a
    structure card, a raft icon, a card graduating, a once-per-game use, a
    player retiring). Any game whose turns all have that property ends within an
    explicit bound (`ledger_bound`). Portage at River 1 is exactly the one
    action that doesn't (`progress_iff`).

The finiteness of each "used" resource is argued, not modeled end to end. It
rests on the bounds in Conservation.lean, Interactions.lean and Raft.lean.
-/
import RiverBankers.Core

namespace RiverBankers.Loop
open RiverBankers

/-! ### The loop -/

/-- Two players, A (owns Portage) and B (owns Mill Wheel, sits next to A). Card
X and card Y are both on River 1. `cfg = false`: A's worker on X, B's on Y. -/
structure PP where
  a : Nat
  b : Nat
  /-- On a tie, A's pawn is on top. -/
  aTop : Bool
  cfg : Bool
  deriving DecidableEq, Repr

def aActs (s : PP) : Bool := decide (s.a < s.b) || (decide (s.a = s.b) && s.aTop)

/-- One turn of the exchange. The payer advances River 1's 2🐟 (plus drift `d`);
the victim slides back 2 and moves last, so it tops any tie. -/
def step (d : Nat) (s : PP) : PP :=
  if aActs s then ⟨s.a + 2 + d, s.b - 2, false, !s.cfg⟩
  else ⟨s.a - 2, s.b + 2 + d, true, !s.cfg⟩

/-- The mover holds the worker the swap needs (A swaps from X, B swaps back). -/
def legalMove (s : PP) : Bool := if aActs s then !s.cfg else s.cfg

def run (d : Nat) : Nat → PP → PP
  | 0, s => s
  | n + 1, s => run d n (step d s)

def s0 : PP := ⟨10, 10, true, false⟩
def s1 : PP := ⟨12, 8, false, true⟩

theorem step_s0 : step 0 s0 = s1 := by decide
theorem step_s1 : step 0 s1 = s0 := by decide

theorem orbit : ∀ n, run 0 n s0 = s0 ∨ run 0 n s0 = s1 := by
  intro n
  suffices h : ∀ n, (run 0 n s0 = s0 ∨ run 0 n s0 = s1) ∧ (run 0 n s1 = s0 ∨ run 0 n s1 = s1) from (h n).1
  intro n
  induction n with
  | zero => exact ⟨Or.inl rfl, Or.inr rfl⟩
  | succ k ih =>
    simp only [run, step_s0, step_s1]
    exact ⟨ih.2, ih.1⟩

/-- **The game never ends.** Every move in the orbit is legal, neither player
gets near the 90 finish line, and a third player sitting on 11 is never next
(the lower of A and B is always at 10 or 8). -/
theorem portage_loop_forever (n : Nat) :
    let s := run 0 n s0
    legalMove s = true ∧ s.a < finishLine ∧ s.b < finishLine ∧ min s.a s.b < 11 := by
  rcases orbit n with h | h <;> rw [h] <;> decide

/-! ### What breaks it: the drift -/

/-- With the deck empty, each full exchange moves both pawns up by exactly 1. -/
theorem drift_cycle (x : Nat) (hx : 2 ≤ x) :
    step 1 (step 1 ⟨x, x, true, false⟩) = ⟨x + 1, x + 1, true, false⟩ := by
  have h1 : x - 2 + 2 + 1 = x + 1 := by omega
  have h2 : x + 2 + 1 - 2 = x + 1 := by omega
  simp [step, aActs, h1, h2]
  omega

theorem drift_breaks_the_loop (k : Nat) :
    run 1 (2 * k) ⟨10, 10, true, false⟩ = ⟨10 + k, 10 + k, true, false⟩ := by
  induction k with
  | zero => rfl
  | succ k ih =>
    have : 2 * (k + 1) = 2 * k + 2 := by omega
    rw [this]
    have hsplit : ∀ m s, run 1 (m + 2) s = step 1 (step 1 (run 1 m s)) := by
      intro m
      induction m with
      | zero => intro s; rfl
      | succ m ihm => intro s; simp only [run] at *; exact ihm _
    rw [hsplit, ih, drift_cycle (10 + k) (by omega)]
    rfl

/-- So with the drift, 160 turns of the exchange put both pawns on the line. -/
example : run 1 160 ⟨10, 10, true, false⟩ = ⟨90, 90, true, false⟩ :=
  drift_breaks_the_loop 80

/-! ### The general picture: a fish ledger -/

/-- What one event does to the whole table: forward fish (all pawns), backward
fish (all pawns), and units of finite resources used up. -/
structure Ledger where
  up : Nat
  down : Nat
  used : Nat

/-- An action makes progress if the track moves forward, or it pays for any
backward movement (≤ 10 per unit) by using up a finite resource. -/
def Ledger.Progress (l : Ledger) : Prop := l.down + 1 ≤ l.up + 11 * l.used
/-- A side event may not move the table backward more than it pays for. -/
def Ledger.Harmless (l : Ledger) : Prop := l.down ≤ l.up + 10 * l.used

def Ledger.add (x y : Ledger) : Ledger := ⟨x.up + y.up, x.down + y.down, x.used + y.used⟩

/-- The turn-actions. -/
inductive Action where
  | pull (slot : Nat)
  | swim
  | flush
  | invent (n : Nat)
  /-- `time` after reducers; `trellis` = Vine Trellis slide-back; `back` = a
  when-built slide-back (Burrow Run). Uses up a structure card for good. -/
  | build (time trellis back : Nat)
  /-- `k` workers off the raft: `back` = total raft rate refunded, `dest` = total
  destination rate paid. Uses up `k` raft icons. -/
  | ferry (k back dest : Nat)
  /-- Heron Roost, Driftwood Snag, Trading Post: 1🐟. -/
  | ability1
  /-- Confluence: the lower of two trigger costs. -/
  | confluence (cost : Nat)
  /-- Portage (or Mill Wheel's copy): source card's per-item cost; victim gets 2. -/
  | portage (rate : Nat)
  /-- Retire (uses up an active player). -/
  | retire

def Action.Legal : Action → Prop
  | .pull s => 1 ≤ s ∧ s ≤ 3
  | .swim => True
  | .flush => True
  | .invent n => 2 ≤ n ∧ n ≤ 5
  | .build _ trellis back => trellis ≤ 1 ∧ back ≤ 5
  | .ferry k back dest => 1 ≤ k ∧ back ≤ 5 * k ∧ k ≤ dest
  | .ability1 => True
  | .confluence c => 1 ≤ c
  | .portage r => 2 ≤ r ∧ r ≤ 5
  | .retire => True

def Action.ledger : Action → Ledger
  | .pull s => ⟨pullCost s, 0, 0⟩
  | .swim => ⟨swimCost, 0, 0⟩
  | .flush => ⟨flushCost, 0, 0⟩
  | .invent n => ⟨inventCost n, 0, 0⟩
  | .build time trellis back => ⟨time, trellis + back, 1⟩
  | .ferry k back dest => ⟨dest, back, k⟩
  | .ability1 => ⟨1, 0, 0⟩
  | .confluence c => ⟨c, 0, 0⟩
  | .portage r => ⟨r, 2, 0⟩
  | .retire => ⟨0, 0, 1⟩

/-- **Portage at River 1 is the one action that makes no progress.** -/
theorem progress_iff (a : Action) (h : a.Legal) :
    a.ledger.Progress ↔ a ≠ .portage 2 := by
  cases a <;> simp only [Action.Legal] at h <;>
    simp [Action.ledger, Ledger.Progress, pullCost, swimCost, flushCost, inventCost] <;> omega

/-- Side events within a turn. -/
inductive Side where
  /-- Other bidders paying in this auction. -/
  | bids (fish : Nat)
  /-- End-of-turn drift once the material deck is empty. -/
  | drift
  /-- Tail Slap / Channel Clearer: 1🐟 at the start of a turn. -/
  | startOfTurn
  /-- A card graduates: Hidden Inlet (≤ 4), Mud Wallow (2 per tied leader, ≤ 8),
  Cattail Cluster (3). Each card graduates once. -/
  | graduate (back : Nat)
  /-- Tribute Stone / Snare Set compensation: the card's per-item cost, ≤ 5. Uses
  a once-per-game activation (bounded in Interactions.lean). -/
  | compensation (back : Nat)
  /-- Streambank Hollow: back 1 per worker recalled. Each recalled worker drops a
  blank or leaves a shoreline card, both finite (Conservation.lean). -/
  | streambank (k : Nat)

def Side.Legal : Side → Prop
  | .graduate b => b ≤ 8
  | .compensation b => b ≤ 5
  | _ => True

def Side.ledger : Side → Ledger
  | .bids f => ⟨f, 0, 0⟩
  | .drift => ⟨1, 0, 0⟩
  | .startOfTurn => ⟨1, 0, 0⟩
  | .graduate b => ⟨0, b, 1⟩
  | .compensation b => ⟨0, b, 1⟩
  | .streambank k => ⟨0, k, k⟩

theorem side_harmless (s : Side) (h : s.Legal) : s.ledger.Harmless := by
  cases s <;> simp only [Side.Legal] at h <;> simp [Side.ledger, Ledger.Harmless] <;> omega

/-- A turn: one action plus any side events. -/
def turnLedger (a : Action) : List Side → Ledger
  | [] => a.ledger
  | s :: ss => (turnLedger a ss).add s.ledger

theorem turn_progress (a : Action) (ss : List Side)
    (ha : a.ledger.Progress) (hs : ∀ s ∈ ss, s.ledger.Harmless) :
    (turnLedger a ss).Progress := by
  induction ss with
  | nil => exact ha
  | cons s ss ih =>
    have h1 := ih (fun x hx => hs x (List.mem_cons_of_mem _ hx))
    have h2 := hs s (List.mem_cons_self ..)
    simp only [turnLedger, Ledger.add, Ledger.Progress, Ledger.Harmless] at *
    omega

def sumL : List Ledger → Ledger
  | [] => ⟨0, 0, 0⟩
  | l :: ls => l.add (sumL ls)

/-- **The ledger bound.** If every turn makes progress, the number of turns is
at most the net forward fish plus 11 per unit of finite resource used. In a real
game the net forward fish is bounded (every active pawn is short of 90, and a
retired pawn stops a single action past it), and so is the resource total, so
the game ends. -/
theorem ledger_bound (ts : List Ledger) (h : ∀ t ∈ ts, t.Progress) :
    ts.length + (sumL ts).down ≤ (sumL ts).up + 11 * (sumL ts).used := by
  induction ts with
  | nil => simp [sumL]
  | cons t ts ih =>
    have h1 := ih (fun x hx => h x (List.mem_cons_of_mem _ hx))
    have h2 := h t (List.mem_cons_self ..)
    simp only [sumL, Ledger.add, Ledger.Progress, List.length_cons] at *
    omega

theorem game_ends (ts : List Ledger) (h : ∀ t ∈ ts, t.Progress) (C B : Nat)
    (hfish : (sumL ts).up ≤ (sumL ts).down + C) (hres : (sumL ts).used ≤ B) :
    ts.length ≤ C + 11 * B := by
  have := ledger_bound ts h; omega

/-! ### Candidate fixes, checked -/

/-- Paying 1 less compensation (1🐟) makes every Portage progress. -/
theorem fix_compensation_one (r : Nat) (h : 2 ≤ r) : (Ledger.Progress ⟨r, 1, 0⟩) := by
  simp [Ledger.Progress]; omega

/-- So does keeping 2🐟 compensation but charging the per-item cost + 1. -/
theorem fix_cost_plus_one (r : Nat) (h : 2 ≤ r) : (Ledger.Progress ⟨r + 1, 2, 0⟩) := by
  simp [Ledger.Progress]; omega

/-- **If Portage's cost took discounts** ("the source card's per-item cost" read as
*your* cost; sim and BGA both charge the printed rate), a Reed Bed or Kelp Bed
would put a Reeds card at 1🐟. Then the exchange moves the track *backward*, and
even the drift (+1) only brings it to a standstill. -/
theorem discounted_portage_beats_drift : ¬ Ledger.Progress ⟨1 + 1, 2, 0⟩ := by
  simp [Ledger.Progress]

end RiverBankers.Loop
