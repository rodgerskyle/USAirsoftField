import React, { Component } from 'react';

import { Container, Row, Col, Tab, ListGroup } from 'react-bootstrap/';
import { Helmet } from 'react-helmet-async';

class Rules extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    render() {
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Rules</title>
                </Helmet>
                <h2 className="page-header">Game and Safety Rules</h2>
                <Container>
                    <Row className="row-update-rules"><p>Last Updated: 1/1/2020</p></Row>
                    <Tab.Container id="rules-list-group-tabs" defaultActiveKey="#link1">
                        <Row>
                            <Col sm={4}>
                            <ListGroup>
                                <ListGroup.Item action href="#link1">
                                Facility Rules
                                </ListGroup.Item>
                                <ListGroup.Item action href="#link2">
                                Personal Safety Equipment Requirements
                                </ListGroup.Item>
                                <ListGroup.Item action href="#link3">
                                Equipment
                                </ListGroup.Item>
                                <ListGroup.Item action href="#link4">
                                Safety Meeting Brief 
                                </ListGroup.Item>
                                <ListGroup.Item action href="#link5">
                                US Airsoft World, Inc. Officials
                                </ListGroup.Item>
                                <ListGroup.Item action href="#link6">
                                Arena Play Days
                                </ListGroup.Item>
                                <ListGroup.Item action href="#link7">
                                US Airsoft Membership, Points and Ranking
                                </ListGroup.Item>
                            </ListGroup>
                            </Col>
                            <Col sm={8}>
                            <Tab.Content>
                                <Tab.Pane eventKey="#link1">
                                    <FacilityRules />
                                </Tab.Pane>
                                <Tab.Pane eventKey="#link2">
                                    <PersonalSafety />
                                </Tab.Pane>
                                <Tab.Pane eventKey="#link3">
                                    <Equipment />
                                </Tab.Pane>
                                <Tab.Pane eventKey="#link4">
                                    <SafetyMeeting />
                                </Tab.Pane>
                                <Tab.Pane eventKey="#link5">
                                    <USAirsoftOfficials />
                                </Tab.Pane>
                                <Tab.Pane eventKey="#link6">
                                    <ArenaPlayDays />
                                </Tab.Pane>
                                <Tab.Pane eventKey="#link7">
                                    <MembershipPointsRanking />
                                </Tab.Pane>
                            </Tab.Content>
                            </Col>
                        </Row>
                        </Tab.Container>
                </Container>
            </div>
        );
    }
}

