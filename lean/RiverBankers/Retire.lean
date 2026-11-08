/-
Property 2: finish spaces.

"You stay on the space you landed on — but if another retired pawn is already
there, slide forward to the next open space (two pawns never share a finish
space)." "On your turn you may retire instead of taking an action: advance your
pawn to the lowest open space at or past the finish line."

Proved: both rules always produce a free space, any sequence of retirements
leaves every retired pawn on its own space, and retiring early takes the best
(lowest) space available, which is what the tiebreak rewards.

Caveat, also proved: the final-build round moves pawns again *after* everyone
has retired, and nothing keeps them apart there, so final fish totals can tie.
-/
import RiverBankers.Core

namespace RiverBankers.Retire
open RiverBankers

def maxL : List Nat → Nat
  | [] => 0
  | x :: xs => max x (maxL xs)

theorem le_maxL : ∀ {l : List Nat} {x : Nat}, x ∈ l → x ≤ maxL l
  | [], _, h => by simp at h
  | y :: ys, x, h => by
    simp only [maxL]
    rcases List.mem_cons.mp h with rfl | h
    · exact Nat.le_max_left _ _
    · exact Nat.le_trans (le_maxL h) (Nat.le_max_right _ _)

/-- The first space at or after `n` that no retired pawn occupies. -/
def findOpen (occ : List Nat) (n : Nat) : Nat :=
  if h : n ∈ occ then findOpen occ (n + 1) else n
termination_by maxL occ + 1 - n
decreasing_by have := le_maxL h; omega

theorem findOpen_spec (occ : List Nat) (n : Nat) :
    findOpen occ n ∉ occ ∧ n ≤ findOpen occ n ∧
      ∀ m, n ≤ m → m < findOpen occ n → m ∈ occ := by
  fun_induction findOpen occ n with
  | case1 n h ih =>
    obtain ⟨h1, h2, h3⟩ := ih
    refine ⟨h1, by omega, fun m hm hlt => ?_⟩
    by_cases hmn : m = n
    · exact hmn ▸ h
    · exact h3 m (by omega) hlt
  | case2 n h =>
    exact ⟨h, Nat.le_refl _, fun m hm hlt => absurd hlt (by omega)⟩

theorem findOpen_free (occ : List Nat) (n : Nat) : findOpen occ n ∉ occ :=
  (findOpen_spec occ n).1

theorem findOpen_ge (occ : List Nat) (n : Nat) : n ≤ findOpen occ n :=
  (findOpen_spec occ n).2.1

/-- `findOpen` is the *lowest* free space at or after `n`. -/
theorem findOpen_least (occ : List Nat) (n m : Nat) (hm : n ≤ m) (hfree : m ∉ occ) :
    findOpen occ n ≤ m := by
  have h3 := (findOpen_spec occ n).2.2
  by_cases hlt : m < findOpen occ n
  · exact absurd (h3 m hm hlt) hfree
  · omega

/-- A pawn landing exactly on a free space keeps it ("a pawn that overshot the
line keeps its spot"). -/
theorem findOpen_keeps (occ : List Nat) (n : Nat) (h : n ∉ occ) : findOpen occ n = n :=
  Nat.le_antisymm (findOpen_least occ n n (Nat.le_refl _) h) (findOpen_ge occ n)

/-- How a pawn retires. -/
inductive Retirement where
  /-- Carried across the line by its own action or a bid; `landed` is where the
  fish took it (`≥ 90`). -/
  | crossed (landed : Nat)
  /-- The voluntary Retire action. -/
  | early

def Retirement.spot (occ : List Nat) : Retirement → Nat
  | .crossed landed => findOpen occ landed
  | .early => findOpen occ finishLine

/-- Process retirements in order; returns occupied spaces, newest first. -/
def retireAll : List Retirement → List Nat
  | [] => []
  | r :: rs => let occ := retireAll rs; r.spot occ :: occ

def Retirement.Legal : Retirement → Prop
  | .crossed landed => finishLine ≤ landed
  | .early => True

/-- **No two retired pawns share a space, and all are at or past the line.** -/
theorem retireAll_ok :
    ∀ rs : List Retirement, (∀ r ∈ rs, r.Legal) →
      (retireAll rs).Nodup ∧ ∀ x ∈ retireAll rs, finishLine ≤ x := by
  intro rs
  induction rs with
  | nil => intro _; exact ⟨List.nodup_nil, by simp [retireAll]⟩
  | cons r rs ih =>
    intro hl
    obtain ⟨hnd, hge⟩ := ih (fun x hx => hl x (List.mem_cons_of_mem _ hx))
    have hr := hl r (List.mem_cons_self ..)
    refine ⟨?_, ?_⟩
    · simp only [retireAll]
      refine List.nodup_cons.mpr ⟨?_, hnd⟩
      cases r with
      | crossed landed => exact findOpen_free _ _
      | early => exact findOpen_free _ _
    · intro x hx
      simp only [retireAll] at hx
      rcases List.mem_cons.mp hx with rfl | hx
      · cases r with
        | crossed landed =>
          simp only [Retirement.Legal] at hr
          exact Nat.le_trans hr (findOpen_ge _ _)
        | early => exact findOpen_ge _ _
      · exact hge x hx

/-- **Retiring early takes the best space on offer**: no free space at or past the
line is lower. Lower final fish wins ties, so this is the best tiebreak position
available at that moment. -/
theorem early_is_lowest (occ : List Nat) (m : Nat) (hm : finishLine ≤ m) (hfree : m ∉ occ) :
    Retirement.early.spot occ ≤ m :=
  findOpen_least occ finishLine m hm hfree

/-- The rulebook's worked example: a crosser on 94, then three early retirements,
take 90, 91, 92. -/
example : retireAll [.early, .early, .early, .crossed 94] = [92, 91, 90, 94] := by
  simp [retireAll, Retirement.spot, findOpen, finishLine]

/-- **The final-build round can recreate ties.** Retired pawns on 90 and 91; the
one on 90 makes a 1🐟 final build and lands on 91. "This build still costs fish
and slides your pawn forward", and the distinct-spaces rule only governs retiring.
If their VP are also equal, they share the victory. -/
example : (90 + 1 = 91) ∧ ¬ beats 10 (90 + 1) 10 91 ∧ ¬ beats 10 91 10 (90 + 1) := by
  simp [beats]

end RiverBankers.Retire
