// Reference data: lights, day shapes, code flags, sound signals.
// ================= DATA: lights, shapes, flags, sounds =================
// light: [colour, x, y]  colours w r g y Y(flashing yellow). x left/right, y up is negative
const LIGHTS=[
 {s:"Power vessel, head-on",n:"Power-driven vessel (under 50 m) pointing at you",L:[["w",0,-2.2],["g",-.7,0],["r",.7,0]],note:"Masthead light over BOTH sidelights: she's heading straight for you. Head-on — both turn to starboard."},
 {s:"Power vessel, crossing from your right",n:"Power vessel showing her port (red) side",L:[["w",-.4,-2.2],["r",.3,0]],note:"White masthead + red. Seen on your starboard bow, she's crossing from starboard: you give way."},
 {s:"Power vessel, showing her green side",n:"Power vessel showing her starboard (green) side",L:[["w",.4,-2.2],["g",-.3,0]],note:"White masthead + green. On your port bow she's crossing from port: she gives way, you stand on."},
 {s:"Power vessel over 50 m, beam on",n:"Power vessel 50 m or more, heading to your left",L:[["w",-1.3,-1.6],["w",1.1,-2.8],["r",-.6,0]],note:"Two masthead lights, the aft one higher. Their spread shows her heading; red = her port side faces you."},
 {s:"Any vessel seen from astern",n:"Sternlight only",L:[["w",0,0]],note:"A single white light low down that you're catching up: a sternlight. You're overtaking — keep clear."},
 {s:"Sailing vessel, head-on",n:"Sailing vessel underway, from ahead",L:[["g",-.6,0],["r",.6,0]],note:"Sidelights but NO masthead light = sailing vessel (or a small rowing boat). Power keeps clear of sail."},
 {s:"Sailing vessel (optional lights)",n:"Sailing vessel with optional all-round red over green",L:[["r",0,-3],["g",0,-2.2],["g",-.6,0],["r",.6,0]],note:"'Red over green, sailing machine.' Optional masthead lights on a sailing vessel."},
 {s:"Trawling",n:"Vessel engaged in trawling, making way",L:[["g",0,-2.6],["w",0,-1.7],["g",-.6,0],["r",.6,0]],note:"'Green over white, trawling tonight.' Keep clear of a fishing vessel."},
 {s:"Fishing (not trawling)",n:"Fishing with nets or lines, making way",L:[["r",0,-2.6],["w",0,-1.7],["g",-.6,0],["r",.6,0]],note:"'Red over white, fishing at night.' Gear may stretch a long way."},
 {s:"Not under command",n:"Not under command, making way",L:[["r",0,-2.6],["r",0,-1.7],["g",-.6,0],["r",.6,0]],note:"'Red over red, the captain is dead.' She can't manoeuvre — everyone keeps clear."},
 {s:"Restricted in ability to manoeuvre",n:"RAM vessel, making way",L:[["r",0,-3.3],["w",0,-2.5],["r",0,-1.7],["w",.9,-2.9],["g",-.6,0],["r",.6,0]],note:"Red–white–red vertical: dredging, cable laying, etc. Keep clear."},
 {s:"Constrained by her draught",n:"Vessel constrained by draught",L:[["r",0,-3.3],["r",0,-2.5],["r",0,-1.7],["w",.9,-2.9],["g",-.6,0],["r",.6,0]],note:"Three reds vertical. Don't impede her — she's stuck in the deep channel."},
 {s:"At anchor (under 50 m)",n:"Vessel at anchor, under 50 m",L:[["w",0,-1.2]],note:"One all-round white light where best seen."},
 {s:"At anchor (50 m or more)",n:"Vessel at anchor, 50 m or more",L:[["w",-1.2,-2.4],["w",1.2,-1.2]],note:"Two all-round whites: forward one HIGHER than the aft one."},
 {s:"Aground",n:"Vessel aground",L:[["r",0,-2.6],["r",0,-1.7],["w",-1.3,-3],["w",1.3,-1.2]],note:"Anchor lights + two all-round reds. Stay well away — shallow water!"},
 {s:"Pilot vessel on duty",n:"Pilot vessel on duty, underway",L:[["w",0,-2.6],["r",0,-1.7],["g",-.6,0],["r",.6,0]],note:"'White over red, pilot ahead.'"},
 {s:"Towing, seen from astern",n:"Power vessel towing, seen from astern",L:[["Y",0,-1],["w",0,0]],note:"Yellow towing light above the sternlight. Never pass between a tug and her tow."},
 {s:"Towing, seen from ahead",n:"Power vessel towing (tow under 200 m), from ahead",L:[["w",0,-2.8],["w",0,-1.9],["g",-.6,0],["r",.6,0]],note:"Two masthead lights in a vertical line (three if the tow is over 200 m)."},
 {s:"Mine clearance vessel",n:"Vessel engaged in mine clearance",L:[["g",0,-3.2],["g",-1,-2.3],["g",1,-2.3],["w",0,-1.6],["g",-.6,0],["r",.6,0]],note:"Three greens in a triangle: dangerous to come within 1000 m."},
 {s:"Hovercraft",n:"Air-cushion vessel in non-displacement mode",L:[["y",0,-3],["w",0,-2.1],["g",-.6,0],["r",.6,0]],note:"An all-round flashing yellow light on top of normal power-vessel lights."}
];
const SHAPES=[
 {s:"At anchor",k:["ball"],note:"One black ball in the fore part of the vessel."},
 {s:"Not under command",k:["ball","ball"],note:"Two balls in a vertical line."},
 {s:"Restricted in ability to manoeuvre",k:["ball","diamond","ball"],note:"Ball – diamond – ball."},
 {s:"Constrained by her draught",k:["cyl"],note:"A black cylinder."},
 {s:"Motor-sailing",k:["coneD"],note:"A cone, point down: sailing vessel using her engine — she counts as power-driven."},
 {s:"Engaged in fishing",k:["coneD","coneU"],note:"Two cones, points together."},
 {s:"Aground",k:["ball","ball","ball"],note:"Three balls in a vertical line."},
 {s:"Towing (tow over 200 m)",k:["diamond"],note:"A diamond, where best seen (on both tug and tow)."}
];
const FLAGS=[
 ["A","Alfa","Diver down — keep well clear at slow speed"],
 ["B","Bravo","Carrying or handling dangerous goods"],
 ["C","Charlie","Yes (affirmative)"],
 ["D","Delta","Keep clear — I'm manoeuvring with difficulty"],
 ["E","Echo","I'm altering course to starboard"],
 ["F","Foxtrot","I'm disabled — communicate with me"],
 ["G","Golf","I require a pilot"],
 ["H","Hotel","I have a pilot on board"],
 ["I","India","I'm altering course to port"],
 ["J","Juliett","On fire with dangerous cargo — keep well clear"],
 ["K","Kilo","I wish to communicate with you"],
 ["L","Lima","Stop your vessel instantly"],
 ["M","Mike","My vessel is stopped, making no way"],
 ["N","November","No (negative)"],
 ["O","Oscar","Man overboard"],
 ["P","Papa","In harbour: all aboard, about to sail"],
 ["Q","Quebec","Vessel is healthy — request free pratique"],
 ["R","Romeo","No single-flag meaning"],
 ["S","Sierra","I'm operating astern propulsion"],
 ["T","Tango","Keep clear — I'm pair trawling"],
 ["U","Uniform","You are running into danger"],
 ["V","Victor","I require assistance"],
 ["W","Whiskey","I require medical assistance"],
 ["X","X-ray","Stop your intentions and watch for my signals"],
 ["Y","Yankee","I am dragging my anchor"],
 ["Z","Zulu","I require a tug"]
];
// S short, L prolonged, b bell stroke, B rapid bell
const SOUNDS=[
 {p:"S",g:"sight",m:"I am altering my course to starboard"},
 {p:"SS",g:"sight",m:"I am altering my course to port"},
 {p:"SSS",g:"sight",m:"I am operating astern propulsion"},
 {p:"SSSSS",g:"sight",m:"I doubt you're taking enough action to avoid collision"},
 {p:"LLS",g:"sight",m:"I intend to overtake on your starboard side (narrow channel)"},
 {p:"LLSS",g:"sight",m:"I intend to overtake on your port side (narrow channel)"},
 {p:"LSLS",g:"sight",m:"I agree to be overtaken (narrow channel)"},
 {p:"L",g:"sight",m:"Approaching a bend where vessels may be hidden"},
 {p:"L",g:"fog",m:"Power-driven vessel making way through the water"},
 {p:"LL",g:"fog",m:"Power-driven vessel underway but stopped"},
 {p:"LSS",g:"fog",m:"Sailing, fishing, NUC, RAM, CBD or towing vessel"},
 {p:"LSSS",g:"fog",m:"Vessel being towed (last vessel, if manned)"},
 {p:"B",g:"fog",m:"Vessel at anchor (rapid bell for ~5 s, every minute)"},
 {p:"bbbBbbb",g:"fog",m:"Vessel aground"},
 {p:"SLS",g:"fog",m:"Vessel at anchor warning you of her position"},
 {p:"SSSS",g:"fog",m:"Pilot vessel's identity signal"}
];
const GROUP_LABEL={sight:"In sight of each other",fog:"In restricted visibility"};
function patHTML(p){
  if(p==='B')return '🔔 rapid bell';
  if(p==='bbbBbbb')return '🔔🔔🔔 · rapid · 🔔🔔🔔';
  return p.split('').map(c=>c==='S'?'•':'▬').join(' ');
}