const FacilityRules = () => (
    <ol className="ol-rules">
        <li className="li-content-rules">
            Release of Liability -
            <ul>
                <li>
                    The US Airsoft World, Inc. Form - Release of Liability, waiver of Claims, Express Assumption of Risk and Indemnity Agreement, must be signed prior to play.
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Protection –
            <ul>
                <li>
                    Face protection must be worn at all times in the arena play area “Goggle on Area”. (see personal safety equipment requirements section)
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Safety Gear –
            <ul>
                <li>
                    Approved safety gear is encouraged in the arena play area “Goggle on Area”. (see personal safety equipment requirement section) 
                    DO NOT REMOVE your EYE PROTECTION while in the arena “Goggle on Area” In no circumstance shall eye protection be removed. 
                    If your vision is impaired due to fogging or for some other reason, call “BLIND MAN” immediately and wait for assistance from the US Airsoft official.
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Safety –
            <ul>
                <li>
                    Prior to arrival at US Airsoft World, all airsoft guns and devices must be carried into the facility in ether a soft or hard gun type case/box/bag, and magazines out.
                </li>
                <li>
                    The removal of all magazines, clearing all airsoft guns, airsoft guns on safety and placing the barrel sock on the gun is required when leaving the arena area “Goggle on Area”.
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Teams –
            <ul>
                <li>
                    Military type dress is encouraged, and each team is represented by either Camo or Solid. (see personal safety equipment section for pattern type and colors) 
                </li>
                <li>
                    Players will pick a team during registration, either online the day before or at the registration HQ the morning of the game. 
                </li>
                <li>
                    A player may be placed on a team at registration based on how many people are signed up for a particular team. After a team has been determined for the player, 
                    the player must wear the corresponding color of their team represented by the outer shirt or jacket sleeve (Camo/Yellow, or Sold/Blue) while playing. 
                </li>
                <li>
                    Pants, helmet and vest can be any color or pattern, as long as the outer shirt or jacket sleeve is correct for the team, although it is encouraged to have your 
                    colors and patterns all the same for most of these items.
                </li>
                <li>
                    The determining factor as far as identifying the team is the outer shirt or jacket sleeves (Camo/Yellow tape or Solid/Blue tape). If you are on the Camo Team your 
                    outer shirt or Jacket sleeve shall be one of the Camo colors and or patterns representing the Camo Team, or Yellow tape. If you are on the Solid Team then your outer 
                    shirt or jacket sleeve shall be one of the solid colors representing that team or Blue tape.  (see personal safety equipment section for pattern type and colors)
                </li>
                <li>
                    Camo - Special Ops Team = Camo Sleeve/ or yellow tape 
                </li>
                <li>
                    Solid - Tactical Team = Solid Color Sleeve/ or blue tape
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Rules of Engagement –
            <ul>
                <li>
                    Head shots are highly discouraged, aim for full body mass.
                </li>
                <li>
                    No shooting into the air at the lights and at the roof of the buildings.
                </li>
                <li>
                    No firing blind, fire only when you have a sight on target.
                </li>
                <li>
                    No leading your shots, target must be in sight.
                </li>
                <li>
                    No shinning lasers at another players face.
                </li>
                <li>
                    Safe kill – Is when you come up on the blind side of another player of the opposing team, 
                    at 10’ distance to the players blind side you must call a “safe kill”. It would count as if 
                    you had shot them with your airsoft gun. 
                </li>
                <li>
                    When shot by a BB / you are wounded, players must raise their hands in the air or raise the red 
                    wounded flag. Wounded players cannot talk or instruct others. They cannot participate until they 
                    respawn through the designated respawn point. To get back into the game, the wounded player must 
                    get to the team respawn “Medic Red Cross” point and touch to be healed. Some games require a medic’s.  
                    The type of game will be specified prior to play.
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Minimum engagement distance –
            <ul>
                <li>
                    Close quarters – no greater than 360 (fps) indoors zero engagement. Guns over 360 (fps) shall 
                    be red tagged on the barrel, indicating a hot gun. HPA guns or Polar air style maximum (fps) shall be 320. 
                </li>
                <li>
                    Battle corridors, open areas and outside – no greater than 400 (fps) and greater than 20 feet. 
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Protection –
            <ul>
                <li>
                    Face protection must be worn at all times in the arena play area “Goggle on Area”. (see personal safety equipment requirements section)
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Ages –
            <ul>
                <li>
                    Players must be 8 years of age to play.
                </li>
                <li>
                    Players under the age of 18 must have the release of liability form signed by a parent or guardian.
                </li>
                <li>
                    Players under the age of 18 must wear a paint ball type full face mask. (see personal safety equipment requirement section)
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Arena Safety –
            <ul>
                <li>
                    All players must attend and participate in the safety briefing prior to play, conducted by the US Airsoft World referee.
                </li>
                <li>
                    US Airsoft World referee shall have the final say on all issues pertaining to safety.
                </li>
                <li>
                    The arena play area “Goggles on Area” at US Airsoft World will have referees on patrol. Additionally, they will be roaming the area 
                    enforcing all the safety rules, regulations and procedures. All will be overseen by the US Airsoft World – Officer of the Day. Additional 
                    US Airsoft referee’s, shall be placed as needed.
                </li>
                <li>
                    Entrance to the arena play area “Goggle on Area” will be monitored by the referees to maintain strict control over the arena play area. 
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Proper Conduct –
            <ul>
                <li>
                    This is a sport of integrity and honor, call your shots, gun hits count.
                </li>
                <li>
                    Respect shall be shown to all players and US Airsoft officials. 
                </li>
                <li>
                    Foul language is strictly forbidden.
                </li>
                <li>
                    This is a family facility and it is expected that everyone acts appropriately.
                </li>
                <li>
                    Good sportsmanship is encouraged and even rewarded, winning or losing is not as 
                    important as how you play the game. Battle badges may be given for good behavior and good sportsmanship.
                </li>
                <li>
                    Rude or inappropriate behavior will not be permitted.
                </li>
                <li>
                    No physical contact with other players of any kind.
                </li>
                <li>
                    Respect and follow the rules and regulations at US Airsoft World. Right or wrong, 
                    the referee decision is final. No arguments with the referee.
                </li>
                <li>
                    This is an honor game, be respectful, honest and CALL YOUR HITS, IF YOU ARE HIT CALL IT.  
                    Continued violations of this rule will result in being asked to leave. 
                </li>
                <li>
                    Any players witnessing a rule and or safety violation will immediately report the violation 
                    to the nearest US Airsoft World Official. The US Airsoft Official will interview all parties 
                    and make a determination that is final. 
                </li>
                <li>
                    Violations of any of the rules, safety policies and procedures shall not be tolerated. 
                    Players who violate these rules, policies and procedures shall be asked to leave the facility immediately. 
                </li>
            </ul>
        </li>
    </ol>
);

