/* Bunyan — the instructional figure: body and equipment
   The figure, its muscles and its equipment are the app's own model
   (js/data/mannequin/): the rig and the sculpted body (rig.js) and the equipment kit
   (kit.js). This file only puts them together for the offline renderer. See rig.js for
   the pose fields and kit.js for the equipment. */
import {figure} from "../../js/data/mannequin/rig.js";
import {props} from "../../js/data/mannequin/kit.js";
export {B, frame, ik, joints, figure, MUSCLE_TAGS, highlight} from "../../js/data/mannequin/rig.js";
export {PROPS, props} from "../../js/data/mannequin/kit.js";

/* A pose and its equipment (pose.props) as solids. */
export function scene(pose,hl){const f=figure(pose,hl);return {prims:f.prims.concat(props(pose.props)),J:f.J};}
