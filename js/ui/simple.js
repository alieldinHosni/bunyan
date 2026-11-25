/* Bunyan — Simple mode (owner, 25 Nov: "no automation at all … a simple logging app").
   One switch, per profile (S.prefs.simple), in Profile → Settings. On, the app keeps
   what you log and drops what it works out or suggests on its own: Coach and its
   floating button, Progress, the Today card's advice and notes, and the reminders.
   The rest timer stays (owner, 25 Nov).
   The look and the motion stay as they were (owner, 25 Nov). Nothing is deleted: off
   again, all of it is back as it was. */
import {S} from "../state.js";
function simple(){return !!(S.prefs&&S.prefs.simple);}
export {simple};