const PersonalSafety = () => (
    <ol className="ol-rules">
        <li className="li-content-rules">
        US Airsoft World referee’s will conduct equipment check from time to time to make sure all players meet or exceed the safety 
        requirements at US Airsoft World, as described below. 
        </li>
        <li className="li-content-rules">
            Approved eyewear must be worn at all times in the arena play area. “Goggle on Area” If you take your eyewear off in the 
            arena play area “Goggle on Area” you will be asked to sit out the next game and be required to wear a full face mask when 
            you return to play. If you take your eyewear off a second time, you will be out for the day. Continued violations of this 
            rule will result in the permanent loss of play at this arena.
        </li>
        <li className="li-content-rules">
            Approved eye protection (All must meet or exceed ASTM standards):
            <ul>
                <li>
                    Safety glasses with fully sealed foam around eyes. (Regular reading glasses are not allowed).
                </li>
                <li>
                    Full face paintball approved type mask with foam fit fully sealed. (Required for ages under 18 years old.)
                </li>
                <li>
                    Goggles with foam fit to face, strap and fully sealed. (Mesh screen type eye viewing are not allowed.)
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            It is encouraged to wear face, ear, neck, gloves and headwear protection in the arena play area “Goggle on Area”. 
            The entire face, ears, and neck should be covered.
        </li>
        <li className="li-content-rules">
            Encouraged face, ear and neck protection:
            <ul>
                <li>
                    Full face paintball approved type mask with foam fit. (Required for ages under 18 years old)
                </li>
                <li>
                    Balaclava or bandana soft covers.
                </li>
                <li>
                    Neoprene face cover.
                </li>
                <li>
                    Full fit cotton or plastic mask.
                </li>
                <li>
                    It is recommended that players not using a full face mask use a mouth guard in conjunction with the required face protection listed above.
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Gloves –
            <ul>
                <li>
                    Any protective type glove that fits properly. Leather, cotton, canvas, working and sport type gloves.
                </li>
            </ul>
        </li>

        <li className="li-content-rules">
            Headwear Protection –
            <ul>
                <li>
                    Fiberglass or plastic army replica type headgear. (Preferred)
                </li>
                <li>
                    Ball cap.
                </li>
                <li>
                    Cotton soft cap. 
                </li>
                <li>
                    Cloth scarf, balaclava or bandana.
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Military type dress, Long pants, (no shorts), longs sleeve shirts (no short sleeve).
            <ul>
                <li>
                    Camo type dress (Camo = “Special Ops” Team) or yellow tape on sleeve
                    <ol>
                        <li>
                            Multicam
                        </li>
                        <li>
                            ACU
                        </li>
                        <li>
                            Woodland
                        </li>
                        <li>
                            Digital
                        </li>
                        <li>
                            Disruptive
                        </li>
                    </ol>
                </li>
                <li>
                    Solid color type dress (Solid = “Tactical” Team) or blue tape on sleeve
                    <ol>
                        <li>
                            Olive Drab “Green”
                        </li>
                        <li>
                            Coyote “Tan”
                        </li>
                        <li>
                            Dark Navy “Dark Blue”
                        </li>
                        <li>
                            Black
                        </li>
                        <li>
                            Dark Earth “Brown”
                        </li>
                    </ol>
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Footwear –
            <ul>
                <li>
                    The preferred type of footwear would be the standard type army, work boot or something similar. (Preferred)
                </li>
                <li>
                    Most forms of footwear are acceptable including athletic shoes. (The following are not acceptable and will 
                    not be allowed – Pumps, high heels, hard sole formal type shoes, moccasins, slippers and or sandals.)
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Pads –
            <ul>
                <li>
                    Protective knee and elbow pads are encouraged but are not mandatory.
                </li>
                <li>
                    Any military style or work type pads will work well.
                </li>
            </ul>
        </li>
    </ol>
)

