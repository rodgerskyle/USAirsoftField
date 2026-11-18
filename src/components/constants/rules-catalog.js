// USAW's published rules, revision January 1, 2020. Full descriptions retain
// the original wording. The same catalog ships with the website and Field Companion.
export const RULE_SECTIONS = [
  { id: "facility", title: "Facility rules" },
  { id: "personal-safety", title: "Personal safety equipment requirements" },
  { id: "equipment", title: "Equipment" },
  { id: "safety-meeting", title: "Safety meeting brief" },
  { id: "officials", title: "US Airsoft World officials" },
  { id: "play-days", title: "Arena play days" },
  { id: "membership", title: "Membership, points and ranking" }
];

function item(text, items) {
  return items ? { text, items } : { text };
}

function rule(sectionId, slug, title, body, teams = []) {
  return { id: sectionId + '-' + slug, sectionId, title, body, teams };
}

// The first six cards are the initial safety and team guide. Each later card
// follows its published section order. The original repeats the identical face
// protection rule at facility items 2 and 8; this catalog displays it once.
export const RULE_CARDS = [
  rule("personal-safety", "keep-approved-eyewear-on-throughout-play", "Keep approved eyewear on throughout play", [
    item("Approved eyewear must be worn at all times in the arena play area. “Goggle on Area” If you take your eyewear off in the arena play area “Goggle on Area” you will be asked to sit out the next game and be required to wear a full face mask when you return to play. If you take your eyewear off a second time, you will be out for the day. Continued violations of this rule will result in the permanent loss of play at this arena.")
  ]),
  rule("facility", "clear-your-replica-before-leaving-the-arena", "Clear your replica before leaving the arena", [
    item("Safety –", [
      item("The removal of all magazines, clearing all airsoft guns, airsoft guns on safety and placing the barrel sock on the gun is required when leaving the arena area “Goggle on Area”.")
    ])
  ]),
  rule("facility", "call-your-hits", "Call your hits", [
    item("Proper Conduct –", [
      item("This is an honor game, be respectful, honest and CALL YOUR HITS, IF YOU ARE HIT CALL IT. Continued violations of this rule will result in being asked to leave.")
    ])
  ]),
  rule("facility", "identify-your-team-by-sleeve-or-tape", "Identify your team by sleeve or tape", [
    item("Teams –", [
      item("The determining factor as far as identifying the team is the outer shirt or jacket sleeves (Camo/Yellow tape or Solid/Blue tape). If you are on the Camo Team your outer shirt or Jacket sleeve shall be one of the Camo colors and or patterns representing the Camo Team, or Yellow tape. If you are on the Solid Team then your outer shirt or jacket sleeve shall be one of the solid colors representing that team or Blue tape.  (see personal safety equipment section for pattern type and colors)")
    ])
  ], ["camo","solid"]),
  rule("facility", "attend-the-field-safety-briefing", "Attend the field safety briefing", [
    item("Arena Safety –", [
      item("All players must attend and participate in the safety briefing prior to play, conducted by the US Airsoft World referee.")
    ])
  ]),
  rule("equipment", "underhand-grenade-tosses", "Underhand grenade tosses", [
    item("Grenades are approved but are restricted to the following:", [
      item("Underhand toss method only for deployment. No overhand throws allowed.")
    ])
  ]),
  rule("facility", "sign-the-field-waiver", "Sign the field waiver", [
    item("Release of Liability -", [
      item("The US Airsoft World, Inc. Form - Release of Liability, waiver of Claims, Express Assumption of Risk and Indemnity Agreement, must be signed prior to play.")
    ])
  ]),
  rule("facility", "wear-face-protection-in-the-arena", "Wear face protection in the arena", [
    item("Protection –", [
      item("Face protection must be worn at all times in the arena play area “Goggle on Area”. (see personal safety equipment requirements section)")
    ])
  ]),
  rule("facility", "keep-eye-protection-on-and-call-for-help-if-you-cannot-see", "Keep eye protection on and call for help if you cannot see", [
    item("Safety Gear –", [
      item("Approved safety gear is encouraged in the arena play area “Goggle on Area”. (see personal safety equipment requirement section) DO NOT REMOVE your EYE PROTECTION while in the arena “Goggle on Area” In no circumstance shall eye protection be removed. If your vision is impaired due to fogging or for some other reason, call “BLIND MAN” immediately and wait for assistance from the US Airsoft official.")
    ])
  ]),
  rule("facility", "bring-replicas-into-the-facility-in-a-case", "Bring replicas into the facility in a case", [
    item("Safety –", [
      item("Prior to arrival at US Airsoft World, all airsoft guns and devices must be carried into the facility in ether a soft or hard gun type case/box/bag, and magazines out.")
    ])
  ]),
  rule("facility", "team-dress-and-identification", "Team dress and identification", [
    item("Teams –", [
      item("Military type dress is encouraged, and each team is represented by either Camo or Solid. (see personal safety equipment section for pattern type and colors)")
    ])
  ], ["camo","solid"]),
  rule("facility", "choose-your-team-at-registration", "Choose your team at registration", [
    item("Teams –", [
      item("Players will pick a team during registration, either online the day before or at the registration HQ the morning of the game.")
    ])
  ], ["camo","solid"]),
  rule("facility", "team-assignments-and-sleeve-colors", "Team assignments and sleeve colors", [
    item("Teams –", [
      item("A player may be placed on a team at registration based on how many people are signed up for a particular team. After a team has been determined for the player, the player must wear the corresponding color of their team represented by the outer shirt or jacket sleeve (Camo/Yellow, or Sold/Blue) while playing.")
    ])
  ], ["camo","solid"]),
  rule("facility", "pants-helmets-and-vests", "Pants, helmets and vests", [
    item("Teams –", [
      item("Pants, helmet and vest can be any color or pattern, as long as the outer shirt or jacket sleeve is correct for the team, although it is encouraged to have your colors and patterns all the same for most of these items.")
    ])
  ], ["camo","solid"]),
  rule("facility", "camo-team-identification", "Camo team identification", [
    item("Teams –", [
      item("Camo - Special Ops Team = Camo Sleeve/ or yellow tape")
    ])
  ], ["camo"]),
  rule("facility", "solid-team-identification", "Solid team identification", [
    item("Teams –", [
      item("Solid - Tactical Team = Solid Color Sleeve/ or blue tape")
    ])
  ], ["solid"]),
  rule("facility", "head-shots", "Head shots", [
    item("Rules of Engagement –", [
      item("Head shots are highly discouraged, aim for full body mass.")
    ])
  ]),
  rule("facility", "lights-and-roofs", "Lights and roofs", [
    item("Rules of Engagement –", [
      item("No shooting into the air at the lights and at the roof of the buildings.")
    ])
  ]),
  rule("facility", "blind-fire", "Blind fire", [
    item("Rules of Engagement –", [
      item("No firing blind, fire only when you have a sight on target.")
    ])
  ]),
  rule("facility", "keep-the-target-in-sight", "Keep the target in sight", [
    item("Rules of Engagement –", [
      item("No leading your shots, target must be in sight.")
    ])
  ]),
  rule("facility", "laser-safety", "Laser safety", [
    item("Rules of Engagement –", [
      item("No shinning lasers at another players face.")
    ])
  ]),
  rule("facility", "safe-kills", "Safe kills", [
    item("Rules of Engagement –", [
      item("Safe kill – Is when you come up on the blind side of another player of the opposing team, at 10’ distance to the players blind side you must call a “safe kill”. It would count as if you had shot them with your airsoft gun.")
    ])
  ]),
  rule("facility", "calling-a-hit-and-respawning", "Calling a hit and respawning", [
    item("Rules of Engagement –", [
      item("When shot by a BB / you are wounded, players must raise their hands in the air or raise the red wounded flag. Wounded players cannot talk or instruct others. They cannot participate until they respawn through the designated respawn point. To get back into the game, the wounded player must get to the team respawn “Medic Red Cross” point and touch to be healed. Some games require a medic’s. The type of game will be specified prior to play.")
    ])
  ]),
  rule("facility", "indoor-and-close-quarters-limits", "Indoor and close-quarters limits", [
    item("Minimum engagement distance –", [
      item("Close quarters – no greater than 360 (fps) indoors zero engagement. Guns over 360 (fps) shall be red tagged on the barrel, indicating a hot gun. HPA guns or Polar air style maximum (fps) shall be 320.")
    ])
  ]),
  rule("facility", "outdoor-engagement-limits", "Outdoor engagement limits", [
    item("Minimum engagement distance –", [
      item("Battle corridors, open areas and outside – no greater than 400 (fps) and greater than 20 feet.")
    ])
  ]),
  rule("facility", "minimum-player-age", "Minimum player age", [
    item("Ages –", [
      item("Players must be 8 years of age to play.")
    ])
  ]),
  rule("facility", "parent-or-guardian-waiver", "Parent or guardian waiver", [
    item("Ages –", [
      item("Players under the age of 18 must have the release of liability form signed by a parent or guardian.")
    ])
  ]),
  rule("facility", "full-face-protection-for-minors", "Full-face protection for minors", [
    item("Ages –", [
      item("Players under the age of 18 must wear a paint ball type full face mask. (see personal safety equipment requirement section)")
    ])
  ]),
  rule("facility", "referee-authority-on-safety", "Referee authority on safety", [
    item("Arena Safety –", [
      item("US Airsoft World referee shall have the final say on all issues pertaining to safety.")
    ])
  ]),
  rule("facility", "referee-patrols-in-the-arena", "Referee patrols in the arena", [
    item("Arena Safety –", [
      item("The arena play area “Goggles on Area” at US Airsoft World will have referees on patrol. Additionally, they will be roaming the area enforcing all the safety rules, regulations and procedures. All will be overseen by the US Airsoft World – Officer of the Day. Additional US Airsoft referee’s, shall be placed as needed.")
    ])
  ]),
  rule("facility", "arena-entrance-checks", "Arena entrance checks", [
    item("Arena Safety –", [
      item("Entrance to the arena play area “Goggle on Area” will be monitored by the referees to maintain strict control over the arena play area.")
    ])
  ]),
  rule("facility", "honor-system-and-gun-hits", "Honor system and gun hits", [
    item("Proper Conduct –", [
      item("This is a sport of integrity and honor, call your shots, gun hits count.")
    ])
  ]),
  rule("facility", "respect-players-and-staff", "Respect players and staff", [
    item("Proper Conduct –", [
      item("Respect shall be shown to all players and US Airsoft officials.")
    ])
  ]),
  rule("facility", "language-on-the-field", "Language on the field", [
    item("Proper Conduct –", [
      item("Foul language is strictly forbidden.")
    ])
  ]),
  rule("facility", "family-friendly-conduct", "Family-friendly conduct", [
    item("Proper Conduct –", [
      item("This is a family facility and it is expected that everyone acts appropriately.")
    ])
  ]),
  rule("facility", "sportsmanship-and-recognition", "Sportsmanship and recognition", [
    item("Proper Conduct –", [
      item("Good sportsmanship is encouraged and even rewarded, winning or losing is not as important as how you play the game. Battle badges may be given for good behavior and good sportsmanship.")
    ])
  ]),
  rule("facility", "rude-or-inappropriate-behavior", "Rude or inappropriate behavior", [
    item("Proper Conduct –", [
      item("Rude or inappropriate behavior will not be permitted.")
    ])
  ]),
  rule("facility", "physical-contact", "Physical contact", [
    item("Proper Conduct –", [
      item("No physical contact with other players of any kind.")
    ])
  ]),
  rule("facility", "referee-decisions", "Referee decisions", [
    item("Proper Conduct –", [
      item("Respect and follow the rules and regulations at US Airsoft World. Right or wrong, the referee decision is final. No arguments with the referee.")
    ])
  ]),
  rule("facility", "report-a-safety-or-rules-violation", "Report a safety or rules violation", [
    item("Proper Conduct –", [
      item("Any players witnessing a rule and or safety violation will immediately report the violation to the nearest US Airsoft World Official. The US Airsoft Official will interview all parties and make a determination that is final.")
    ])
  ]),
  rule("facility", "consequences-of-rule-violations", "Consequences of rule violations", [
    item("Proper Conduct –", [
      item("Violations of any of the rules, safety policies and procedures shall not be tolerated. Players who violate these rules, policies and procedures shall be asked to leave the facility immediately.")
    ])
  ]),
  rule("personal-safety", "player-equipment-checks", "Player equipment checks", [
    item("US Airsoft World referee’s will conduct equipment check from time to time to make sure all players meet or exceed the safety requirements at US Airsoft World, as described below.")
  ]),
  rule("personal-safety", "approved-eye-protection", "Approved eye protection", [
    item("Approved eye protection (All must meet or exceed ASTM standards):", [
      item("Safety glasses with fully sealed foam around eyes. (Regular reading glasses are not allowed)."),
      item("Full face paintball approved type mask with foam fit fully sealed. (Required for ages under 18 years old.)"),
      item("Goggles with foam fit to face, strap and fully sealed. (Mesh screen type eye viewing are not allowed.)")
    ])
  ]),
  rule("personal-safety", "face-ear-and-neck-coverage", "Face, ear and neck coverage", [
    item("It is encouraged to wear face, ear, neck, gloves and headwear protection in the arena play area “Goggle on Area”. The entire face, ears, and neck should be covered.")
  ]),
  rule("personal-safety", "face-coverings-and-mouth-protection", "Face coverings and mouth protection", [
    item("Encouraged face, ear and neck protection:", [
      item("Full face paintball approved type mask with foam fit. (Required for ages under 18 years old)"),
      item("Balaclava or bandana soft covers."),
      item("Neoprene face cover."),
      item("Full fit cotton or plastic mask."),
      item("It is recommended that players not using a full face mask use a mouth guard in conjunction with the required face protection listed above.")
    ])
  ]),
  rule("personal-safety", "protective-gloves", "Protective gloves", [
    item("Gloves –", [
      item("Any protective type glove that fits properly. Leather, cotton, canvas, working and sport type gloves.")
    ])
  ]),
  rule("personal-safety", "protective-headwear", "Protective headwear", [
    item("Headwear Protection –", [
      item("Fiberglass or plastic army replica type headgear. (Preferred)"),
      item("Ball cap."),
      item("Cotton soft cap."),
      item("Cloth scarf, balaclava or bandana.")
    ])
  ]),
  rule("personal-safety", "field-clothing-and-team-uniform-options", "Field clothing and team uniform options", [
    item("Military type dress, Long pants, (no shorts), longs sleeve shirts (no short sleeve).", [
      item("Camo type dress (Camo = “Special Ops” Team) or yellow tape on sleeve", [
        item("Multicam"),
        item("ACU"),
        item("Woodland"),
        item("Digital"),
        item("Disruptive")
      ]),
      item("Solid color type dress (Solid = “Tactical” Team) or blue tape on sleeve", [
        item("Olive Drab “Green”"),
        item("Coyote “Tan”"),
        item("Dark Navy “Dark Blue”"),
        item("Black"),
        item("Dark Earth “Brown”")
      ])
    ])
  ], ["camo","solid"]),
  rule("personal-safety", "permitted-footwear", "Permitted footwear", [
    item("Footwear –", [
      item("The preferred type of footwear would be the standard type army, work boot or something similar. (Preferred)"),
      item("Most forms of footwear are acceptable including athletic shoes. (The following are not acceptable and will not be allowed – Pumps, high heels, hard sole formal type shoes, moccasins, slippers and or sandals.)")
    ])
  ]),
  rule("personal-safety", "knee-and-elbow-pads", "Knee and elbow pads", [
    item("Pads –", [
      item("Protective knee and elbow pads are encouraged but are not mandatory."),
      item("Any military style or work type pads will work well.")
    ])
  ]),
  rule("equipment", "transport-cases-for-airsoft-replicas", "Transport cases for airsoft replicas", [
    item("All airsoft guns must be transferred and brought into the facility “US Airsoft World, Inc.” in the box it was purchased with, a soft or hard case.")
  ]),
  rule("equipment", "replica-safety-outside-the-arena", "Replica safety outside the arena", [
    item("All airsoft guns must have the selector switch on safe, gun empty of BBs, gun cleared, magazine removed, finger off the trigger, and barrel sock on when outside the arena play area.")
  ]),
  rule("equipment", "chronograph-inspection-and-approval-tag", "Chronograph inspection and approval tag", [
    item("All Airsoft guns will be inspected and must pass a chronograph test during registration using .20 gram BBs. The inspection and chronograph test will be conducted and carried out by the US Airsoft referee.  Maximum velocity at US Airsoft is 400 fps with .20 gram BBs. Any gun shooting over these standards must be de-tuned to meet this requirement before being allowed for use in the playing field. An approval color tag identified for that day of play (color of the day) will be affixed to the right side of the airsoft gun by the US Airsoft referee. The approval tag must remain on the gun for the entire day of play. Spot checks will be done throughout the day to ensure compliance.")
  ]),
  rule("equipment", "close-quarters-velocity-limits", "Close-quarters velocity limits", [
    item("Maximum Velocities:", [
      item("Close quarter within 25 feet up to 360 (fps)")
    ])
  ]),
  rule("equipment", "velocity-limits-beyond-20-feet", "Velocity limits beyond 20 feet", [
    item("Maximum Velocities:", [
      item("Greater than 20 feet up to 400 (fps)")
    ])
  ]),
  rule("equipment", "sniper-and-dmr-limits", "Sniper and DMR limits", [
    item("Maximum Velocities:", [
      item("Snipers (DMR or Bolt Action) – up to 500 (fps) with no shots closer than 100 feet, and only single round shots allowed for airsoft sniper rifles, bolt type. (No Auto)")
    ])
  ]),
  rule("equipment", "squad-automatic-replica-limits", "Squad automatic replica limits", [
    item("Maximum Velocities:", [
      item("Squad Automatic Gun – (SMG) 360 (fps) Greater than 20 feet engagement.")
    ])
  ]),
  rule("equipment", "hpa-velocity-limits", "HPA velocity limits", [
    item("Maximum Velocities:", [
      item("High Pressure Air / PolorStar Style – (HPA) 320 (fps) maximum.")
    ])
  ]),
  rule("equipment", "equipment-changes-after-inspection", "Equipment changes after inspection", [
    item("Tampering with airsoft guns after they have passed the chronograph test is forbidden, and will result in the player being asked to leave the facility. (Spot check will be made.)")
  ]),
  rule("equipment", "biodegradable-bbs-and-packaging", "Biodegradable BBs and packaging", [
    item("The US Airsoft World facility is environmentally friendly, all BBs must be biodegradable also known as Bio BBs. Players may bring their own BBs as long as they are biodegradable, and in marked bag or bottle to verify they are biodegradable. Verification of Bio BBs is required. US Airsoft World has biodegradable BBs for purchase for all players that need them.")
  ]),
  rule("equipment", "approved-bb-weights-and-materials", "Approved BB weights and materials", [
    item("Magazine and Ammunition Check - Maximum allowable BB weight is .20 grams, .25 grams, and up to .30 grams. No metal BBs. (All weights .20, .25, .30 must be Bio BBs.)")
  ]),
  rule("equipment", "squad-automatic-replica-approval", "Squad automatic replica approval", [
    item("One machine gun (SAW) is authorized per squad side (team). The US Airsoft Arena officer of the day will approve the SAW use. This is on a first come first serve basis. No SAW will be allowed onto the field without approval from the US Airsoft Arena Officer of the day. Full auto will only be allowed while the gun is deployed with a bipod.")
  ]),
  rule("equipment", "fire-modes-and-indoor-restrictions", "Fire modes and indoor restrictions", [
    item("The field is a semi auto fire field only. In some cases US Airsoft may play a full auto game, but only with a quick three round controlled blast pull. Airsoft guns shall not be used in full auto trigger held down. Only approved machine guns per squad as listed above will be allowed in the machine gun full auto. Players using the selector in auto must use small three round shots only. Single shot selector is preferred and required inside buildings.")
  ]),
  rule("equipment", "pistol-approval-and-holstering", "Pistol approval and holstering", [
    item("Pistols are approved to use as a secondary or even primary weapon, after they have been approved as above. Pistols are highly recommended for the intermediate and advanced players. Pistols must be holstered in the barracks.")
  ]),
  rule("equipment", "homemade-devices", "Homemade devices", [
    item("No homemade, non-industry produced airsoft devices are allowed.")
  ]),
  rule("equipment", "get-staff-approval-for-grenades", "Get staff approval for grenades", [
    item("Grenades are approved but are restricted to the following:", [
      item("Must be approved for use by US Airsoft prior to play.")
    ])
  ]),
  rule("equipment", "grenade-height-limit", "Grenade height limit", [
    item("Grenades are approved but are restricted to the following:", [
      item("May not be deployed over 3 ft. in height.")
    ])
  ]),
  rule("equipment", "call-out-before-using-a-grenade", "Call out before using a grenade", [
    item("Grenades are approved but are restricted to the following:", [
      item("A yell “FRAG OUT” shall be used before deploying.")
    ])
  ]),
  rule("equipment", "grenade-hits-in-a-room", "Grenade hits in a room", [
    item("Grenades are approved but are restricted to the following:", [
      item("If a frag lands in a room all players in the room are wounded automatically, and will require first aid “respawn to medical cross” to get back into the game.")
    ])
  ]),
  rule("equipment", "return-grenades-after-the-game", "Return grenades after the game", [
    item("Grenades are approved but are restricted to the following:", [
      item("Grenades are expensive and shall be returned to the owner after the game.")
    ])
  ]),
  rule("safety-meeting", "daily-safety-review", "Daily safety review", [
    item("Prior to each new day of play, the US Airsoft referee will review all the safety rules and regulations for play with players prior to entering the arena play area.")
  ]),
  rule("safety-meeting", "required-safety-meeting", "Required safety meeting", [
    item("All players are required to attend the safety meeting brief.")
  ]),
  rule("safety-meeting", "final-equipment-and-player-check", "Final equipment and player check", [
    item("The US Airsoft referee will do an additional once over of equipment and personal as a final safety check before final authorization to enter the arena play area and start the game.")
  ]),
  rule("safety-meeting", "equipment-checks-during-play", "Equipment checks during play", [
    item("Periodic check of equipment shall be done throughout the day.")
  ]),
  rule("safety-meeting", "velocity-spot-checks", "Velocity spot checks", [
    item("Spot checks of airsoft guns for (fps) acceptable limits shall be done throughout the day.")
  ]),
  rule("officials", "command-officer-responsibilities", "Command Officer responsibilities", [
    item("US Airsoft Command Officer is:", [
      item("The most senior office at US Airsoft and is the overall official in charge of the day."),
      item("Responsible for enforcing all the US Airsoft rules, regulation for game play."),
      item("Responsible for dealing with all customer issues, and or problems."),
      item("In charge of all US Airsoft employees on site."),
      item("The US Airsoft official in charge of overall safety and enforcement of the rules and regulations."),
      item("In charge of the site safety inspection, roving safety inspections and enforcement of all safety rules and regulations."),
      item("Final arbitrator of any rules conflict, player or field problems.")
    ])
  ]),
  rule("officials", "tactical-officer-responsibilities", "Tactical Officer responsibilities", [
    item("US Airsoft Tactical Officer is:", [
      item("The official in charge of the day’s games and type of games to play."),
      item("In charge of coordinating the games and events of the day."),
      item("In charge of scheduling the referees for the week, and the time required for the days play."),
      item("Responsible for enforcing the US Airsoft rules, and regulation."),
      item("The inspector of all players personal safety equipment and inspection of that equipment to meet the US Airsoft Requirements."),
      item("Responsible for enforcing the overall US Airsoft Safety Rules, Regulations.")
    ])
  ]),
  rule("officials", "referee-responsibilities", "Referee responsibilities", [
    item("US Airsoft Referee is:", [
      item("The US Airsoft referee is to help players understand the rules and play the game correctly. To help enforce all rules and regulations at US Airsoft. Constantly inspect to make sure all players have eye protection on in the “Goggle on Area” (ARENA) and enforcing proper game play and proper conduct throughout the game."),
      item("The US Airsoft referee is the official in charge of chronograph, and inspection of players airsoft equipment while choreographing."),
      item("US Airsoft referee’s will be assigned a designated area of operations and will enforce the rules and regulations of US Airsoft in the area."),
      item("The US Airsoft Referee will call hits, watch for players overshooting and call them out when needed. Referees are there to help ensure that the games run smooth, they are played fair and the players have a great time.")
    ])
  ]),
  rule("play-days", "open-play-days-and-eligibility", "Open play days and eligibility", [
    item("The arena is open Friday night(Summer), Saturday and Sunday to all players (Novice, Intermediate, and Professional) Ages 8 and up.")
  ]),
  rule("play-days", "summer-play-hours", "Summer play hours", [
    item("Gates open Saturday and Sunday at 8:00 am and close at 2:00 pm for our Summer hours(Games start at 9:00am sharp and end at 2:00pm Saturday and Sunday). For our Friday night games, gates open at 6pm and close at 11pm(Games start at 7:00pm sharp). Friday night games are only during Summer.")
  ]),
  rule("play-days", "winter-play-hours", "Winter play hours", [
    item("Gates open Saturday and Sunday at 9:00 am and close at 3:00 pm for our Winter hours(Games start at 10:00am sharp and end at 3:00pm Saturday and Sunday). For our Friday night games, we are closed during Winter.")
  ]),
  rule("play-days", "birthday-and-private-parties", "Birthday and private parties", [
    item("The birthday parties are welcome, a special birthday package can be purchased. Private parties can be arranged during weekdays.")
  ]),
  rule("membership", "membership-information", "Membership information", [
    item("See US Airsoft World Web Site (WWW.USAIRSOFT.COM)")
  ]),
  rule("membership", "rank-points-and-stat-tracking", "Rank, points and stat tracking", [
    item("Members have the ability to rank up and accumulate points with stat tracking.")
  ]),
  rule("membership", "member-leaderboard-listings", "Member leaderboard listings", [
    item("Members are listed on the leader board on the US Airsoft web site, and on the leader board in the barracks.")
  ]),
  rule("membership", "player-profiles-and-nicknames", "Player profiles and nicknames", [
    item("Members have their own profile on the US Airsoft web site, and at the barracks profile lookup. Members can manage their profile, picture, and nick name.")
  ]),
  rule("membership", "initial-membership-fee", "Initial membership fee", [
    item("The initial fee to become a member is $35.00")
  ]),
  rule("membership", "annual-membership-renewal", "Annual membership renewal", [
    item("There is a twenty dollar ($25.00) annual renewal fee for members.")
  ]),
  rule("membership", "member-game-pass-discount", "Member game pass discount", [
    item("Discounted game pass for members, member’s game pass is Twenty five dollar for all day, this is five dollars off the regular admission day game pass.")
  ]),
  rule("membership", "member-rental-discount", "Member rental discount", [
    item("Discount of five dollars off regular airsoft gun rental fee.")
  ]),
  rule("membership", "earned-game-day-passes", "Earned game day passes", [
    item("Free game day pass with each 450 points earned.")
  ]),
  rule("membership", "member-id-cards-and-replacements", "Member ID cards and replacements", [
    item("As a new member you are given the following at signup, over twenty dollars in value, US Airsoft team gear given at sign up:", [
      item("US Airsoft proprietary bio reader badge (ID card) with players picture and choice of background.", [
        item("Lost or damage replacement ID cards are $5.00 each.")
      ])
    ])
  ]),
  rule("membership", "team-shoulder-patches-and-replacements", "Team shoulder patches and replacements", [
    item("As a new member you are given the following at signup, over twenty dollars in value, US Airsoft team gear given at sign up:", [
      item("US Airsoft team Velcro shoulder patch (1) (Only available to team members)", [
        item("Lost or damaged replacement team Velcro patch $7.00 each.")
      ])
    ])
  ]),
  rule("membership", "lanyards-and-replacements", "Lanyards and replacements", [
    item("As a new member you are given the following at signup, over twenty dollars in value, US Airsoft team gear given at sign up:", [
      item("US Airsoft lanyard for badge. (1)", [
        item("Lost or damaged replacement lanyards $3.00 each.")
      ])
    ])
  ]),
  rule("membership", "wristbands-and-replacements", "Wristbands and replacements", [
    item("As a new member you are given the following at signup, over twenty dollars in value, US Airsoft team gear given at sign up:", [
      item("US Airsoft Lucky Wrist Band. (1)", [
        item("Lost or damaged replacement US Airsoft Lucky Wrist Band $6.00 each")
      ])
    ])
  ]),
  rule("membership", "rank-patch-exchanges-and-replacements", "Rank patch exchanges and replacements", [
    item("As a new member you are given the following at signup, over twenty dollars in value, US Airsoft team gear given at sign up:", [
      item("US Airsoft rank patch (private) (1)", [
        item("Members can turn this patch in as they rank up and receive a new rank patch free. Members must turn in the old patch to receive a new patch free. Members may keep the old patch and purchase a new patch for $6.00 each. Lost or damaged rank patch $6.00")
      ])
    ])
  ])
];
