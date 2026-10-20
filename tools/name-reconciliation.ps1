# Bunyan — tools: name reconciliation (PROPOSAL ONLY)
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File tools/name-reconciliation.ps1 [-Library path\to\exercises.json] [-OutFile path.json]
# Writes tools/name-reconciliation.json. Applies NOTHING to exercises.json (spec §3.1).
#
# Each row: library id and name, the book-aligned name, confidence (exact | likely |
# uncertain), the reason, and the book's muscle group(s) for the exercise. The validation
# pass flags any row where none of the book's groups is the library's primary tag or a
# secondary — the check that caught all three earlier bad remaps. Anything below `exact`
# needs owner review. Renames, if approved, go in their own reviewed commit.
# Never run by the app.

param([string]$Library = (Join-Path (Split-Path -Parent $PSScriptRoot) "exercises.json"), [string]$OutFile = (Join-Path $PSScriptRoot "name-reconciliation.json"))
$ErrorActionPreference = "Stop"
$lib = Get-Content -Raw -Encoding UTF8 $Library | ConvertFrom-Json
$byId = @{}
foreach ($p in $lib.PSObject.Properties) { $byId[$p.Value.i] = @{ name = $p.Name; m = $p.Value.m; x = @($p.Value.x) } }

# id, book name, confidence, book groups (library tags via anatomy.js MUSCLE_MAP; empty = not checkable), reason
$map = @(
  @("Calves-SMR","Self-myofascial rolling: calves","exact",@("Calves"),"14.4 region 'calves'"),
  @("Peroneals-SMR","Self-myofascial rolling: peroneals","exact",@("Calves"),"14.4 region 'peroneals'"),
  @("Hamstring-SMR","Self-myofascial rolling: hamstrings","exact",@("Hamstrings"),"14.4 region 'hamstrings'"),
  @("Quadriceps-SMR","Self-myofascial rolling: quadriceps","exact",@("Quads"),"14.4 region 'quadriceps'"),
  @("Iliotibial_Tract-SMR","Self-myofascial rolling: lateral thigh","likely",@("Glutes"),"14.4 'lateral thigh'; the library names the IT tract; TFL maps to Glutes (medium)"),
  @("Piriformis-SMR","Self-myofascial rolling: piriformis","exact",@("Glutes"),"14.4 region 'piriformis'"),
  @("Latissimus_Dorsi-SMR","Self-myofascial rolling: latissimus dorsi","exact",@("Back"),"14.4 region 'latissimus dorsi'"),
  @("Standing_Gastrocnemius_Calf_Stretch","Static gastrocnemius stretch","likely",@("Calves"),"14.5 lunge-stance calf stretch, rear knee straight"),
  @("Standing_Soleus_And_Achilles_Stretch","Static soleus stretch","likely",@("Calves"),"14.5 as gastrocnemius with the back knee bent"),
  @("90_90_Hamstring","Static 90/90 hamstring stretch","exact",@("Hamstrings"),"14.5 same name and position"),
  @("Kneeling_Hip_Flexor","Static kneeling hip flexor stretch","likely",@("Quads"),"14.5; hip flexors map to Quads per library convention"),
  @("Side_Neck_Stretch","Static upper trapezius / scalene stretch","uncertain",@("Neck"),"14.5 lateral neck flexion; the library name is generic"),
  @("Arm_Circles","Arm circles","exact",@("Shoulders"),"14.7 dynamic drill"),
  @("Rope_Jumping","Jump rope","likely",@(),"14.7 warm-up drill; no muscle group given"),
  @("Plank","Plank","exact",@("Core"),"16.4"),
  @("Side_Bridge","Side plank","likely",@("Core"),"16.4; 'side bridge' is a synonym"),
  @("Dead_Bug","Dead bug","exact",@("Core"),"16.4"),
  @("Pallof_Press","Pallof press","exact",@("Core"),"16.4 anti-rotation"),
  @("Farmers_Walk","Farmer's carry","likely",@("Core"),"16.4 lists it as a level-1 core exercise (brace, stay upright)"),
  @("Crunches","Floor crunch","likely",@("Core"),"16.4 shoulder blades only — not a sit-up"),
  @("Hyperextensions_Back_Extensions","Back extension","likely",@("Back","Core"),"16.4 level-2 core; lumbar extensors map to Back"),
  @("Reverse_Crunch","Reverse crunch","exact",@("Core"),"16.4"),
  @("Standing_Cable_Lift","Cable lift","likely",@("Core"),"16.4"),
  @("Standing_Cable_Wood_Chop","Cable chop","likely",@("Core"),"16.4 'the reverse of the lift'"),
  @("Butt_Lift_Bridge","Floor bridge","uncertain",@("Glutes","Core"),"16.4 floor bridge; library name differs"),
  @("Physioball_Hip_Bridge","Ball bridge","uncertain",@("Glutes","Core"),"16.4 bridge with head and shoulders on the ball — check the library picture"),
  @("Kettlebell_One-Legged_Deadlift","Single-leg Romanian deadlift","uncertain",@("Hamstrings","Glutes","Back"),"17.4/20.13; the library entry is kettlebell-specific"),
  @("Step-up_with_Knee_Raise","Multiplanar step-up to balance","uncertain",@("Glutes","Quads"),"17.4; the book version holds single-leg balance at the top"),
  @("Freehand_Jump_Squat","Squat jump","likely",@("Quads","Glutes"),"18.3"),
  @("Split_Jump","Lunge jump","uncertain",@("Quads","Glutes"),"18.3; 'split jump' is a common synonym"),
  @("Knee_Tuck_Jump","Tuck jump","likely",@(),"18.3; the book gives no muscle group"),
  @("Double_Leg_Butt_Kick","Butt kick","likely",@(),"18.3 two-foot jump bringing heels to glutes"),
  @("Front_Box_Jump","Box jump-up","likely",@(),"18.3"),
  @("Box_Jump_Multiple_Response","Repeat box jumps","likely",@(),"18.3"),
  @("Linear_Depth_Jump","Depth jump","likely",@(),"18.3"),
  @("Plyo_Push-up","Plyometric push-up","exact",@("Chest"),"18.3"),
  @("Lateral_Bound","Ice skaters (skater jumps)","uncertain",@("Adductors","Glutes"),"18.3 side-to-side hops; the library name is generic"),
  @("Pushups","Push-up","exact",@("Chest"),"20.8"),
  @("Standing_Cable_Chest_Press","Standing cable chest press","exact",@("Chest"),"20.8"),
  @("Dumbbell_Bench_Press","Flat dumbbell chest press","likely",@("Chest"),"20.8"),
  @("Barbell_Bench_Press_-_Medium_Grip","Barbell bench press","likely",@("Chest"),"20.8; also breaks the naming rule (grip is a variant)"),
  @("Seated_Cable_Rows","Seated cable row","exact",@("Back"),"20.9"),
  @("Wide-Grip_Lat_Pulldown","Seated lat pulldown","likely",@("Back"),"20.9; the book does not specify grip — in front of the face"),
  @("External_Rotation_with_Band","Tubing external rotation","likely",@("Shoulders"),"20.10 infraspinatus and teres minor (rotator cuff → Shoulders)"),
  @("Internal_Rotation_with_Band","Tubing internal rotation","likely",@("Shoulders"),"20.10 subscapularis"),
  @("Dumbbell_Scaption","Single-leg dumbbell scaption","likely",@("Shoulders"),"20.10; the book version is single-leg (regress to two legs)"),
  @("Standing_Dumbbell_Press","Standing dumbbell shoulder press","likely",@("Shoulders"),"20.10"),
  @("Seated_Dumbbell_Press","Seated dumbbell shoulder press","likely",@("Shoulders"),"20.10"),
  @("Side_Lateral_Raise","Standing dumbbell lateral raise","likely",@("Shoulders"),"20.10 middle deltoid"),
  @("Dumbbell_Squat","Dumbbell squat","exact",@("Quads"),"20.13"),
  @("Leg_Press","Leg press","exact",@("Quads"),"20.13"),
  @("Barbell_Squat","Barbell squat","exact",@("Quads"),"20.13"),
  @("Barbell_Deadlift","Deadlift","likely",@("Hamstrings","Glutes","Back"),"20.13 (book groups it with legs; hinge muscles)"),
  @("Standing_Calf_Raises","Calf raise","likely",@("Calves"),"20.13"),
  @("Romanian_Deadlift","Romanian deadlift","exact",@("Hamstrings","Glutes","Back"),"21.3 hinge pattern"),
  @("Cable_Hip_Adduction","Hip adduction (cable)","likely",@("Adductors"),"7.5 adductors; the library tags it Quads — see validation")
)

