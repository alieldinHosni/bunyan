/* Bunyan — which exercises have a checked 3D figure, by name (WP-9).
   The figure's data (moves.js, about 100 KB) and its drawing (js/ui/mannequin.js and the
   rest of js/data/mannequin/, about 250 KB with it) load only when a figure is on the
   screen. To know whether one should be, the pages ask this short list instead.
   It is exactly the names records.js isChecked passes: an approval in moves.js TABLE
   (by, on, version) whose version still matches the record. An engine test
   (data/test/approved) fails when the two disagree, so a new approval, or a record
   changed after its approval, is written here in the same pull request. */
var APPROVED={"Pullups":1,"Incline Dumbbell Press":1};
function approved(name){return !!name&&Object.prototype.hasOwnProperty.call(APPROVED,name);}
/* For the browser tests only, through records.js markCheckedForTest. Returns the undo. */
function markApprovedForTest(name){var had=approved(name);APPROVED[name]=1;return function(){if(!had)delete APPROVED[name];};}
export {APPROVED, approved, markApprovedForTest};