const Equipment = () => (
    <ol className="ol-rules">
        <li className="li-content-rules">
            All airsoft guns must be transferred and brought into the facility “US Airsoft World, Inc.” in the box 
            it was purchased with, a soft or hard case. 
        </li>
        <li className="li-content-rules">
            All airsoft guns must have the selector switch on safe, gun empty of BBs, gun cleared, magazine removed, 
            finger off the trigger, and barrel sock on when outside the arena play area.
        </li>
        <li className="li-content-rules">
            All Airsoft guns will be inspected and must pass a chronograph test during registration using .20 gram BBs.
            The inspection and chronograph test will be conducted and carried out by the US Airsoft referee.  Maximum 
            velocity at US Airsoft is 400 fps with .20 gram BBs. Any gun shooting over these standards must be de-tuned 
            to meet this requirement before being allowed for use in the playing field. An approval color tag identified 
            for that day of play (color of the day) will be affixed to the right side of the airsoft gun by the US Airsoft referee. 
            The approval tag must remain on the gun for the entire day of play. Spot checks will be done throughout the day to ensure compliance. 
        </li>
        <li className="li-content-rules">
            Maximum Velocities:
            <ul>
                <li>
                    Close quarter within 25 feet up to 360 (fps)
                </li>
                <li>
                    Greater than 20 feet up to 400 (fps)
                </li>
                <li>
                    Snipers (DMR or Bolt Action) – up to 500 (fps) with no shots closer than 100 feet, and only single 
                    round shots allowed for airsoft sniper rifles, bolt type. (No Auto)
                </li>
                <li>
                    Squad Automatic Gun – (SMG) 360 (fps) Greater than 20 feet engagement. 
                </li>
                <li>
                    High Pressure Air / PolorStar Style – (HPA) 320 (fps) maximum.
                </li>
            </ul>
        </li>
        <li className="li-content-rules">
            Tampering with airsoft guns after they have passed the chronograph test is forbidden, and will result in the 
            player being asked to leave the facility. (Spot check will be made.)
        </li>
        <li className="li-content-rules">
            The US Airsoft World facility is environmentally friendly, all BBs must be biodegradable also known as Bio BBs. 
            Players may bring their own BBs as long as they are biodegradable, and in marked bag or bottle to verify they are 
            biodegradable. Verification of Bio BBs is required. US Airsoft World has biodegradable BBs for purchase for all 
            players that need them.
        </li>
        <li className="li-content-rules">
            Magazine and Ammunition Check - Maximum allowable BB weight is .20 grams, .25 grams, and up to .30 grams. 
            No metal BBs. (All weights .20, .25, .30 must be Bio BBs.)
        </li>
        <li className="li-content-rules">
            One machine gun (SAW) is authorized per squad side (team). The US Airsoft Arena officer of the day will approve the 
            SAW use. This is on a first come first serve basis. No SAW will be allowed onto the field without approval from the 
            US Airsoft Arena Officer of the day. Full auto will only be allowed while the gun is deployed with a bipod. 
        </li>
        <li className="li-content-rules">
            The field is a semi auto fire field only. In some cases US Airsoft may play a full auto game, but only with a quick three 
            round controlled blast pull. Airsoft guns shall not be used in full auto trigger held down. Only approved machine guns per 
            squad as listed above will be allowed in the machine gun full auto. Players using the selector in auto must use small three 
            round shots only. Single shot selector is preferred and required inside buildings. 
        </li>
        <li className="li-content-rules"> 
            Pistols are approved to use as a secondary or even primary weapon, after they have been approved as above. Pistols are highly 
            recommended for the intermediate and advanced players. Pistols must be holstered in the barracks. 
        </li>
        <li className="li-content-rules">
            No homemade, non-industry produced airsoft devices are allowed.
        </li>
        <li className="li-content-rules">
            Grenades are approved but are restricted to the following:
            <ul>
                <li>
                    Must be approved for use by US Airsoft prior to play.
                </li>
                <li>
                    May not be deployed over 3 ft. in height.
                </li>
                <li>
                    Underhand toss method only for deployment. No overhand throws allowed.
                </li>
                <li>
                    A yell “FRAG OUT” shall be used before deploying.
                </li>
                <li>
                    If a frag lands in a room all players in the room are wounded automatically, and will require first aid “respawn to medical cross” to get back into the game. 
                </li>
                <li>
                    Grenades are expensive and shall be returned to the owner after the game.
                </li>
            </ul>
        </li>
    </ol>
)

