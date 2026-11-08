/-
Property 3: conservation.

(a) Workers. Each player owns 8 workers, which are always somewhere: in supply or
    on a card. Every way a worker moves is one of `place` (supply → card),
    `release` (card → supply), a card entering, or a card leaving with none of
    this player's workers on it. A card-to-card move (ferry, Portage, Burrow
    Network, Rolling Float) is a `release` followed by a `place`.

(b) Icons. On a river card every icon is exactly one of uncovered, worker, or
    blank, and every effect in the game preserves that.

(c) Two consequences the termination argument (Loop.lean) needs: blanks on a
    river card never go away, and the *only* ways an icon becomes uncovered again
    are worker removals that skip the blank (Channel Clearer, Hollowed-out Log).
-/
import RiverBankers.Core

namespace RiverBankers.Conservation
open RiverBankers

/-! ### (a) Workers -/

def getAt : List Nat → Nat → Nat
  | [], _ => 0
  | x :: _, 0 => x
  | _ :: xs, i + 1 => getAt xs i

def setAt : List Nat → Nat → Nat → List Nat
  | [], _, _ => []
  | _ :: xs, 0, v => v :: xs
  | x :: xs, i + 1, v => x :: setAt xs i v

def removeAt : List Nat → Nat → List Nat
  | [], _ => []
  | _ :: xs, 0 => xs
  | x :: xs, i + 1 => x :: removeAt xs i

theorem total_setAt : ∀ (l : List Nat) (i v : Nat), i < l.length →
    total (setAt l i v) + getAt l i = total l + v
  | [], _, _, h => by simp at h
  | x :: xs, 0, v, _ => by simp [setAt, getAt, total]; omega
  | x :: xs, i + 1, v, h => by
    have := total_setAt xs i v (by simp at h; omega)
    simp only [setAt, getAt, total]; omega

theorem total_removeAt : ∀ (l : List Nat) (i : Nat), i < l.length →
    total (removeAt l i) + getAt l i = total l
  | [], _, h => by simp at h
  | x :: xs, 0, _ => by simp [removeAt, getAt, total]; omega
  | x :: xs, i + 1, h => by
    have := total_removeAt xs i (by simp at h; omega)
    simp only [removeAt, getAt, total]; omega

theorem total_append_zero : ∀ l : List Nat, total (l ++ [0]) = total l
  | [] => rfl
  | x :: xs => by simp only [List.cons_append, total]; rw [total_append_zero xs]

/-- One player's workers: supply, and how many sit on each card in play. -/
structure Workers where
  supply : Nat
  board : List Nat

def Workers.count (w : Workers) : Nat := w.supply + total w.board