$rows = @(); $flags = @()
foreach ($r in $map) {
  $id = $r[0]; $e = $byId[$id]
  if (-not $e) { $flags += [ordered]@{ id = $id; problem = "id not found in exercises.json" }; continue }
  $groups = @($r[3]); $libTags = @($e.m) + $e.x
  $check = if ($groups.Count -eq 0) { "not checkable" } elseif (@($groups | Where-Object { $libTags -contains $_ }).Count -gt 0) { "pass" } else { "FLAG" }
  $row = [ordered]@{ id = $id; current = $e.name; proposed = $r[1]; confidence = $r[2]; reason = $r[4];
    library = [ordered]@{ primary = $e.m; secondary = $e.x }; bookGroups = $groups; muscleCheck = $check;
    review = ($r[2] -ne "exact") }
  if ($e.name -match " - ") { $row.variantRule = "name carries a variant after ' - ' — move it to a variant field" }
  $rows += $row
  if ($check -eq "FLAG") { $flags += [ordered]@{ id = $id; problem = "book group(s) $($groups -join ', ') not in library tags $($libTags -join ', ')" } }
}

# The naming rule across the whole library: variants belong in a field, not the name.
$variantNames = @($lib.PSObject.Properties | Where-Object { $_.Name -match " - " } | ForEach-Object {
  $parts = $_.Name -split " - ", 2
  [ordered]@{ id = $_.Value.i; current = $_.Name; base = $parts[0]; variant = $parts[1] } })

