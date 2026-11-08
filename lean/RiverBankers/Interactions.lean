/-
Property 5: card interactions.

(a) Once-per-game cards can't loop. Springwater Pool ("When built: ready all of
    your spent once-per-game cards") and Spring Cascade ("Once per game (flip
    card): ready one of your *other* spent once-per-game cards") can refresh each
    other, but a potential function shows every sequence of uses is finite, with
    an explicit bound. The word "other" on Spring Cascade is load-bearing: without
    it, Cascade readying itself is a no-op loop.

    How many "ready all" events can one player get? Springwater Pool fires when
    built, and there is one copy in the deck. Mill Wheel can copy a neighbor's
    "when built" effect, Springwater's included, but that needs the *neighbor* to
    own the only Springwater. So any one player gets at most 1. The bound below
    takes that count as a parameter `sw` anyway.

(b) Build-cost reducers don't commute. Log Flume ("advance 3 fewer 🐟 (min 1; 0🐟
    cards stay 0)") and Lodge Foundation ("advance 1 fewer fish", no floor) give
    different totals depending on which applies first. sim.js and BGA apply Log
    Flume first (sim.js performBuild), which is the cheaper order. The rulebook
    and card text don't say.

(c) Free and fish-negative actions exist, all tied to a finite resource. See
    Loop.lean for how that plays into termination.
-/
import RiverBankers.Core

namespace RiverBankers.Interactions
open RiverBankers

/-! ### (a) Once-per-game readiness -/