inductive WStep where
  /-- supply → card `i`: auction placement, Sap Drip, Salmon Run, Reed Walkway, Trading Post. -/
  | place (i k : Nat)
  /-- card `i` → supply: build spend, recall, Channel Clearer, Tribute Stone, Snare Set,
  Hollowed-out Log, losing bidders' workers never leave supply at all. -/
  | release (i k : Nat)
  /-- A material card enters the river (nobody's workers on it yet). -/
  | enter
  /-- Card `i` leaves the game. Rules only remove a card with no workers left
  (shoreline discard, empty Raft), so this player has none there. -/
  | leave (i : Nat)

/-- `none` = the step is illegal in this state. -/
def WStep.apply : WStep → Workers → Option Workers
  | .place i k, w =>
    if k ≤ w.supply ∧ i < w.board.length then
      some ⟨w.supply - k, setAt w.board i (getAt w.board i + k)⟩ else none
  | .release i k, w =>
    if k ≤ getAt w.board i ∧ i < w.board.length then
      some ⟨w.supply + k, setAt w.board i (getAt w.board i - k)⟩ else none
  | .enter, w => some ⟨w.supply, w.board ++ [0]⟩
  | .leave i, w =>
    if getAt w.board i = 0 ∧ i < w.board.length then
      some ⟨w.supply, removeAt w.board i⟩ else none

theorem WStep.count_preserved (s : WStep) (w w' : Workers) (h : s.apply w = some w') :
    w'.count = w.count := by
  cases s with
  | place i k =>
    simp only [WStep.apply] at h
    split at h
    · rename_i hc; injection h with h; subst h
      have := total_setAt w.board i (getAt w.board i + k) hc.2
      simp only [Workers.count]; omega
    · contradiction
  | release i k =>
    simp only [WStep.apply] at h
    split at h
    · rename_i hc; injection h with h; subst h
      have := total_setAt w.board i (getAt w.board i - k) hc.2
      simp only [Workers.count]; omega
    · contradiction
  | enter =>
    simp only [WStep.apply] at h; injection h with h; subst h
    simp [Workers.count, total_append_zero]
  | leave i =>
    simp only [WStep.apply] at h
    split at h
    · rename_i hc; injection h with h; subst h
      have := total_removeAt w.board i hc.2
      simp only [Workers.count]; omega
    · contradiction

def runW : List WStep → Workers → Option Workers
  | [], w => some w
  | s :: ss, w => (s.apply w).bind (runW ss)

/-- **Every player has exactly 8 workers for the whole game**, whatever happens. -/
theorem eight_workers_always :
    ∀ (ss : List WStep) (w w' : Workers), w.count = 8 → runW ss w = some w' → w'.count = 8 := by
  intro ss
  induction ss with
  | nil => intro w w' h hr; simp [runW] at hr; subst hr; exact h
  | cons s ss ih =>
    intro w w' h hr
    simp only [runW] at hr
    cases hs : s.apply w with
    | none => rw [hs] at hr; contradiction
    | some w1 =>
      rw [hs] at hr
      exact ih w1 w' (by rw [WStep.count_preserved s w w1 hs]; exact h) hr

/-! ### (b) Icons -/

structure Icons where
  icons : Nat
  uncovered : Nat
  workers : Nat
  blanks : Nat

def Icons.Inv (c : Icons) : Prop := c.uncovered + c.workers + c.blanks = c.icons

inductive IStep where
  /-- Workers claim uncovered icons (auction, Sap Drip, Salmon Run, ferry, Reed Walkway). -/
  | place (k : Nat)
  /-- Workers leave, dropping blanks (build spend, recall, Tribute Stone, ferry source). -/
  | leaveWithBlank (k : Nat)
  /-- Workers leave *without* a blank (Channel Clearer, Hollowed-out Log). -/
  | leaveNoBlank (k : Nat)
  /-- Blanks dropped on uncovered icons (Mud Levee, Driftwood Snag, Tail Slap). -/
  | dropBlank (k : Nat)
  /-- A worker moves onto a blank (Burrow Network "may replace a blank"). -/
  | onBlank
  /-- A swap between two players (Portage, Rolling Float): the count is unchanged. -/
  | swap

def IStep.apply : IStep → Icons → Option Icons
  | .place k, c => if k ≤ c.uncovered then some { c with uncovered := c.uncovered - k, workers := c.workers + k } else none
  | .leaveWithBlank k, c => if k ≤ c.workers then some { c with workers := c.workers - k, blanks := c.blanks + k } else none
  | .leaveNoBlank k, c => if k ≤ c.workers then some { c with workers := c.workers - k, uncovered := c.uncovered + k } else none
  | .dropBlank k, c => if k ≤ c.uncovered then some { c with uncovered := c.uncovered - k, blanks := c.blanks + k } else none
  | .onBlank, c => if 1 ≤ c.blanks then some { c with blanks := c.blanks - 1, workers := c.workers + 1 } else none
  | .swap, c => some c

theorem IStep.inv_preserved (s : IStep) (c c' : Icons) (hi : c.Inv) (h : s.apply c = some c') :
    c'.Inv := by
  unfold Icons.Inv at *
  cases s <;> simp only [IStep.apply] at h <;>
    (try split at h) <;> (try contradiction) <;>
    (injection h with h; subst h; (try dsimp only); omega)

theorem IStep.icons_fixed (s : IStep) (c c' : Icons) (h : s.apply c = some c') :
    c'.icons = c.icons := by
  cases s <;> simp only [IStep.apply] at h <;>
    (try split at h) <;> (try contradiction) <;> (injection h with h; subst h; rfl)

/-! ### (c) What the termination argument needs -/

/-- Only Burrow Network's move-onto-a-blank ever removes a blank, and it replaces it
with a worker, so blanks + workers never drop except as workers leave. In
particular `blanks` never decreases under any other step. -/
theorem blanks_monotone (s : IStep) (c c' : Icons) (h : s.apply c = some c') (hs : s ≠ .onBlank) :
    c.blanks ≤ c'.blanks := by
  cases s with
  | onBlank => exact absurd rfl hs
  | _ =>
    simp only [IStep.apply] at h
    (try split at h) <;> (try contradiction) <;>
    (injection h with h; subst h; (try dsimp only); omega)

/-- Covered icons (worker or blank) only go back to uncovered through the
no-blank removals. -/
theorem uncovered_grows_only_by_noBlank (s : IStep) (c c' : Icons) (h : s.apply c = some c')
    (hgrow : c.uncovered < c'.uncovered) : ∃ k, s = .leaveNoBlank k := by
  cases s with
  | leaveNoBlank k => exact ⟨k, rfl⟩
  | _ =>
    simp only [IStep.apply] at h
    (try split at h) <;> (try contradiction) <;>
    (injection h with h; subst h; (try dsimp only at hgrow); omega)

end RiverBankers.Conservation
