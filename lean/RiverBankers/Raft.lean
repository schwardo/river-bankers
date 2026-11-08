/-
Property 6: Flotsam Raft ferrying.

"For each worker moved, slide back this card's current per-item cost in 🐟, then
advance the destination card's per-item cost — ferrying from a deep raft to a
cheap card can pay you back." "each moved worker leaves a blank behind, so each
flotsam icon can be used exactly once."

Proved:
  * per worker, ferrying can pay back at most 3🐟 over what the worker cost to
    put aboard (bought at ≥ 1🐟, the raft rate is ≤ 5🐟, a destination ≥ 1🐟);
  * the number of ferries over the raft's life is at most its uncovered icons
    plus the no-blank recalls (Hollowed-out Log) used on it. Channel Clearer is
    Reeds-only, and Burrow Network / Portage / Rolling Float can't touch the raft;
  * so the total tempo the raft can ever hand out is at most 3 × (6 + recalls),
    18🐟 with no recalls. It's a real swing, but a bounded one, not an
    infinite-tempo trick.
-/
import RiverBankers.Core
import RiverBankers.Conservation

namespace RiverBankers.Raft
open RiverBankers RiverBankers.Conservation

/-- One ferried worker: the raft rate it was bought at, the raft's rate when it
leaves, and the destination card's rate for this player. -/
structure Ferry where
  buy : Nat
  raft : Nat
  dest : Nat

/-- The raft is material-less, so no discount applies to it: 1🐟 in the Headwaters,
up to 5🐟 at River 4. A destination is a real material card, ≥ 1🐟 after
discounts. -/
def Ferry.Legal (f : Ferry) : Prop := 1 ≤ f.buy ∧ f.raft ≤ 5 ∧ 1 ≤ f.dest

/-- Fish the owner gets back on the ferry, net of the two payments. -/
def Ferry.payback (f : Ferry) : Int := (f.raft : Int) - f.buy - f.dest

theorem payback_le_three (f : Ferry) (h : f.Legal) : f.payback ≤ 3 := by
  obtain ⟨h1, h2, h3⟩ := h
  simp only [Ferry.payback]; omega

/-- The best case is real: bought from the Headwaters (1🐟), ferried off River 4
(5🐟) onto a discounted 1🐟 card. -/
example : (Ferry.payback ⟨1, 5, 1⟩) = 3 := rfl

/-- Without a discount on the destination (River 1 = 2🐟), it's 2 per worker. -/
example : (Ferry.payback ⟨1, 5, 2⟩) = 2 := rfl

def totalPayback : List Ferry → Int
  | [] => 0
  | f :: fs => f.payback + totalPayback fs

theorem totalPayback_le (fs : List Ferry) (h : ∀ f ∈ fs, f.Legal) :
    totalPayback fs ≤ 3 * fs.length := by
  induction fs with
  | nil => simp [totalPayback]
  | cons f fs ih =>
    have h1 := payback_le_three f (h f (List.mem_cons_self ..))
    have h2 := ih (fun x hx => h x (List.mem_cons_of_mem _ hx))
    simp only [totalPayback, List.length_cons]; omega

/-! ### How many ferries can there be? -/

def placed : IStep → Nat
  | .place k => k
  | _ => 0

def dropped : IStep → Nat
  | .dropBlank k => k
  | _ => 0

def unblanked : IStep → Nat
  | .leaveNoBlank k => k
  | _ => 0

def sumBy (g : IStep → Nat) : List IStep → Nat
  | [] => 0
  | s :: ss => g s + sumBy g ss

def runI : List IStep → Icons → Option Icons
  | [], c => some c
  | s :: ss, c => (s.apply c).bind (runI ss)

/-- Uncovered-icon bookkeeping, exactly: what ends uncovered plus what got placed
or blanked equals what started uncovered plus what got un-blanked. -/
theorem uncovered_ledger :
    ∀ (ss : List IStep) (c c' : Icons), runI ss c = some c' →
      c'.uncovered + sumBy placed ss + sumBy dropped ss = c.uncovered + sumBy unblanked ss := by
  intro ss
  induction ss with
  | nil => intro c c' h; simp [runI] at h; subst h; simp [sumBy]
  | cons s ss ih =>
    intro c c' h
    simp only [runI] at h
    cases hs : s.apply c with
    | none => rw [hs] at h; contradiction
    | some c1 =>
      rw [hs] at h
      have := ih c1 c' h
      simp only [sumBy]
      cases s <;> simp only [IStep.apply] at hs <;>
        (try split at hs) <;> (try contradiction) <;>
        (injection hs with hs; subst hs; simp only [placed, dropped, unblanked] at *; omega)

/-- **Placements onto the raft are bounded** by its icons plus no-blank recalls.
Every ferry starts from a placement, so this bounds ferries too. -/
theorem raft_placements_bounded (ss : List IStep) (c c' : Icons) (h : runI ss c = some c') :
    sumBy placed ss ≤ c.uncovered + sumBy unblanked ss := by
  have := uncovered_ledger ss c c' h; omega

/-- **The raft's total payback over the whole game is at most `3 × (6 + recalls)`.** -/
theorem raft_total_payback (fs : List Ferry) (hl : ∀ f ∈ fs, f.Legal)
    (ss : List IStep) (c c' : Icons) (hrun : runI ss c = some c')
    (hicons : c.uncovered ≤ 6) (hferries : fs.length ≤ sumBy placed ss) :
    totalPayback fs ≤ 3 * (6 + sumBy unblanked ss) := by
  have h1 := totalPayback_le fs hl
  have h2 := raft_placements_bounded ss c c' hrun
  omega

end RiverBankers.Raft
