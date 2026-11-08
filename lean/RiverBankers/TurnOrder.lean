/-
Property 4: turn order.

"The next player to act is whoever is farthest back ... If pawns are tied on the
same space, the one on top of the stack acts first; a pawn moving onto a space
stacks on top."

Proved:
  * the selection rule always picks a pawn nobody outranks;
  * being farther back never hurts you: spending less, with everyone else fixed,
    never costs you the next turn, and a pawn strictly behind you always goes first;
  * the one way to jump the queue without being behind: landing *exactly* on a
    rival's space (even by paying a bid in their auction) puts you on top of
    them, so you act first at equal fish.
-/
import RiverBankers.Core

namespace RiverBankers.TurnOrder
open RiverBankers

def before (p q : Pawn) : Bool :=
  decide (p.fish < q.fish) || (decide (p.fish = q.fish) && decide (q.height < p.height))

theorem before_iff (p q : Pawn) : before p q = true ↔ actsBefore p q := by
  simp [before, actsBefore]

/-- Scan the pawns, keeping whichever acts first. -/
def pick (b q : Pawn) : Pawn := if before q b then q else b

def nextOf : Pawn → List Pawn → Pawn
  | b, [] => b
  | b, q :: qs => nextOf (pick b q) qs

theorem nextOf_mem : ∀ (qs : List Pawn) (b : Pawn), nextOf b qs = b ∨ nextOf b qs ∈ qs
  | [], b => Or.inl rfl
  | q :: qs, b => by
    simp only [nextOf]
    rcases nextOf_mem qs (pick b q) with h | h
    · rw [h]; simp only [pick]; split
      · exact Or.inr (List.mem_cons_self ..)
      · exact Or.inl rfl
    · exact Or.inr (List.mem_cons_of_mem _ h)

/-- **The chosen pawn is outranked by nobody.** -/
theorem nextOf_min : ∀ (qs : List Pawn) (b : Pawn) (seen : List Pawn),
    (∀ x ∈ seen, ¬ actsBefore x b) →
    ∀ x ∈ b :: seen ++ qs, ¬ actsBefore x (nextOf b qs) := by
  intro qs
  induction qs with
  | nil =>
    intro b seen hseen x hx
    simp only [nextOf, List.append_nil] at *
    rcases List.mem_cons.mp hx with rfl | hx
    · exact actsBefore_irrefl _
    · exact hseen x hx
  | cons q qs ih =>
    intro b seen hseen x hx
    simp only [nextOf]
    apply ih (pick b q) (b :: seen ++ [q])
    · intro y hy
      simp only [pick]
      split
      · rename_i hqb
        have hqb := (before_iff q b).mp hqb
        intro hyq
        rcases List.mem_append.mp hy with hy | hy
        · rcases List.mem_cons.mp hy with rfl | hy
          · exact actsBefore_irrefl _ (actsBefore_trans _ _ _ hyq hqb)
          · exact hseen y hy (actsBefore_trans _ _ _ hyq hqb)
        · rw [List.mem_singleton.mp hy] at hyq
          exact actsBefore_irrefl _ hyq
      · rename_i hqb
        have hqb : ¬ actsBefore q b := fun h => hqb ((before_iff q b).mpr h)
        rcases List.mem_append.mp hy with hy | hy
        · rcases List.mem_cons.mp hy with rfl | hy
          · exact actsBefore_irrefl _
          · exact hseen y hy
        · rw [List.mem_singleton.mp hy]
          exact hqb
    · rcases List.mem_cons.mp hx with rfl | hx
      · simp
      · rcases List.mem_append.mp hx with hx | hx
        · simp [hx]
        · rcases List.mem_cons.mp hx with rfl | hx
          · simp
          · simp [hx]

/-- The pawn to act next, from a nonempty table. -/
def next (p : Pawn) (ps : List Pawn) : Pawn := nextOf p ps

theorem next_is_min (p : Pawn) (ps : List Pawn) :
    ∀ x ∈ p :: ps, ¬ actsBefore x (next p ps) := by
  have := nextOf_min ps p [] (by simp)
  simpa [next] using this

/-- Who is next is determined by `actsBefore` alone. `IsNext me others`: nobody
in `others` outranks `me`. -/
def IsNext (me : Pawn) (others : List Pawn) : Prop := ∀ q ∈ others, ¬ actsBefore q me

/-- **Spending less never costs you the turn.** -/
theorem spend_less_still_next (f f' h : Nat) (others : List Pawn) (hf : f ≤ f')
    (hn : IsNext ⟨f', h⟩ others) : IsNext ⟨f, h⟩ others := by
  intro q hq hb
  apply hn q hq
  simp only [actsBefore] at *
  omega

/-- **A pawn strictly behind you always goes before you.** -/
theorem behind_goes_first (me q : Pawn) (others : List Pawn) (hq : q ∈ others)
    (hbehind : q.fish < me.fish) : ¬ IsNext me others :=
  fun hn => hn q hq (Or.inl hbehind)

/-- **Landing on a rival's space jumps them.** A pawn arriving on your space
stacks on top and acts before you, though its fish total is no lower. -/
theorem landing_on_you_jumps (me : Pawn) (f newHeight : Nat)
    (hf : f = me.fish) (htop : me.height < newHeight) :
    actsBefore ⟨f, newHeight⟩ me := by
  simp only [actsBefore]; omega

end RiverBankers.TurnOrder
