/* Bunyan — the coach's routing (docs/COACH-AGENT.md C-2)
   A question in, an answer out: safety first, then the sentence read (js/coach/
   understand.js), a correction or follow-up said again, a command handed to the agent
   (js/ui/agent.js), else the answer it picks (answers.js), each kept in the
   conversation (S.chat). js/ui/views/chat.js draws what this returns.
   Moved out of chat.js as it was: no routing changed.
   Split by topic (road map step 4, 25 Nov), each part as it was: this module gathers
   them, so what imports it is unchanged. */
export {AREAS, FAQ_OVER, FAQ_STRONG, GENERIC, KEEP, MINE, MUSCLEWORD, OWNLOG, PAIN, QWORDS, QWORDS_AR, areaOf, checked, foodWords, inbodyReading, lifts, namedExercises, namedFood, ownQuestion, trainAround} from "./route-core.js";
export {ELSEWHERE, FOODSAID, GROUPOF, KITOF, READAS, SCOPE, WHYKIND, arw, readAs, scopeAnswer, scopeOf, told} from "./route-limits.js";
export {ACTALT, ACTL, KINDL, WHEN, WHENRE, cap, liveChips, nearAsk} from "./route-live.js";
export {ANSWER, ASKOK, ASKQ, CRAVE, DAY, DEEPER, DEFINE, DOWORK, ELSE, EXQ, FOLLOW, FOODFILL, FOODNO, FULL, GREET, HOWDO, KEEP_MS, LIGHTER, LOGCMD, MORE, NO, OFFSESS, ONTO, QSTART, SESSW, SMART_MS, SOFT, VERB, YES, askedOnly, dayWith, decide, fullName, inProgramNamed, isQuestion, knowFor, lastExchange, namedOther, plainRequest, preRoute, pruneChat, readCtx, readOf, route, verb0, withTold} from "./route-read.js";
export {CORR, JOIN, PREP, PRON, PRONVERB, SAME, lastExercise, rewrite, splitTwo, undoLast, withReferent} from "./route-follow.js";
export {FORCEL, MISSIDS, MUSCLEOF, REDO, WARM, ask, askIn, askOne, dayTold, findFood, findMsg, follow, isSafety, recapMsg, safetyReply, shownFood, shownLabel, warmCoach} from "./route-ask.js";