# Library entries the book argues against — for the owner, not renames.
$cautions = @(
  [ordered]@{ id = "Standing_Toe_Touches"; source = "14.7"; note = "the straight-leg toe touch is a controversial stretch (disc stress; avoid with herniated discs or sciatic-type pain)" },
  [ordered]@{ id = "Wide-Grip_Pulldown_Behind_The_Neck"; source = "20.9"; note = "behind-the-neck pulldowns are not advised (shoulder and neck stress)" },
  [ordered]@{ id = "Lower_Back-SMR"; source = "14.4"; note = "the source says avoid rolling over the lumbar spine" },
  [ordered]@{ id = "Neck-SMR"; source = "14.4"; note = "the source says avoid rolling over the cervical spine" },
  [ordered]@{ id = "Hammer_Curls"; source = "7.3"; note = "hammer grip emphasises the brachioradialis — consider Forearms as a secondary" },
  [ordered]@{ id = "Hyperextensions_Back_Extensions"; source = "7.4"; note = "pattern is 'Elbow extension'; a back extension is hip and spine extension" })
foreach ($c in $cautions) { $c.found = [bool]$byId[$c.id] }

$out = [ordered]@{
  meta = [ordered]@{ generated = (Get-Date -Format "yyyy-MM-dd"); by = "tools/name-reconciliation.ps1"; librarySource = $Library; status = "PROPOSAL — nothing applied";
    library = $byId.Count; rows = $rows.Count; exact = @($rows | Where-Object { $_.confidence -eq "exact" }).Count;
    needReview = @($rows | Where-Object { $_.review }).Count; muscleFlags = @($flags | Where-Object { $_.problem -notmatch "not found" }).Count;
    variantNames = $variantNames.Count;
    rule = "anything below exact needs owner review; renames are a separate reviewed commit; never bundled" };
  rows = $rows; validation = $flags; namingRule = $variantNames; cautions = $cautions }
$json = $out | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText($OutFile, $json, (New-Object Text.UTF8Encoding $false))
"rows $($rows.Count), exact $($out.meta.exact), review $($out.meta.needReview), muscle flags $($out.meta.muscleFlags), variant names $($variantNames.Count)"
$flags | ForEach-Object { "FLAG: $($_.id) — $($_.problem)" }
