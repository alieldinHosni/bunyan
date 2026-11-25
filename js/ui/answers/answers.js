/* Bunyan — the coach's answers (docs/COACH-AGENT.md C-2)
   Each a(…) works out one answer from the person's own log, plan and targets, with the
   same engines the rest of the app uses, and returns it as an answer object (kit.js);
   js/ui/views/chat.js routes a question to one of them and draws what comes back.
   Moved out of chat.js as they were: no answer's words or figures changed.
   Split by topic (road map step 4, 25 Nov), each part as it was: this module gathers
   them, so what imports the answers is unchanged. */
export {SWEET, aCrave, aEat, aLighter, aToday, aTrack, aWeights, liveLearned} from "./ans-core.js";
export {PHASE_LINE, PHASE_NAME_CHAT, aHealth, aLive, aMonth, aPhase, aWeek, aZones, inSpan, weekSpan} from "./ans-checkin.js";
export {AREAASK, FAQMINE, GOALWORD, aBalance, aCalories, aFaq, aGoal, aHello, aHelp, aInBody, aLast, aLoadLog, aMissed, aPlan, aPlateau, aProtein, aSore, aSteps, aStrong, aThanks, aTomorrow, aTwice, aUnknown, aWarmPlan, aWater, aWeight, faqSlots, macroTargetsFor, nearOf} from "./ans-training.js";
export {HOW, INGREDIENT, MEALWORD, NOSWAP, aFoodInfo, aRest, aSwap, arName, foodOf, itemName, keyWords, notSame, planItemNamed, planMeal, role, swapLine, swapsFor} from "./ans-food.js";
export {aElse, aK1RM, aKDur, aKFreq, aKReps, aKRest, aKSets, aKTempo, aKVolume, aKWarm, aScope, goalWord, lastNights, mode, range, secs, versus} from "./ans-know.js";
export {CTXKIND, aFacts, aLetGo, aLogFood, aLowDay, aReassess, aRemember, aSituation, aWeekFood, aWeekTrain, clashes, kcalOn, setsOf} from "./ans-report.js";
export {DAYSOK, OUTLINE, WDNAME, aAvoid, aAway, aClarify, aCorrection, aDay, aDays, aFit, aFoodDay, aOut, aRecord, aTechnique, aTired, aVolume, aWhy, cap1, dayName, isoWeekdayOf, lastBest, maxText, movementName, rdDate, rdEx, setText, setsFor, topOf, whyEntry} from "./ans-named.js";
