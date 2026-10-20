# Bunyan — decision flows

The four decisions the app makes, as the knowledge base defines them. Each node names the file and field it reads.

- Where the app already does something (nutrition targets, set progression), the flow shows the current code path *and* the source's view, with differences pointing to the open questions in the ingestion log.
- Nothing here has been wired into the app.

## 1. Phase selection and progression

```mermaid
flowchart TD
    A[New user or new block] --> S{Screening<br/>assessments.js SCREENING.parq.logic}
    S -- any yes --> C[Clearance first<br/>scope.js clearance_chronic_condition] --> S
    S -- all no / cleared --> P1[Phase 1 Stabilisation endurance<br/>phases.js PHASES 1]
    P1 --> R1{Movement patterns mastered?<br/>2–6 weeks, person-specific<br/>PROGRESSION.weeksPerPhase}
    R1 -- no --> P1
    R1 -- yes --> G{Goal<br/>GOAL_PLANS / LEVELS}
    G -- fat loss / general health --> P2[Phase 2 Strength endurance]
    G -- hypertrophy --> P2
    G -- maximal strength / power --> P2
    P2 --> G2{Goal}
    G2 -- fat loss --> P3[Phase 3 Muscular development]
    G2 -- hypertrophy --> P3
    G2 -- strength / power --> P3o[Phase 3 optional] --> P4
    P3 --> F{Fat-loss plan: Jan–Jun 1→2→3 monthly,<br/>then undulating Jul–Dec}
    P4[Phase 4 Maximal strength<br/>experienced lifters only] --> G4{Power goal?}
    G4 -- yes, with stability + strength base --> P5[Phase 5 Power]
    G4 -- no --> B
    P3 --> B[Cycle back to phase 1 or 2<br/>between harder blocks — active rest]
    P5 --> B
    B --> R1
```

## 2. Corrective prescription

```mermaid
flowchart TD
    A[Assessment<br/>assessments.js ASSESSMENTS] --> PN{Pain during<br/>any movement?}
    PN -- yes --> REF[Stop. Refer for medical evaluation<br/>scope.js refer_pain_movement]
    PN -- no --> F[Findings, e.g. knees cave in]
    F --> M[Muscles<br/>imbalances.js MOVEMENT_FAULTS / PATTERNS]
    M --> O[Overactive list]
    M --> U[Underactive list]
    O --> S1[1 Inhibit — SMR, 1–3 groups × ≥30 s<br/>corrective.js SEQUENCE 1]
    S1 --> S2[2 Lengthen — static ph1 / active ph2–4 / dynamic ph5<br/>TECHNIQUES stretches whose target ∈ overactive]
    U --> S3[3 Activate — core + balance at phase level<br/>PHASE_VARIABLES phase .activation]
    S2 --> S3
    S3 --> S4[4 Integrate — resistance by movement pattern<br/>PHASE_VARIABLES phase .resistance]
    S4 --> CD[Cool-down: SMR + static on the same overactive muscles]
    S1 -.-> X{Precaution or contraindication?<br/>corrective.js TECHNIQUES SMR lists, conditions.js}
    X -- contraindicated --> ALT[Skip SMR — e.g. osteopenia → low-intensity static stretching]
```

## 3. Progression / deload

```mermaid
flowchart TD
    A[Logged sets: load, reps, RPE] --> E[e1RM — Bunyan uses Epley capped at 12<br/>source chart: load ÷ 1 − 0.025·reps — open question 22]
    A --> Q{Technique held and target reps reached<br/>with the last reps a struggle?<br/>assessments.js training_load}
    Q -- yes --> V[Progress one variable at a time<br/>PHASE_SUMMARY progressBy for the phase]
    V --> V1[Phase 1: instability, then volume, then intensity, then less rest]
    V --> V2[Phase 2: less rest, volume, load, complexity]
    V --> V3[Phase 4: load, then sets]
    V --> V5[Phase 5: tempo, then sets]
    Q -- no, form breaks --> D[Reduce load to keep the rep range<br/>acute-variables.js VARIABLES.restRule]
    A --> OT{Overtraining signs?<br/>disturbed sleep, fatigue, falling performance,<br/>appetite loss, mood swings}
    OT -- yes --> DL[Cut volume and intensity, more recovery<br/>return to phase 1 as active rest]
    OT -- no --> Q
    V --> C10[Weekly volume rises ≤10%<br/>cardio.js GUIDELINES.progression]
```

## 4. Nutrition target derivation

```mermaid
flowchart TD
    A[Profile: age, sex, height, weight, activity, goal<br/>state.js S.profile + S.body] --> B[BMR — Mifflin-St Jeor<br/>formulas.js bmr, uses lastWeight]
    B --> T[TDEE = BMR × activity multiplier<br/>formulas.js tdee]
    T --> G{Goal}
    G -- lose --> L[TDEE − 500 — matches the source]
    G -- gain --> M[TDEE + 250 — source suggests +350–500<br/>open question 19]
    G -- recomp --> R[TDEE − 250]
    L --> P[Protein: user-entered S.goals.p<br/>source 1.6–2.2 g/kg for hypertrophy]
    M --> P
    R --> P
    P --> MAC[Calories from macros 4/4/9]
    MAC --> W[Water: default 3,000 mL<br/>source 2.7 L women / 3.7 L men — open question 18]
    A -.-> SC{Condition or clinical diet?<br/>scope.js nutrition_out_of_scope, refer_nutrition}
    SC -- yes --> RD[Refer to a registered dietitian — no meal plan]
    B -.-> N[Note: the source says all prediction equations tend to underestimate RMR<br/>open question 16 — label targets as estimates]
```