const SafetyMeeting = () => (
    <ol className="ol-rules">

        <li className="li-content-rules">
            Prior to each new day of play, the US Airsoft referee will review all the safety rules and regulations for play with players prior to entering the arena play area.
        </li>

        <li className="li-content-rules">
            All players are required to attend the safety meeting brief.
        </li>

        <li className="li-content-rules">
            The US Airsoft referee will do an additional once over of equipment and personal as a final safety check before final authorization to enter the arena play area and start the game.
        </li>

        <li className="li-content-rules">
            Periodic check of equipment shall be done throughout the day.
        </li>

        <li className="li-content-rules">
            Spot checks of airsoft guns for (fps) acceptable limits shall be done throughout the day. 
        </li>
    </ol>
)

const USAirsoftOfficials = () => (
    <ol className="ol-rules">
        <li className="li-content-rules">
            US Airsoft Command Officer is:
            <ul>
                <li>
                    The most senior office at US Airsoft and is the overall official in charge of the day.  
                </li>
                <li>
                    Responsible for enforcing all the US Airsoft rules, regulation for game play.
                </li>
                <li>
                    Responsible for dealing with all customer issues, and or problems.
                </li>
                <li>
                    In charge of all US Airsoft employees on site. 
                </li>
                <li>
                    The US Airsoft official in charge of overall safety and enforcement of the rules and regulations.
                </li>
                <li>
                    In charge of the site safety inspection, roving safety inspections and enforcement of all safety rules and regulations.
                </li>
                <li>
                    Final arbitrator of any rules conflict, player or field problems.
                </li>
            </ul>
        </li>

        <li className="li-content-rules">
            US Airsoft Tactical Officer is:
            <ul>
                <li>
                    The official in charge of the day’s games and type of games to play. 
                </li>
                <li>
                    In charge of coordinating the games and events of the day.
                </li>
                <li>
                    In charge of scheduling the referees for the week, and the time required for the days play.
                </li>
                <li>
                    Responsible for enforcing the US Airsoft rules, and regulation.
                </li>
                <li>
                    The inspector of all players personal safety equipment and inspection of that equipment to meet the US Airsoft Requirements. 
                </li>
                <li>
                    Responsible for enforcing the overall US Airsoft Safety Rules, Regulations.
                </li>
            </ul>
        </li>

        <li className="li-content-rules">
            US Airsoft Referee is:
            <ul>
                <li>
                    The US Airsoft referee is to help players understand the rules and play the game correctly. To help enforce all 
                    rules and regulations at US Airsoft. Constantly inspect to make sure all players have eye protection on in the 
                    “Goggle on Area” (ARENA) and enforcing proper game play and proper conduct throughout the game.
                </li>
                <li>
                    The US Airsoft referee is the official in charge of chronograph, and inspection of players airsoft equipment 
                    while choreographing.
                </li>
                <li>
                    US Airsoft referee’s will be assigned a designated area of operations and will enforce the rules and regulations
                     of US Airsoft in the area. 
                </li>
                <li>
                    The US Airsoft Referee will call hits, watch for players overshooting and call them out when needed. Referees are 
                    there to help ensure that the games run smooth, they are played fair and the players have a great time. 
                </li>

            </ul>
        </li>
    </ol>
)

