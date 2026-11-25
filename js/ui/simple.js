/* Bunyan — Simple mode (owner, 25 Nov: "no automation at all … a simple logging app").
   One switch, per profile (S.prefs.simple), in Profile → Settings. On, the app keeps
   what you log and drops what it works out or suggests on its own: Coach and its
   floating button, Progress, the Today card's advice and notes, the reminders, the
   moving background and the page photographs. Nothing is deleted: off again, all of it
   is back as it was. */
import {S} from "../state.js";
function simple(){return !!(S.prefs&&S.prefs.simple);}
export {simple};