structure OState where
  /-- Your once-per-game cards other than Spring Cascade. -/
  k : Nat
  /-- How many of those are ready (face up). -/
  ready : Nat
  /-- Spring Cascade ready? (false also covers "not built") -/
  cascade : Bool
  /-- "Ready all" events still to come (Springwater Pool / Mill Wheel's copy). -/
  sw : Nat

def OState.Valid (s : OState) : Prop := s.ready ≤ s.k

inductive OStep where
  /-- Use one ready once-per-game card (flip it). -/
  | useOther
  /-- Use Spring Cascade: flip it, ready one other spent card. -/
  | useCascade
  /-- Springwater Pool resolves: everything ready, Cascade included. -/
  | readyAll

def OStep.apply : OStep → OState → Option OState
  | .useOther, s => if 0 < s.ready then some { s with ready := s.ready - 1 } else none
  | .useCascade, s =>
    if s.cascade = true ∧ s.ready < s.k then some { s with cascade := false, ready := s.ready + 1 }
    else none
  | .readyAll, s =>
    if 0 < s.sw then some { s with ready := s.k, cascade := true, sw := s.sw - 1 } else none

/-- Potential: Cascade counts double, since using it spends it but readies another. -/
def phi (s : OState) : Nat := s.ready + (if s.cascade then 2 else 0) + (s.k + 3) * s.sw

theorem OStep.phi_decreases (st : OStep) (s s' : OState) (hv : s.Valid) (h : st.apply s = some s') :
    s'.Valid ∧ phi s' < phi s := by
  unfold OState.Valid at *
  cases st with
  | useOther =>
    simp only [OStep.apply] at h
    split at h
    · injection h with h; subst h; simp only [phi]; constructor <;> (try split) <;> omega
    · contradiction
  | useCascade =>
    simp only [OStep.apply] at h
    split at h
    · rename_i hc; injection h with h; subst h
      obtain ⟨hc1, hc2⟩ := hc
      simp only [phi, hc1, Bool.false_eq_true, ↓reduceIte]; constructor <;> omega
    · contradiction
  | readyAll =>
    simp only [OStep.apply] at h
    split at h
    · rename_i hc; injection h with h; subst h
      cases hsw : s.sw with
      | zero => omega
      | succ n =>
        simp only [phi, hsw, Nat.add_sub_cancel, Nat.mul_succ]
        constructor
        · omega
        · simp only [↓reduceIte]; split <;> omega
    · contradiction

def runO : List OStep → OState → Option OState
  | [], s => some s
  | st :: sts, s => (st.apply s).bind (runO sts)

/-- **Every legal sequence of once-per-game activations is shorter than `phi`.** -/
theorem once_per_game_bounded :
    ∀ (sts : List OStep) (s s' : OState), s.Valid → runO sts s = some s' →
      sts.length + phi s' ≤ phi s := by
  intro sts
  induction sts with
  | nil => intro s s' _ h; simp [runO] at h; subst h; simp
  | cons st sts ih =>
    intro s s' hv h
    simp only [runO] at h
    cases hs : st.apply s with
    | none => rw [hs] at h; contradiction
    | some s1 =>
      rw [hs] at h
      obtain ⟨hv1, hlt⟩ := st.phi_decreases s s1 hv hs
      have := ih s1 s' hv1 h
      simp only [List.length_cons]; omega

/-- With everything ready and one Springwater to come, at most `2k + 5` uses. -/
theorem concrete_bound (k : Nat) :
    phi ⟨k, k, true, 1⟩ = 2 * k + 5 := by
  simp only [phi, ↓reduceIte]; omega

/-- **Why Cascade says "other".** If it could ready itself, using it would leave
the state unchanged: an action you can repeat forever. -/
def cascadeSelf (s : OState) : Option OState :=
  if s.cascade = true then some { s with cascade := false } |>.map (fun s' => { s' with cascade := true })
  else none

theorem cascade_self_is_a_loop (s : OState) (h : s.cascade = true) : cascadeSelf s = some s := by
  simp [cascadeSelf, h]
  cases s; simp_all

/-! ### (b) Build-cost reducers -/

/-- Log Flume: "advance 3 fewer 🐟 (min 1; 0🐟 cards stay 0)". -/
def logFlume (t : Nat) : Nat := if t = 0 then 0 else max 1 (t - 3)
/-- Lodge Foundation: "advance 1 fewer fish" (Logs-using builds; no floor). -/
def lodge (t : Nat) : Nat := t - 1

/-- **Order matters.** A 4🐟 Logs structure: Flume first costs 0, Lodge first costs 1. -/
theorem reducers_dont_commute : lodge (logFlume 4) = 0 ∧ logFlume (lodge 4) = 1 := by decide

/-- The sim's order (Flume, then Lodge) is never worse for the builder. -/
theorem sim_order_is_cheaper (t : Nat) : lodge (logFlume t) ≤ logFlume (lodge t) := by
  simp only [lodge, logFlume]
  by_cases h1 : t = 0 <;> by_cases h2 : t - 1 = 0 <;> simp only [h1, h2, ↓reduceIte] <;> omega

/-- They only disagree when the printed cost is 2–4. -/
theorem reducers_disagree_iff (t : Nat) :
    lodge (logFlume t) ≠ logFlume (lodge t) ↔ 2 ≤ t ∧ t ≤ 4 := by
  simp only [lodge, logFlume]
  by_cases h1 : t = 0 <;> by_cases h2 : t - 1 = 0 <;> simp only [h1, h2, ↓reduceIte] <;> omega

/-! ### (c) Builds that cost nothing, or pay you -/

/-- Net fish for one build: printed time after reducers, minus Vine Trellis's
slide-back, minus a when-built slide-back. Integer, since it can go negative. -/
def buildNet (time : Nat) (trellis whenBuiltBack : Nat) : Int :=
  (time : Int) - trellis - whenBuiltBack

/-- Spillway is printed at 0🐟: building it is a free action. -/
theorem spillway_free : buildNet 0 0 0 = 0 := rfl

/-- Burrow Run (0🐟, uses Vines, "slide your pawn back 5") with Vine Trellis out:
the build *pays* you 6. -/
theorem burrow_run_pays : buildNet 0 1 5 = -6 := rfl

/-- The most any single build can pay is 6: Burrow Run is the only when-built
slide-back, and Trellis adds 1. Every build also uses up a structure card for
good, so this happens at most once per card. -/
theorem build_pays_at_most_six (time : Nat) (trellis back : Nat)
    (ht : trellis ≤ 1) (hb : back ≤ 5) : -6 ≤ buildNet time trellis back := by
  simp only [buildNet]; omega

end RiverBankers.Interactions