const ArenaPlayDays = () => (
    <ol className="ol-rules">
        <li className="li-content-rules">
            The arena is open Friday night(Summer), Saturday and Sunday to all players (Novice, Intermediate, and Professional) Ages 8 and up. 
        </li>
        <li className="li-content-rules">
            Gates open Saturday and Sunday at 8:00 am and close at 2:00 pm for our Summer hours(Games start at 9:00am sharp and end at 2:00pm Saturday and Sunday).
            For our Friday night games, gates open at 6pm and close at 11pm(Games start at 7:00pm sharp). Friday night games are only during Summer.
        </li>
        <li className="li-content-rules">
            Gates open Saturday and Sunday at 9:00 am and close at 3:00 pm for our Winter hours(Games start at 10:00am sharp and end at 3:00pm Saturday and Sunday).
            For our Friday night games, we are closed during Winter.
        </li>
        <li className="li-content-rules">
            The birthday parties are welcome, a special birthday package can be purchased. Private parties can be arranged during weekdays. 
        </li>
    </ol>
)

const MembershipPointsRanking = () => (
    <ol className="ol-rules">
        <li className="li-content-rules">
            See US Airsoft World Web Site (WWW.USAIRSOFT.COM)
        </li>
        <li className="li-content-rules">
            Members have the ability to rank up and accumulate points with stat tracking.
        </li>
        <li className="li-content-rules">
            Members are listed on the leader board on the US Airsoft web site, and on the leader board in the barracks.
        </li>
        <li className="li-content-rules">
            Members have their own profile on the US Airsoft web site, and at the barracks profile lookup. Members can manage their profile, picture, and nick name.
        </li>
        <li className="li-content-rules">
            The initial fee to become a member is $35.00
        </li>
        <li className="li-content-rules">
            There is a twenty dollar ($25.00) annual renewal fee for members.
        </li>
        <li className="li-content-rules">
            Discounted game pass for members, member’s game pass is Twenty five dollar for all day, this is five dollars off the regular admission day game pass.
        </li>
        <li className="li-content-rules">
            Discount of five dollars off regular airsoft gun rental fee.
        </li>
        <li className="li-content-rules">
            Free game day pass with each 450 points earned.
        </li>
        <li className="li-content-rules">
            As a new member you are given the following at signup, over twenty dollars in value,
            US Airsoft team gear given at sign up: 
            <ul>
                <li>
                    US Airsoft proprietary bio reader badge (ID card) with players picture and choice of background.
                    <ol>
                        <li>
                            Lost or damage replacement ID cards are $5.00 each.
                        </li>
                    </ol>
                </li>
                <li>
                    US Airsoft team Velcro shoulder patch (1) (Only available to team members)
                    <ol>
                        <li>
                            Lost or damaged replacement team Velcro patch $7.00 each.
                        </li>
                    </ol>
                </li>
                <li>
                    US Airsoft lanyard for badge. (1)
                    <ol>
                        <li>
                            Lost or damaged replacement lanyards $3.00 each.
                        </li>
                    </ol>
                </li>
                <li>
                    US Airsoft Lucky Wrist Band. (1)
                    <ol>
                        <li>
                            Lost or damaged replacement US Airsoft Lucky Wrist Band $6.00 each
                        </li>
                    </ol>
                </li>
                <li>
                    US Airsoft rank patch (private) (1)
                    <ol>
                        <li>
                            Members can turn this patch in as they rank up and receive a new rank patch 
                            free. Members must turn in the old patch to receive a new patch free. Members 
                            may keep the old patch and purchase a new patch for $6.00 each. Lost or damaged 
                            rank patch $6.00
                        </li>
                    </ol>
                </li>
            </ul>
        </li>
    </ol>
)

export default Rules;