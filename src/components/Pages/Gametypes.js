import React, { Component } from 'react';

import { Container, Row, Col, Tab, ListGroup } from 'react-bootstrap/';

class Gametypes extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    render() {
        return (
            <div className="background-static-all">
                <h2 className="page-header">Gametypes</h2>
                <Container>
                    <Row className="row-update-rules"><p>Last Updated: 1/1/2020</p></Row>
                    <Tab.Container id="rules-list-group-tabs" defaultActiveKey="#link1">
                        <Row>
                            <Col sm={4}>
                                <ListGroup className="list-gametypes">
                                    <ListGroup.Item action href="#link1">
                                        The Enemy within
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link2">
                                        Medic!
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link3">
                                        Bottle Domination
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link4">
                                        Flag Domination “Downtown”
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link5">
                                        Flag Domination “Full Map”
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link6">
                                        Sticky Bomb
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link7">
                                        Capture the Flag
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link8">
                                        Battle Buddy
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link9">
                                        Downed Pilot
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link10">
                                        Interrogation
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link11">
                                        Pilot Rescue
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link12">
                                        Wolf
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link13">
                                        General
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link14">
                                        Team Death Match
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link15">
                                        VIP Rescue
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link16">
                                        Bomb Disarmament “Bridge”
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link17">
                                        Multiple Bomb Disarmament
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link18">
                                        Red City Siege
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link19">
                                        The Purge
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link20">
                                        Countdown
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link21">
                                        P.F.R.C. “Pod Fired Rocket Cluster”
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link22">
                                        Ring the Bell - Operation Alamo
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link23">
                                        ICBM “First Strike”
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link24">
                                        Demolition
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link25">
                                        Sabotage
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link26">
                                        Operation Airstrike
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link27">
                                        Broken Arrow
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link28">
                                        Level 4 Biohazard
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link29">
                                        Operation First Strike
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link30">
                                        Detonation
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link31">
                                        Zombie Attack
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link32">
                                        Money Bag
                                </ListGroup.Item>
                                    <ListGroup.Item action href="#link33">
                                        Fuel Depot “Demolition”
                                </ListGroup.Item>
                                </ListGroup>
                            </Col>
                            <Col sm={8}>
                                <Tab.Content>
                                    <Tab.Pane eventKey="#link1">
                                        <EnemyWithin />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link2">
                                        <Medic />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link3">
                                        <BottleDomination />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link4">
                                        <FlagDominationDowntown />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link5">
                                        <FlagDominationFullMap />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link6">
                                        <StickyBomb />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link7">
                                        <CaptureTheFlag />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link8">
                                        <BattleBuddy />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link9">
                                        <DownedPilot />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link10">
                                        <Interrogation />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link11">
                                        <PilotRescue />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link12">
                                        <Wolf />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link13">
                                        <General />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link14">
                                        <TeamDeathMatch />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link15">
                                        <VIPRescue />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link16">
                                        <BombDisarmamentBridge />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link17">
                                        <MultipleBombDisarmament />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link18">
                                        <RedCitySiege />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link19">
                                        <ThePurge />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link20">
                                        <Countdown />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link21">
                                        <PFRC />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link22">
                                        <RingTheBell />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link23">
                                        <ICBM />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link24">
                                        <Demolition />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link25">
                                        <Sabotage />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link26">
                                        <OperationAirstrike />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link27">
                                        <BrokenArrow />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link28">
                                        <Level4Biohazard />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link29">
                                        <OperationFirstStrike />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link30">
                                        <Detonation />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link31">
                                        <ZombieAttack />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link32">
                                        <MoneyBag />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="#link33">
                                        <FuelDepotDemolition />
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

const EnemyWithin = () => (
        <ol start={1} className="ol-rules">
        <li className="li-content-rules">
        The Enemy within – (Snipers/spotters from each team are placed behind enemy lines to eliminate any opposing players trying to secure their team flag for victory.)
        <ul>
            <li>
                General Information -  Players start from Team #1 Alpha and Team #2 Fox HQ respawns. 
                Each team will have one or more sniper/spotters (one pair per twenty players) placed 
                behind the enemy lines, they have their own respawn FOB’s, Team #1 Snipers – Bravo FOB 
                and Team #2 Snipers – Charlie FOB (only snippers/spotters). There are two flags placed 
                between each team in the middle of the battlefield. Each flag is setup in the middle but 
                on the opponent’s side of the field. The goal is for either team to secure their own flag 
                and take it back to their team HQ. First team back to their base HQ with their own flag 
                without being hit wins. Players caring the flag must drop the flag in place when hit, a 
                live player can pick up the flag and continue. The snipers/spotters are in place behind 
                the enemy lines to takeout the flag bearer. Sniper/spotter respawns at Bravo and Charlie 
                FOB’s. (One sniper/spotter pair per 20 players), (Example: If solid has Alpha HQ, solids 
                sniper/spotter is place at the Charlie FOB respawn.) 
            </li>
            <li>
                The goal - Get your team flag back to your respawn base HQ without getting hit. (One sniper and spotter pair per 20 players).
            </li>
            <li>
                Respawn/HQ – Team #1 - Alpha main battle group HQ and Charlie FOB snipers, Team #2 - Fox main battle group HQ and Bravo FOB sniper. (Only snipers can use FOB’s)
            </li>
            <li>
                Needs – One flag for each team.
            </li>
            <li>
                Game Time – Flag placement or 30 minutes max.
            </li>
            <li>
                Area of play – The main battlefield, The HIVE is used for this game.
            </li>
            <li>
                Review overall-  This is a fun fast paced game from the start, with players always looking over their backs for snipers. This game has many different strategic moves.
            </li>
        </ul>
        </li>
    </ol>
)
const Medic = () => (
    <ol start={2} className="ol-rules">
        <li className="li-content-rules">
        Medic! – (Each team has one, two or even three medics for respawn.)
        <ul>
            <li>
                General Information – Players start with both teams at their HQ. 
                This game has no respawn point, the medic is the mobile respawn 
                point. Each player that is hit (injured) is to sit down in place 
                and wait for the team medic to respawn the player. Player must 
                take a knee when hit and be on their knee to be respawned by the 
                medic. The injured or hit player can speak only one word – “MEDIC”. 
                The medic must touch with their hand the hit team player on the shoulder 
                in order to get them back into the game. The medics have three balloons 
                attached to their shoulders and back. The balloons are the medic’s lives 
                and when the balloons are all gone then the medic is gone, taken out of 
                the game. The game is then played to the last player standing, or the 
                last medic standing. The team that has there medic taken out early is at a severe disadvantage. 
            </li>
            <li>
                The goal – Take out of play all the other teams player, be the last team standing.
            </li>
            <li>
                Respawn/HQ – Team medics, (one medic per 20 players).
            </li>
            <li>
                Needs – One, two or even three medics for each team, with two balloons each.
            </li>
            <li>
                Game Time – Team elimination or 30-minutes max.
            </li>
            <li>
                Area of play – Full field
            </li>
            <li>
                Review overall- This game is fun and requires strategy by all players. 
                Players must try not to get separated from the team and not to get out 
                into the open where the medic can’t get to them. The medic must be fast, 
                willing to get hit and quick on their feet.
            </li>
        </ul>

        </li>
    </ol>
)
const BottleDomination = () => (
    <ol start={3} className="ol-rules">
        <li className="li-content-rules">
        Bottle Domination – (Each team has five possible bottle domination points, 
        the team with the most domination points after twenty-five minutes wins.)
        <ul>
            <li>
                General Information – Game starts as an active fire fight from Delta 
                HQ and Bravo HQ respawns.  There are five bottle domination points 
                out in the field - (#1 Ryan’s Bridge, #2 Supply Depot, #3 The Scorpion, 
                #4 Communication Center, and #5 Downtown.) Each domination point has a 
                red/burgundy cinder block with two bottles, one Yellow for Camo and one 
                Blue for Solid. To dominate a point the team must take out the opposing 
                teams bottle and have their own bottle in the cinder block. Your bottle 
                for your team in the cinder block represents a domination point. The 
                team with the most domination points at the end of the game (25 minutes) wins.
            </li>
            <li>
                The goal – Have the most domination points secured by having your bottle 
                in the most cinder blocks (domination points) at the end of the game (20 minutes). 
            </li>
            <li>
                Respawn/HQ – Team 1 Delta HQ, Team 2 Bravo HQ.
            </li>
            <li>
                Needs – Five domination points with five yellow bottles and five blue bottles.
            </li>
            <li>
                Game Time – 25 minutes max.
            </li>
            <li>
                Area of play – Downtown, CDC and Ryan’s bridge area.
            </li>
            <li>
                Review overall- This is a great starting game, it allows US Airsoft to 
                evaluate the teams to make sure they are even. It’s fast paced, easy to 
                understand and fun to play game. Teams need to be persistent and have 
                stamina. Some better teams hold out until the end to make a large push 
                to take back all the domination points. Bottles will change back and forth 
                several times through out the game.
            </li>
        </ul>
        </li>
    </ol>
)
const FlagDominationDowntown = () => (
    <ol start={4} className="ol-rules">
        <li className="li-content-rules">
            Flag Domination “Downtown” – (Place your flag at the designated spot and hold for three minutes)
            <ul>
                <li>
                    General Information – Players start in an active fire fight from Delta HQ or Bravo HQ 
                    respawn points. Teams are to collect their flag from a predetermined designated area, 
                    and then place that flag in another designated area that is given to the teams at the 
                    mission briefing. After placing the flag, the team must hold the flag in place for 
                    three minutes. If the team can hold the flag in place for three minutes they win. 
                    If the other team can pull the flag, the clock goes back to zero, until the flag 
                    can be replaced or the team pulling the flag can place their flag in another 
                    predetermined designated spot and hold theirs for three minutes. 
                </li>
                <li>
                    The goal – Gather and post your flag in the predetermined spot and hold for three minutes.
                </li>
                <li>
                    Respawn/HQ – Team #1 - Delta HQ, Team #2 - Bravo HQ
                </li>
                <li>
                    Needs – One flag for each team.
                </li>
                <li>
                    Game Time – Team flag placement for three minutes or 30-minutes max.
                </li>
                <li>
                    Area of play – Downtown, CDC, Supply Depot and Ryan’s Bridge areas.
                </li>
                <li>
                    Review overall- This is a fast pace, wild ride type of game, speed soft type. Not a lot of strategy, just determination and who wants it the most. Good game for spectators. Players love this game..
                </li>
            </ul>
        </li>
    </ol>
)
const FlagDominationFullMap = () => (
    <ol start={5} className="ol-rules">
        <li className="li-content-rules">
        Flag Domination “Full Map” – (Raise your flag up the flag poles around the arena and hold for domination. There are eight flag poles around the arena)
        <ul>
            <li>
                The goal – Raise up and secure your team flag in more flag pole domination points than the opposing team. (Eight Possible Flag Pole Points)
            </li>
            <li>
                Respawn/HQ – Team #1 - Alpha HQ and Bravo FOB, Team #2 - Fox HQ and Charlie FOB
            </li>
            <li>
                Needs – One FOB flag for each team.
            </li>
            <li>
                Game Time –30 minutes.
            </li>
            <li>
                Area of play – Full arena map.
            </li>
            <li>
                Review overall- This is a great game, plays the whole map, good for large groups, easy to 
                understand and allows for different environments (Long field, CQB). Requires some strategy 
                by players. Lost of players involved in this game, lots of areas to play and things to do..
            </li>
        </ul>
        </li>
    </ol>
)
const StickyBomb = () => (
    <ol start={6} className="ol-rules">
        <li className="li-content-rules">
        Sticky Bomb – (Place your “Bomb” on the opponent’s cannon and hold for three minutes.)
        <ul>
            <li>
                General Information – Game starts from Alpha HQ and Fox HQ respawn points. Each team 
                has their own bomb (Yellow Camo, Blue Solid). Object of the game is to place (stick) 
                your bomb on the front of the opponent’s cannon and hold for three minutes.  This 
                game will also operate with FOB’s.  (FOB rules apply).
            </li>
            <li>
                The goal – Place your bomb on the opponent’s cannon and hold for three minutes.
            </li>
            <li>
                Respawn/HQ – Team #1 - Alpha HQ and Bravo FOB, Team #2 - Fox HQ and Charlie FOB.
            </li>
            <li>
                Needs – One bomb for each team, FOB flags.
            </li>
            <li>
                Game Time – Team bomb placement for three minutes or 30-minutes max.
            </li>
            <li>
                Area of play – Full arena map.
            </li>
            <li>
                Review overall- This is a fast game that plays the entire map. Great 
                diversity of play with different environments. This is a good strategic 
                game with many different moves possible. 
            </li>
        </ul>
        </li>
    </ol>
)
const CaptureTheFlag = () => (
        <ol start={7} className="ol-rules">
        <li className="li-content-rules">
        Capture the Flag – (Each team has their flag in their base area of operations, each team will try and capture the other team’s flag.)
        <ul>
            <li>
                General Information – Game starts with each team having their flag placed at a point in each team’s base area of operations, 
                this is designated by the US Airsoft official. Each team will try and capture the other teams flag and bring it back to their 
                respawn HQ. If a player is hit while carrying the flag, the flag is dropped where the player was hit and can only be picked up 
                by fellow live team player. Teams cannot pickup or move their own flags, they can defend it, but only the opposing team can take 
                it. First team to complete the mission of bringing the other team’s flag back to their HQ wins. 
            </li>
            <li>
                The goal - Capture the other team’s flag and bring it back to your HQ for the win.
            </li>
            <li>
                Respawn/HQ – Team #1 Alpha, or Bravo HQ, Team #2 Fox or Charlie HQ.
            </li>
            <li>
                Needs – One flag for each team.
            </li>
            <li>
                Game Time – Capture and securing the opponents flag at your HQ or 30-minutes max.
            </li>
            <li>
                Area of play – Full arena map.
            </li>
            <li>
                Review overall- This is a simple game that plays the entire map. Great diversity of play with different environments. Easy game for beginners.  
            </li>
        </ul>
        </li>
    </ol>
)
const BattleBuddy = () => (
        <ol start={8} className="ol-rules">
        <li className="li-content-rules">
        Battle Buddy – (Players are placed into pairs (Battle Buddies), a location is given to the teams to take and hold.)
        <ul>
            <li>
                General Information – Game starts with each team having their players 
                placed into pairs from each of the team’s HQ’s. This is a capture and 
                stand your ground game. An area of importance is given to the teams 
                (Example: Communications Center), teams are required to take and hold 
                the area of importance.  While the game is playing, each player must 
                stay within physical contact of their battle buddy (6 feet max). 
                If a battle buddy gets hit the battle buddy can only be moved by contact 
                from the other buddy. The injured or hit buddy cannot shoot or make any 
                combat moves, they can only move along with the other buddy, they become 
                dead weight.  If the uninjured player wants to move positions, then the 
                uninjured player must place a hand on the injured player and move them 
                along as to simulate a real injured combat move. The injured player can 
                only respawn with the help of the uninjured buddy. To respawn, the uninjured 
                player must guide the injured buddy back to the team respawn tent using full 
                contact with a hand on the shoulder. If the two buddies are both hit before 
                reaching the respawn team tent, they are out, and must sit down in the area 
                they were hit and wait for the end of the game. FOB rules apply.
            </li>
            <li>
                The goal - Take and hold the area of importance until the clock runs out, 
                be the team controlling the area of importance when the clock runs out or 
                eliminate the other team. 
            </li>
            <li>
                Respawn/HQ – Team #1 - Alpha HQ and Bravo FOB, Team #2 - Fox HQ and Charlie FOB.
            </li>
            <li>
                Needs – FOB flags.
            </li>
            <li>
                Game Time – Eliminate opposing team or hold area of importance for 25-minutes.
            </li>
            <li>
                Area of play – Full arena map.
            </li>
            <li>
                Review overall- This is a strategic game that plays the entire map and creates 
                teamwork. Great diversity of play with different environments. This is a good 
                strategic game with many different moves possible. Teaches players to work 
                together or get eliminated. 
            </li>
        </ul>
        </li>
    </ol>
)
const DownedPilot = () => (
        <ol start={9} className="ol-rules">
        <li className="li-content-rules">
        Downed Pilot – (Teams must locate, retrieve the downed pilot with his vehicle and bring the pilot to the extraction point given by US Airsoft Command).
            <ul>
                <li>
                    General Information – Teams start peacefully from their HQ’s, teams should not start a war until they have secured the pilot. 
                    Teams will fan out to find the downed pilot and retrieve him. Teams will also post their FOB’s. Once the pilot is found the 
                    team that finds the pilot may choose to defend the pilot causing a war, firing on the opposing team. The team that finds the 
                    pilot will use the pilots radio to contact US Airsoft Command for the extraction point. Before moving the pilot, the team must 
                    place the teams color control bottle from the back of the pilot’s vehicle to the front, signifying control. The pilot life is 
                    in that team’s hands at that point, balloons represent the life of the pilot. If the balloon are somehow popped, shot out while 
                    under that teams control that team loses. Once the extraction point is given by US Airsoft Command the team will proceed to the 
                    area. Teams may ask US Airsoft command for guidance and help, they may also ask for an alternate extraction point. Once the pilot 
                    has been safely moved into the extraction point, the team must wait and hold with the pilot for three minutes. If this can be 
                    accomplished without the pilot being killed (popping the balloons) the team wins. FOB rules apply.
                </li>
                <li>
                    The goal – Find, secure and move the pilot to the extraction point given by US Airsoft Command and hold for three minutes.
                </li>
                <li>
                    Respawn/HQ – Team #1 - Alpha HQ and Bravo FOB, Team #2 - Fox HQ and Charlie FOB.
                </li>
                <li>
                    Needs – Pilot with vehicle, radios, FOB flags.
                </li>
                <li>
                    Game Time – Safely secure the pilot for three minutes at the extraction point.
                </li>
                <li>
                    Area of play – Full arena map.
                </li>
                <li>
                    Review overall- This is a great game that plays the entire map. Great diversity of play with different environments. This is a great strategic game. 
                </li>
            </ul>
        </li>
    </ol>
)
const Interrogation = () => (
        <ol start={10} className="ol-rules">
            <li className="li-content-rules">
            Interrogation – (There is a high valued asset that need to be interrogated)
            <ul>
                <li>
                    General Information – In this game Team #1 needs to keep the high 
                    valued asset safe for 20 minutes in order to extract critical 
                    information. Team #2 needs to search out and destroy the high 
                    valued asset as a target, by popping the balloons signifying 
                    life. Team #1 starts in the HIVE and may move, hide or defend 
                    the high valued asset as needed to keep him alive long enough 
                    to extract the vital information (20 minutes). Team #1 can only 
                    use medics with zip ties to respawn (one medic per 20 players, 
                    unlimited zip ties). Team #2 use Fox HQ and two flags for 
                    multiple FOB’s for respawn points. (FOB rules apply)
                </li>
                <li>
                    The goal – Team #1 keep the high valued target alive lone 
                    enough to extract intel, team #2 eliminate the high value 
                    target by popping all the balloons associated with the target.
                </li>
                <li>
                    Respawn/HQ – Team #1 - Medic bags, Team #2 - Fox HQ and two flag FOBs.
                </li>
                <li>
                    Needs –  Medic bags (one medic per 20 players), pilot with vehicle and balloons, Team #2 - two flags for FOBs
                </li>
                <li>
                    Game Time – Team #1 -20 minutes, Team #2 – eliminate the high valued asset 
                </li>
                <li>
                    Area of play – Full arena map.
                </li>
                <li>
                    Review overall- This is a very strategic game that requires lots of thought and preparation. The game plays fast and uses the entire map.  
                </li>
            </ul>
        </li>
    </ol>
)
const PilotRescue = () => (
        <ol start={11} className="ol-rules">
            <li className="li-content-rules">
            Pilot Rescue – (Team #1 must locate and retrieve the injured downed pilot and bring him back on a stretcher to the communication building for extraction, Team #2 must stop the pilot).
            <ul>
                <li>
                    General Information – Game starts with Team #1 being designated as the US Airsoft special 
                    operations rescue team. Team #1 is separated into two groups, one group (20% of the field) 
                    will be designated as the US Airsoft Tier One Players and are placed in Red City to protect 
                    and move the pilot. The other part of Team #1 will be designated as the US Airsoft Rangers, 
                    they will start from Alpha and assist in the extraction of the pilot, they can use Delta as 
                    a FOB. They will meet up with the US Airsoft Tier One Players and assist in moving the 
                    downed pilot into the extraction point (communication Center), and pop smoke for extraction 
                    (post flag at the Scorpion) and hold for three minutes. All must be done in the allotted 
                    time of 30 minutes. The other team, Team #2 are the Insurgents and they must stop the 
                    rescue of the downed pilot by running out the time of 30 minutes. Popping the pilot’s 
                    balloons, pulling the flag, stopping the rescue. FOB rules apply.
                </li>
                <li>
                    The goal – Rescue the pilot by taking him to the communications center for extraction.
                </li>
                <li>
                    Respawn/HQ – Team #1 - Alpha HQ, Delta and FOBs, Team #2 - Bravo HQ, Charlie FOB.
                </li>
                <li>
                    Needs – Pilot with stretcher, FOB flags, team 1 flag for smoke.
                </li>
                <li>
                    Game Time – Team #1 Successfully places pilot at extraction point for three minutes or Team #2 stops pilot from being extracted by stopping him, holding for 30 minutes.
                </li>
                <li>
                    Area of play – Full arena map.
                </li>
                <li>
                    Review overall- This is a fun strategic game with lots of different moves that can be played out. Game plays the entire map, great diversity of play with different environments.  
                </li>
            </ul>
        </li>
    </ol>
)
const Wolf = () => (
    <ol start={12} className="ol-rules">
        <li className="li-content-rules">
            Wolf – (One player on each team is designated as a double agent with the identity unknown to the other players.)
            <ul>
                <li>
                    General Information – The game Wolf is an elimination style game 
                    with no respawn points, when your hit you’re down for the duration 
                    of the game. One wolf player shall be designated from each team 
                    by US Airsoft Official. The Wolf identity is kept secret from the 
                    team they start with. The Wolf is a double agent that starts on the 
                    opposing team. The Wolf must pretend to be part of said team until 
                    activated into action by their real team leader from the opposing 
                    side or by a predetermined signal. At the team briefing in each of 
                    the two team HQ’s, the teams will be told the identity of the wolf 
                    player on their team, playing for the other side as the double agent. 
                    This is done so they don’t eliminate the Wolf playing for their side. 
                    They will also identify the time or signal to activate the wolf player 
                    into action for their side.
                </li>
                <li>
                    The goal – Eliminate all players from the opposing team, using the Wolf as a valued tool to help in the elimination.
                </li>
                <li>
                    Respawn/HQ – No respawn.
                </li>
                <li>
                    Needs – N/A
                </li>
                <li>
                    Game Time – Elimination of the opposing team, or 20 minutes maximum.
                </li>
                <li>
                    Area of play – Full arena map.
                </li>
                <li>
                    Review overall- This is a simple game of elimination that has a twist of a secret agent “The Wolf”. The game uses the entire map.
                </li>
            </ul>
        </li>
    </ol>
)
const General = () => (
    <ol start={13} className="ol-rules">
        <li className="li-content-rules">
            General – (Each team has a designated General that is heavily protected with body armor,
             giving the General two lives, this is represented by using balloons as lives. 
             Eliminate the opposing teams General by popping the two balloons and win the game).
            <ul>
                <li>
                    General Information – Game starts with Team #1 from Alpha HQ and Team #2 from 
                    Fox HQ. Each team will have additional respawn point possibilities’ using two 
                    flags each for FOB’s. The General is a VIP protection type game that uses a General 
                    as a type of juggernaut, using two balloons as lives for the General. Each team has 
                    a General, with two balloons attached, representing two lives. The General has a 
                    Top-Secret medical crate that is located behind enemy lines. The crates are large 
                    and have a medical cross on the outside, with identification using color coded 
                    lines across the crate (yellow camo, Blue solid). The teams cannot touch or take 
                    the opposing teams crate. The crate contains two additional life balloons for the 
                    General to use for additional life or the ability to add a Generals Bodyguard. If a 
                    Generals Bodyguard is added, he becomes a tough adversary for the other team. The Generals 
                    Bodyguard is a type of juggernaut and has the same superpower with two lives represented by 
                    two balloons as like the General. The important difference is that if the Generals Bodyguard 
                    balloon are eliminated, the game doesn’t end, the Generals Bodyguard can just continue like 
                    any other team player, using the team respawn points. If neither team has eliminated the 
                    other teams General, both teams loose, it is not sufficient or good enough just to 
                    survive and protect your General.
                </li>
                <li>
                    The goal – Eliminate the opponents General by popping both Generals balloons.
                </li>
                <li>
                    Respawn/HQ – Team #1 – Alpha, Team #2 – Fox.
                </li>
                <li>
                    Needs – One designated General from each side, one Top Secret Generals box with three balloons 
                    inside each, two FOB flags for each side.
                </li>
                <li>
                    Game Time – Eliminate the opposing teams General or 30 minutes maximum.
                </li>
                <li>
                    Area of play – Full arena map.
                </li>
                <li>
                    Review overall- This is a strategic game with lots of different moves that can be played out. 
                    Game plays the entire map, great diversity of play.
                </li>
            </ul>
        </li>
    </ol>
)
const TeamDeathMatch = () => (
    <ol start={14} className="ol-rules">
        <li className="li-content-rules">
            Team Death Match – (One hit one kill, eliminate the opponents team and win the game).
            <ul>
                <li>
                    General Information – Teams start from any designated spot chosen by a US Airsoft
                     official. This is a team elimination game, with no respawns. Get shot you’re out, 
                     shoot and hit an opponent and they are out. Last team standing wins.
                </li>
                <li>
                    The goal – Eliminate the opponents team.
                </li>
                <li>
                    Respawn/HQ – No Respawns.
                </li>
                <li>
                    Needs – N/A.
                </li>
                <li>
                    Game Time – Eliminate the opposing team. 20-25 minutes maximum.
                </li>
                <li>
                    Area of play – Full arena map.
                </li>
                <li>
                    Review overall- This is a simple game of elimination, fun and exciting. Players think twice before exposing themselves in the open. Adrenaline pumping fun and challenging. Fun search and destroy mission, game uses the full map, great play diversity.  .
                </li>
            </ul>
        </li>
    </ol>
)
const VIPRescue = () => (
    <ol start={15} className="ol-rules">
        <li className="li-content-rules">
            VIP Rescue – (VIP protection and rescue game.).
            <ul>
                <li>
                    General Information – Game start with a special operations team, Team #1 in Red City.  
                    Their job is to protect and hold for extraction the VIP. A VIP is designated at the 
                    start of the game and represented by wearing the green radio backpack. The VIP will 
                    have two balloons representing life. The team is held up in Red City and needs to 
                    have the VIP extracted by helicopter from the landing Zone (LZ), keep the VIP safe 
                    and move to the landing zone (LZ) for extraction. Keep the VIP alive by keeping the 
                    balloons intact for twenty (25) minutes and have the VIP at the LZ at the extraction 
                    time designated. The extraction will not take place until precisely twenty-five (25) 
                    minutes from the start of the game. The extraction point is located on top of Fox hill 
                    “The Fox Den”, in the camo net. Team #1 will use team medics with zip ties for respawn 
                    (one medic per 20 players, unlimited zip ties). Team #2 will start from Alpha HQ and 
                    have two FOB flags to post in any red medic pipe to act as a FOB. (FOB rules apply). 
                    Once the time limit gets close to 25 minutes, the extraction team needs to get the 
                    VIP to the extraction point. When the clock timer gets down to zero and the VIP is 
                    at the “The Fox Den” Team #1 wins. For Team #2 to win, pop all the VIP balloons (2) 
                    representing life or keep the VIP from reaching the extraction point “The Fox Den”, 
                    time runs out.
                </li>
                <li>
                    The goal – Team #1 – Get the VIP safely to the LZ, Team #2 eliminate the VIP or keep the VIP from reaching the LZ.
                </li>
                <li>
                    Respawn/HQ – Team #1 team medics, Team # 2 Alpha HQ and two FOB flags.
                </li>
                <li>
                    Needs – Team #1- VIP Radio backpack and medic bags, Team #2 two FOB flags.
                </li>
                <li>
                    Game Time – Eliminate the VIP, or 25 minutes maximum.
                </li>
                <li>
                    Area of play – Full arena map.
                </li>
                <li>
                    Review overall- This is a fun challenging and strategic game, with many different 
                    scenarios to play. Complex game of protection and elimination, fun and exciting.
                </li>
            </ul>
        </li>
    </ol>
)
const BombDisarmamentBridge = () => (
    <ol start={16} className="ol-rules">
        <li className="li-content-rules">
            Bomb Disarmament “Bridge” – (Disarm the nuclear bomb on Ryan’s Bridge)
            <ul>
                <li>
                    General Information – Team #1 starts from Delta HQ respawn, and Team #2 starts from Bravo HQ respawn. Teams must secure their team flag first; the flag will start in a predetermined location. After securing the team flag, the team must battle to Ryan’s Bridge, post the team flag in the green post tube on the bridge. In addition, the team needs to secure the disarming book from the communication center and bring it to the bridge. Once the team flag has been posted and the disarming book is at the bridge the team can start disarming the bomb, by cutting the colored wires (zip ties) off the bomb in the order as shown in the disarming book. The team that cuts the last wire in order wins. Cutting the color wires out of sequence will explode the bomb, you lose!
                </li>
                <li>
                    The goal – Successfully cut all the zip ties in order and be the team to cut the last zip tie.
                </li>
                <li>
                    Respawn/HQ – Team #1 – Delta, Team #2 - Bravo respawns.
                </li>
                <li>
                    Needs – Color zip ties, disarming book, 1 team flag each.
                </li>
                <li>
                    Game Time – Successfully cut the last zip tie, 30 minutes maximum.
                </li>
                <li>
                    Area of play – Downtown area, CDC, HIVE and Ryan’s Bridge.
                </li>
                <li>
                    Review overall- This is a great game, fun and exciting. Players must think twice before cutting the zip ties, they must be cut in order. Challenging and some strategy required.
                </li>
            </ul>
        </li>
    </ol>
)
const MultipleBombDisarmament = () => (
    <ol start={17} className="ol-rules">
        <li className="li-content-rules">
            Multiple Bomb Disarmament – (There are three bombs that need to be disarmed, first team to cut all their team color wires (zip ties) wins).
            <ul>
                <li>
                    General Information – Team #1 starts from Delta HQ respawn, and Team #2 starts from Bravo HQ respawn. In this game there are three bombs that need to be disarmed by each team. On each bomb there are zip ties representing wires of a bomb, these zip ties are colored Yellow for Camo and Blue for Solid. First team to successfully cut all their team color zip ties from all three bombs wins. Don’t cut any red wires or “Boom”. Bomb locations are: 1. Ryan’s Bridge (Large white nuke bomb), 2. Downtown (Large green machine nuke), 3.  Mobile vehicle location “location to be determined by US Airsoft officials” (Small red nuke bomb in vehicle).
                </li>
                <li>
                    The goal – Cut all your team wires form the three bombs. (Don’t cut the Red)
                </li>
                <li>
                    Respawn/HQ – Team #1 – Delta, Team #2 - Bravo respawns.
                </li>
                <li>
                    Needs – 6-blue and 6-yellow zip ties for each of the three bombs.
                </li>
                <li>
                    Game Time – Successfully cut all your team color zip ties, or 25 minutes maximum.
                </li>
                <li>
                    Area of play – Downtown area, CDC, HIVE and Ryan’s Bridge.
                </li>
                <li>
                    Review overall- This game is a fast paced, fun and exciting. Players must think twice before cutting the zip ties, they must their color and not the red.  .
                </li>
            </ul>
        </li>
    </ol>
)
const RedCitySiege = () => (
    <ol start={18} className="ol-rules">
        <li className="li-content-rules">
            Red City Siege – (Siege the Red City, “Attack!”, and shoot out all eight balloons 
            within the Red City for a low time. Than defend Red City, hold the attackers of 
            as long as posable. The best time of either team on attacking Red City and shooting 
            out all the balloons wins the game).
            <ul>
                <li>
                    General Information – Team #1 starts from Charlie HQ and The Battlefield 
                    Wall FOB respawns simultaneously. Team #1 attacks in full force from both 
                    locations to shoot out all eight (8) balloons at Red City. Team #2 defends 
                    and tries to hold off the on slot of players attacking. Team #2 has only 
                    Fox HQ as a respawn. It’s usually enviable that Team one prevails in 
                    shooting out all balloons, the question is how fast, it’s a matter of time. 
                    Now it’s your turn, your team must now defend, hold off the other team for 
                    the best time. Can your team shoot out all eight balloons in the shortest 
                    amount of time, can your team hold of the other team for the longest time, 
                    time will tell, good luck, you have fifteen minutes.
                </li>
                <li>
                    The goal – Eliminate the opponents balloons in Red City for the best time.
                </li>
                <li>
                    Respawn/HQ – Team #1 Charlie HQ and The Wall FOB respawns, Team #2 Fox Firebase HQ.
                </li>
                <li>
                    Needs – 16 balloons.
                </li>
                <li>
                    Game Time – Eliminate the opposing balloons in Red City, or 15 minutes maximum.
                </li>
                <li>
                    Area of play – Red City, Battlefield, No Mans area.
                </li>
                <li>
                    Review overall- This is a simple game of time elimination, fun and exciting. Adrenaline pumping fun and challenging.
                </li>
            </ul>
        </li>
    </ol>
)
const ThePurge = () => (
    <ol start={19} className="ol-rules">
        <li className="li-content-rules">
            The Purge – (A bio hazard has been released, you must get to the Red square in the center of the CDC and pickup and hold a cure canister before time runs out).
            <ul>
                <li>
                    General Information – Teams start from any designated spot chosen by a US Airsoft official. 
                    This is a team elimination game, with no respawns. Get shot you’re out, shoot and hit an 
                    opponent and they are out. The purge soundtrack will start with a woman’s verbal warnings, 
                    followed by a siren, when the siren sounds, it’s game on. A ten-minute countdown will commence 
                    over the loud speakers. The goal is to get to the red square in the center of the CDC, 
                    representing a safe zone for the bio hazard release. When in the red square you must be 
                    alive and holding one of the cure canisters when the countdown clock gets to zero. You 
                    cannot remove the cure canister from the red square, and you can be shot and killed while 
                    in the red square. Last player standing at zero alive in the red square and holding a 
                    cure canister wins.
                </li>
                <li>
                    The goal – Eliminate all the opponents and be in the red square alive with a cure canister when the clock time gets to zero.
                </li>
                <li>
                    Respawn/HQ – No Respawns.
                </li>
                <li>
                    Needs – Cure canister, number representing 10% of the population.
                </li>
                <li>
                    Game Time – Approximately 12 minutes. (10-minute countdown)
                </li>
                <li>
                    Area of play – Full arena map.
                </li>
                <li>
                    Review overall- This is a game of elimination, fun, exciting and heart pounding. Players think 
                    twice before exposing themselves in the red square in the open. Tactics and timing are required 
                    for this game. Winners will get a US Airsoft Purge survival patch.
                </li>
            </ul>
        </li>
    </ol>
)
const Countdown = () => (
    <ol start={20} className="ol-rules">
        <li className="li-content-rules">
            Countdown – (Start the clock against the opposing team, if their timer hits zero you win).
            <ul>
                <li>
                    General Information – Teams start off from predetermined HQ’s (respawn points). The countdown clock is also placed in a predetermined spot and the location is shared with both teams at the mission briefing. The countdown clock starts off with each team having 10 minutes. When the teams are released to engage each other, teams need to get to the countdown clock and push their teams color button on the clock, represented by the team color (Yellow for Camo, Blue for Solid). When the team color is touched, it starts the countdown of the opposing teams time. If the opposing team can get to the countdown clock and touch their color, it will make their timer stop and start the countdown for the opposite team. The team that can get the opposing teams time down to zero wins.
                </li>
                <li>
                    The goal – Run the time down on the countdown clock for the other team.
                </li>
                <li>
                    Respawn/HQ – Predetermined Respawns.
                </li>
                <li>
                    Needs – Countdown clock.
                </li>
                <li>
                    Game Time – Eliminate the opposing team by having their clock time countdown to zero = 20 minutes.
                </li>
                <li>
                    Area of play – Full arena map, or specific areas can be used.
                </li>
                <li>
                    Review overall- This is a fun fast paced game, that requires some game awareness. Teams need to monitor the countdown clock to make sure it’s counting down against the opposing team and not theirs. This is adrenaline pumping fun and can be used in many areas of the field, great for night games.
                </li>
            </ul>
        </li>
    </ol>
)
const PFRC = () => (
    <ol start={21} className="ol-rules">
        <li className="li-content-rules">
            P.F.R.C. “Pod Fired Rocket Cluster” – (Get to the P.F.R.C., put in your target city and launch the rockets).
            <ul>
                <li>
                    General Information – Team #1 starts from Alpha HQ. respawn and Team #2 start 
                    from the Launch Pad as a HQ. respawn. Teams need to battle up to the PFRC, open 
                    the control panel and enter the launch codes to start the launch sequence. 
                    Launch codes are given for a specific target city by the US Airsoft official. 
                    Players are to call out loudly the launch codes, so the US Airsoft office can 
                    confirm the correct coordinates. Once the codes have been correctly put into the 
                    penal, the warning light on top of the panel will start to flash, this will indicate 
                    the PFRC is ready to fire. The player than must move to the opposite side of the PVRC, 
                    open the secondary panel and turn on both switches for the launch. If this is successfully 
                    done, a siren will sound off indicating a successful launch. Flight time to target is 
                    three minutes, so the team launching the PFRC must hold off the opposing team for three minutes. 
                    If the opposing team can get to the PFRC within three minutes, open the secondary panel and 
                    flip the switches off, the siren will stop and the rockets that were launched will be destroyed. 
                    To win this game, one of the team must successfully launch their PFRC rockets and hold off the 
                    opposing team for three minutes allowing the rockets to get to their target. If this can be done 
                    that team wins.
                </li>
                <li>
                    The goal – Launch the P.F.R.C. rockets successfully at the target city and hold for three minutes.
                </li>
                <li>
                    Respawn/HQ – Respawns: Team #1 - Alpha HQ, Team #2 - Launch pad as a HQ.
                </li>
                <li>
                    Needs – Charged PFRC battery.
                </li>
                <li>
                    Game Time – 25 minutes maximum.
                </li>
                <li>
                    Area of play – Hells Highway, Battlefield, and Ryan’s Bridge areas.
                </li>
                <li>
                    Review overall- This is a great game that many players like, it’s challenging and 
                    requires team work. Many battle badges have been given for players engaged in this game.
                </li>

            </ul>
        </li>
    </ol>
)
const RingTheBell = () => (
    <ol start={22} className="ol-rules">
        <li className="li-content-rules">
            Ring the Bell - Operation Alamo – (Ring the Church bell for reinforcements)
            <ul>
                <li>
                    General Information – Game starts with Team #1 from Bravo HQ and Team #2 from Charlie 
                    HQ. Team #1 from Bravo HQ is the attacking team and needs to get to the church in order 
                    to ring the bell for reinforcements. A large force aligned with Team #2 is moving in on 
                    Team #1 and will arrive in about 25 minutes, to survive Team #1 must reach the Church 
                    and ring the church bell, this will call in their own reinforcements and the win the game. 
                    Team #2 from Charlie HQ needs to defend the Church as not to let Team #1 ring the bell. 
                    If Team #2 can hold off Team #1, their reinforces are expected to arrive in 25 minutes 
                    and they will win the game. Team #1 is also low on ammo, if Team #2 can get Team #1’s 
                    ammo box from behind their lines and bring it back to their HQ, they win.
                </li>
                <li>
                    The Goal – Team #1 ring the church bell, Team #2 defend the bell, or steal the ammo.
                </li>
                <li>
                    Respawn/HQ –  Team #1 Bravo HQ, Team #2 – Charlie HQ.
                </li>
                <li>
                    Needs – Ammo Can.
                </li>
                <li>
                    Game Time – 25 minutes maximum.
                </li>
                <li>
                    Area of play – The HIVE.
                </li>
                <li>
                    Review overall- This is an easy to understand and easy to play game, that uses the 
                    HIVE as the battleground. Lots of areas to hide and advance, plays really like this game.
                </li>
            </ul>
        </li>
    </ol>
)
const ICBM = () => (
    <ol start={23} className="ol-rules">
        <li className="li-content-rules">
            ICBM “First Strike” – (Be the first team to launch the ICBM “First Strike” and win).
            <ul>
                <li>
                    General Information – Team #1 starts from Alpha HQ and Bravo FOB, Team #2 from 
                    Fox HQ and Charlie FOB. One player is picked from each team to act as the ICBM 
                    Technician.  The ICBM Technician is responsible for making sure the control 
                    panel of the ICBM is properly connected to the portable power station and 
                    the targeting color connectors are properly connected for their team. Two 
                    additional players will be picked from each team to act as the Launch Control 
                    Specialists. The specialists are responsible for the team ICBM launch keys 
                    (Yellow for Camo and Blue for Solid) and the launch of the missile with 
                    these keys for the ICBM. The portable power station is located somewhere 
                    in the HIVE and must be located and taken to the ICBM. Once the power 
                    station has been delivered to ICBM, the ICBM Technician will be responsible 
                    for making sure the power plant is properly connected. After the Technician 
                    has approved the connection of the power supply to the ICBM, the technician 
                    will give the authorization to the Launch Control Specialist to launch. 
                    The Launch Control Specialist will go to the ICBM and prepare for launch. 
                    There are two keys (#1 and #2) from each team needed to launch the ICBM, the 
                    Specialist have both keys for their team. The keys need to be inserted by each 
                    specialist together and the keys need to be turned simultaneous to launch the ICBM. 
                    Once the keys have been turned properly and the ICBM is primed to launch, sirens 
                    will sound, and lights will flash. There is a three-minute window powering up the 
                    ICBM to launch, it takes three minutes from the turning of the keys for the ICBM 
                    to actually launch. Within these three minutes, the siren will be going off and 
                    the lights will be flashing. The launching team will need to hold off the opposing 
                    team in this critical time. If the opposing team can get up to the ICBM, there is a 
                    RED Emergency Shutdown Button. If it is pushed, the ICBM Missile stand down. The 
                    only way to reactivate the ICBM is to reinsert the team keys and relaunch. If 
                    the opposing team is ready to launch, the ICBM Technician for their team must 
                    first change the launch targeting color connections on the control panel to 
                    their targeting color. Then the Technician must give the launch approval and 
                    turn it over to their Launch Control Specialist. The specialist will then 
                    have to use their color keys for launch and hold for three minutes while 
                    the ICBM powers up, like the other team. After the keys have been turned 
                    and the three-minute launch window has been activated, the opposing team 
                    can also shut the ICBM down within the three minutes by pushing the RED 
                    Emergency Shutdown Button.  All the selected players picked from each 
                    team will be brought out to the ICBM launch area prior to the start of 
                    the game to be instructed on how to perform their duties. FOB rules apply.
                </li>
                <li>
                    The goal – Be the first team to launch the ICMB Missile.
                </li>
                <li>
                    Respawn/HQ – Team #1 – Alpha and Bravo FOB, Team #2 Fox and Charlie FOB.
                </li>
                <li>
                    Needs – ICBM Power supply.
                </li>
                <li>
                    Game Time – Launch ICBM Missile or 25 minutes maximum.
                </li>
                <li>
                    Area of play – Full arena map.
                </li>
                <li>
                    Review overall- This is a very strategic and critical thinking style game. 
                    Strategy needs to be applied and critical team role players need to be picked. 
                    This is a very challenging game that requires teamwork and a team command 
                    structure to work well.
                </li>
            </ul>
        </li>
    </ol>
)
const Demolition = () => (
    <ol start={24} className="ol-rules">
        <li className="li-content-rules">
            Demolition – (Find the Nuclear Bomb and disarm it. First team to disarm their Nuke wins).
            <ul>
                <li>
                    General Information – Team #1 starts from Delta HQ and Team #2 Starts from Bravo HQ. 
                    In the Cities Electric Hub there are two nuclear bombs. One is yellow representing 
                    Camo and the other is Black representing Solid. Each bomb has six ignition wires 
                    placed on them, represented by zip ties using the team colors. In addition to the 
                    bombs ignition wires there are six red detonation wires next to the ignition wires, 
                    don’t cut the Red wires, they will detonate the nuclear bomb and your team loses. 
                    Teams must fight into the HUB and cut all their color wires on their colored bomb 
                    (Yellow Camo, Blue Solid) avoiding the Red wires (zip ties).  Once they have 
                    completed the task of cutting all the team color ignition wires, they must collect 
                    their flag from the supply depot. After they have collected their flag, they must 
                    post the flag at the green post tube at the end of the Scorpion and hold it for 
                    three minutes. At any point during the three-minute hold, the opposing team can 
                    pull the flag stopping the clock, putting the clock back to zero. If the posting 
                    team can hold the flag for three minutes, they win.
                </li>
                <li>
                    The Goal – Cut all your wires from your team color nuclear bomb, then post and hold your team flag for three minutes in the green posting tube at the end of the scorpion.
                </li>
                <li>
                    Respawn/HQ –  Team #1 - Delta HQ, Team #2 – Bravo HQ.
                </li>
                <li>
                    Needs – Two flags one for each team, two Nuke bombs, one for each team, team color zip ties for each team.
                </li>
                <li>
                    Game Time – 25 minutes maximum.
                </li>
                <li>
                    Area of play – Downtown and supply depot areas.
                </li>
                <li>
                    Review overall- This is a very fast paced game, many players like this game. Not a lot of strategy needed, just airsoft bravery, and the wiliness to try. Great for spectators.
                </li>
            </ul>
        </li>
    </ol>
)
const Sabotage = () => (
    <ol start={25} className="ol-rules">
        <li className="li-content-rules">
            Sabotage – (Place and detonate a nuclear bomb in the opponents given city)
            <ul>
                <li>
                    General Information – Team #1 starts from Alpha HQ, and Team #2 start 
                    from Charlie HQ Each team starts with one (1) Technician who is responsible 
                    for the main detonation wire and one (1) Ordnance Specialist who is responsible 
                    for the nuclear bomb. Each team will be given the detonation location for the 
                    opposing teams city (where the bomb needs to be placed) at their team HQ prior 
                    to start. Each team will work their way into the other team’s city to place 
                    the nuclear bomb. Once the bomb has been placed in the designated location 
                    and the final master detonation wire placed on the bomb, your team wins. Teams 
                    may not take or move opponent bombs. If the ordnance specialist is shot the bomb 
                    can be taken back with the wounded specialist to their respawn HQ to try again.
                </li>
                <li>
                    The Goal – Place and detonate a nuclear bomb in the opponent’s city.
                </li>
                <li>
                    Respawn/HQ –  Team #1 - Alpha HQ, Team #2 - Charlie HQ.
                </li>
                <li>
                    Needs – Each team requires - one nuclear bomb, one Technician, and one Ordnance Specialist.
                </li>
                <li>
                    Game Time – 25 minutes maximum.
                </li>
                <li>
                    Area of play – Full field map.
                </li>
                <li>
                    Review overall- This is a good strategy game, lots of thinking and 
                    team work required. Teams must work together to get the job done, 
                    complete the mission and win.
                </li>
            </ul>
        </li>
    </ol>
)
const OperationAirstrike = () => (
    <ol start={26} className="ol-rules">
        <li className="li-content-rules">
            Operation Airstrike – (Team #2 needs to locate radio parts, assemble the radio in the 
            communications center, call in an airstrike all in 25 minutes. Team #1 needs to stop them).
            <ul>
                <li>
                    General Information -  Team #1 starts from Alpha HQ and Team #2 starts from Bravo HQ. 
                    Team #2 will act as a special operations team tasked with finding lost radio parts, 
                    putting the radio together in the communications center and calling in an airstrike. 
                    If Team #2 can complete this mission in under 25 minutes, team #2 wins. If Team#1 can 
                    stop Team #2 from completing their task in under 25 minutes allotted, Team #1 wins. 
                    Team #1 cannot touch or take any radio parts.
                </li>

                <li>
                    The Goal – Team #2 is to locate all the missing radio parts and assemble them in the 
                    communication center, then call in an airstrike. All must be done in 25 minutes or 
                    less. Team #1 must stop them by running out the clock, forcing Team #1 over the 25 minutes.
                </li>
                <li>
                    Respawn/HQ –  Team #1 - Alpha HQ, Team #2 – Bravo HQ.
                </li>
                <li>
                    Needs – Radio parts
                </li>
                <li>
                    Game Time – 25 minutes maximum.
                </li>
                <li>
                    Area of play – The HIVE, CDC, Downtown and Supply Depot areas.
                </li>
                <li>
                    Review overall- This is a search out and find strategy game. Great for spectators.
                </li>
            </ul>
        </li>
    </ol>
)
const BrokenArrow = () => (
    <ol start={27} className="ol-rules">
        <li className="li-content-rules">
            Broken Arrow – (A team of US Airsoft Rangers has been cut off and is fighting to survive. 
            They must be at the LZ in fifteen minutes with vital intel or loose. Against overwhelming 
            odds, surrounding and out of time. Can the US Airsoft Rangers complete the mission in time?)
            <ul>
                <li>
                    General Information – This game starts with Team #1 being - US Airsoft Rangers, 
                    made up of a force of approximately 20% of the player of that day. Team #1 will 
                    have two balloons tied on each player, representing life, they have no respawn. 
                    Team #1 will be handpicked evenly from both Camo and Solid teams. These will be 
                    the top players as shown on the leader boards. Team #1 has vital intel and set 
                    for extraction in 15 minutes from a designated Landing Zone (LZ). Team #1 starts 
                    within the downtown area and must hold and be occupying the Landing Zone (LZ 
                    designated outside the Police Station) when time is up in 15 minutes. Team #1 
                    must be in the LZ when the Blackhawk Helicopters are set to extract them in 
                    15-minutes. Team #1 can be all over the area fighting up until 15-minutes. 
                    At 15 minutes sharp anyone not in the LZ is gone and left behind, however 
                    if even one of the Rangers make it to the LZ and is in the LZ alive when 
                    time hit zero, the Rangers wins. Team #2 is the Insurgents, the rest of 
                    the field, 80% of the players for the day. Team #2 starts from multiple 
                    HQ respawn points, surrounding the Rangers from all sides. (Camo players 
                    Alpha HQ respawn, and Solid player Charlie HQ respawn.)
                </li>

                <li>
                    The Goal – Rangers need to survive and be in the LZ when the fifteen 
                    minutes expires, even one Ranger will give them the win. Team #2 
                    needs to take out all the Rangers popping their like balloons, our 
                    keep them out of the LZ for 15 minutes and one second.
                </li>
                <li>
                    Respawn/HQ –  Team #1 Rangers life balloons, Team #2 – Alpha and Charlie HQ.
                </li>
                <li>
                    Needs – 20% of the players for Rangers and two balloons each.
                </li>
                <li>
                    Game Time – 15 minutes maximum.
                </li>
                <li>
                    Area of play – Downtown, The HIVE and CDC areas.
                </li>
                <li>
                    Review overall- This is a fast paced, hard hitting game. Good team 
                    work required, teams must work together to get the job done, 
                    survive and complete the mission.
                </li>
            </ul>
        </li>
    </ol>
)
const Level4Biohazard = () => (
    <ol start={28} className="ol-rules">
        <li className="li-content-rules">
            Level 4 Biohazard – (There is a biohazard level 4 device in the center of the CDC in the 
            Red square containment area).
            <ul>
                <li>
                    General Information – Team #1 starts from Alpha HQ and Team #2 starts from Delta HQ. 
                    At the start of the game, there is a Biohazard level 4 device in the center of the CDC, 
                    Red square containment area. The devise has six color zip ties on it from both teams. 
                    Yellow for camo, and blue for solid. The device cannot be moved out of the red square 
                    containment area without killing everyone on your team. Each team must battle to the 
                    device, cut your teams wires (zip ties) and post your flag at the green posting tube 
                    in the center of the CDC for the win. First team to complete the mission wins.
                </li>

                <li>
                    The Goal – Battle to the center of the CDC, at the red square, pull the 
                    device to your side of the square, cut off all your zip ties, post your 
                    flag at the green posting tube for the win.
                </li>
                <li>
                    Respawn/HQ –  Team #1 Alpha HQ and Team #2 Delta HQ
                </li>
                <li>
                    Needs – The red bomb device, zip tie wires – 6 for each team color.
                </li>
                <li>
                    Game Time – 20 minutes maximum.
                </li>
                <li>
                    Area of play – CDC area.
                </li>
                <li>
                    Review overall- This is a super fast paced game, hard hitting game, with no time to spare.
                </li>
            </ul>
        </li>
    </ol>
)
const OperationFirstStrike = () => (
    <ol start={29} className="ol-rules">
        <li className="li-content-rules">
            Operation First Strike – (US forces Vs Russian forces – The US military is tasked with 
            protecting a major city – HIVE City. The Russians want to start a war, the only wat to 
            do this is to attack a major US city, set off a nuclear explosion. They call this 
            “Operation First Strike”)
            <ul>
                <li>
                    General Information – The game starts out as a peaceful day. US Forces are 
                    strategically placed around the map protecting vital interests. US Forces 
                    have security forces placed at the following: 1. Ryan’s Bridge guarding a 
                    nuclear bomb being transported, 2. Communications center for artillery strikes, 
                    3. The nuclear PG and E power station in HIVE City, 4. The advance medical 
                    center Bravo FOB, and the ICBM Missile silo.  The Russians want to set off a 
                    Nuclear explosion in HIVE city, “Operation First Strike”. To so, they must set 
                    off one of any three devices, 1). Move a Nuclear Bomb into the heart of the HIVE 
                    at City Hall, and detonate it, 2). Disrupt the PG and E nuclear plant and explode 
                    it, and or 3). Take over secure and launch the ICBM missile at the HIVE. Any one 
                    of these methods would create the explosion needed to accomplish their task. 
                    However, time is running out, the Kremlin has given them only 30 minutes to 
                    complete this task of fail. If the Russian can create a nuclear explosion in the 
                    HIVE they win, if the US Forces can prevent this from happening in 30 minutes the 
                    US forces win.
                </li>

                <li>
                    The Goal – US Forces to keep peace, or minimum skirmishes, no war. Russian 
                    Forces are to start a war by setting off a nuclear explosion in the HIVE City.
                </li>
                <li>
                    Respawn/HQ –  US Charlie HQ and Bravo FOB, Russian Alpha HQ, and two FOB flags.
                </li>
                <li>
                    Needs – Nuclear Bomb w/ vehicle, zip ties, PG & E Power, two Russian FOB flags 
                    and one US Forces FOB fag. Grid book for artillery strikes.
                </li>
                <li>
                    Game Time – 30 minutes maximum.
                </li>
                <li>
                    Area of play – Full map.
                </li>
                <li>
                    Review overall- This is a very sophisticated game, that is challenging, fun and 
                    requires lots of team work. Strategic and critical thinking required. Strategy 
                    needs to be applied.
                </li>
            </ul>
        </li>
    </ol>
)
const Detonation = () => (
    <ol start={30} className="ol-rules">
        <li className="li-content-rules">
            Detonation – (“Exploding Pool Filter Game”).
            <ul>
                <li>
                    General Information – Team #1 starts from Alpha HQ with Bravo FOB, 
                    Team #2 starts from Fox HQ with Charlie FOB. Each team will be 
                    given a target area for them to get to and detonate a bomb within 
                    that target area. At the center of the battlefield, end of the wall 
                    is a large mobile bomb. The bomb is 80% intact and needs additional 
                    component parts to make it active. The bomb can move up to 15’ either 
                    way with the control lever placed on mobile, in its current 80% intact 
                    condition it cannot move any further than 15’ or it will detonate. No 
                    further movements can be performed until the bomb has been repaired 
                    with the correct pipe component parts. The component parts are three 
                    2” pipe component pieces, color coded and scattered throughout the 
                    field. Teams must locate the scattered pipe components and apply 
                    them to the bomb. Each pipe component is color coded, so they fit 
                    into a corresponding color receptor on the bomb. The bomb is highly 
                    volatile and must have the pipe components applied only once the control 
                    lever on the top of the bomb has been turned to the corresponding 
                    component color. Once this is done the pipe component can be screwed 
                    into its corresponding color receptor. When all three pipe components 
                    have been successfully applied to the bomb, the bomb becomes 100% intact 
                    and fully mobile. The control lever on the top of the bomb then can be 
                    placed on the mobile position and the bomb can be moved. Prior to moving 
                    the bomb, the control lever must be placed on mobile. Again, the bomb is 
                    very volatile and must not be tipped over while in its transportation 
                    vehicle, if it is tipped over, it will detonate and all players on the 
                    team moving the bomb are dead (you lose). After repairing the bomb to 
                    100% and placing the control lever to mobile, move the bomb to the 
                    target area, once you have arrived, turn the control lever on top of 
                    the bomb to detonation. Protect and hold the bomb in place for one 
                    minute, “Boom” you win. (FOB rules apply)
                </li>

                <li>
                    The Goal – Find, repair and detonate a large bomb at you given target area.
                </li>
                <li>
                    Respawn/HQ –  Team #1 Alpha HQ and Bravo FOB, Team #2 Fox HQ and Charlie FOB.
                </li>
                <li>
                    Needs – Large bomb with cart, all three pipe components, one FOB flag per team.
                </li>
                <li>
                    Game Time – 25 minutes maximum.
                </li>
                <li>
                    Area of play – Full field.
                </li>
                <li>
                    Review overall- This is a strategic style game that requires thought and 
                    team work. Player like this game, plays the entire map. Lots of moving 
                    parts on this game, requires team work and a strategy.
                </li>
            </ul>
        </li>
    </ol>
)
const ZombieAttack = () => (
    <ol start={31} className="ol-rules">
        <li className="li-content-rules">
            Zombie Attack – (The HIVE has sent out a request for help and needs the US Airsoft Rangers, 
            one word was given in the radio call - “ZOMBIES”)
            <ul>
                <li>
                    General Information – There are no respawns, players start inside a dark HIVE City. 
                    Players are the US Airsoft Rangers; the Rangers have been sent into HIVE City to help. 
                    If a Ranger spots a zombie and shoots the zombie, the zombie will become immobile for 
                    10 seconds before coming back to life. These are fast moving zombies and will not 
                    totally die, all you can do is slow them down, you will not be able to eliminate them, 
                    your only chance is run out the clock and survive. Zombies are represented by red glow 
                    sticks. Each Ranger is given a glow stick representing blood, if a Ranger is touched 
                    in anyway by a zombie, that Ranger becomes a Zombies, and breaks their glow stick. 
                    The new zombie will put down his gun and become, and act as a zombie, going after 
                    surviving Rangers (one touch turns a player into a zombie). The Rangers job is to 
                    go into the HIVE and help, survive and wait for extraction in 20 minutes. The game 
                    starts with zombies in HIVE City (zombies are identified by their glowing red glow 
                    sticks), this is the first part of the game, it starts in the HIVE with the HIVE 
                    quarantined for 10 minutes, after 10 minutes the quarantine will be lifted, and 
                    doors of the HIVE will be opened, starting the second part of the game. The second 
                    part of the game will be for the remaining Rangers to somehow survive an additional 
                    10 minutes hidden in the HIVE or outside in the open (total game of 20 minutes). 
                    Any Ranger that has not been infected (touched by a zombie) after 20 minutes is a 
                    survivor and wins the game. Winners will receive US Airsoft Zombie Patches.
                </li>

                <li>
                    The Goal – Survive the Zombie attack, hide, fight, survive for 20 minutes until 
                    extraction.
                </li>
                <li>
                    Respawn/HQ –  No respawn, touch = ZOMBIE
                </li>
                <li>
                    Needs – One red glow stick for each Player. The zombie’s population at the start 
                    should represent 5% of the players, and the zombies glow stick should be broken 
                    to glow, representing a zombie. All glow stick should be worn around the neck, 
                    or in the front area of the player, so it can be seen easily and is not to be 
                    hidden. Zombies should be very visible and not mistaken for Rangers.
                </li>
                <li>
                    Game Time – 20-minute survival.
                </li>
                <li>
                    Area of play – HIVE City.
                </li>
                <li>
                    Review overall- This is a scary, fun game. Requires some strategy and some luck. 
                    Game is only played one time a night on Friday nights. Player must be conning 
                    and fast, must be able to out think the zombies.
                </li>
            </ul>
        </li>
    </ol>
)
const MoneyBag = () => (
    <ol start={32} className="ol-rules">
        <li className="li-content-rules">
            Money Bag – (Teams must find and retrieve the stolen Money Bag).
            <ul>
                <li>
                    General Information – Team #1 starts from Bravo HQ. and Team #2 
                    starts from Charlie HQ.  The money bag is hidden somewhere on 
                    the field. Teams must secure the money bag and get instructions 
                    using the radio attached to the money bag. Once a team has delivered 
                    the money bag safely to the Federal Reserve Officer waiting for the 
                    bag, that team wins.
                </li>
                <li>
                    The Goal – Find and secure and deliver the stolen money bag for the 
                    federal reserve officer.
                </li>
                <li>
                    Respawn/HQ –  Team #1 Bravo HQ and Team #2 Charlie HQ
                </li>
                <li>
                    Needs – Money bag, and radios.
                </li>
                <li>
                    Game Time – 25 minutes maximum.
                </li>
                <li>
                    Area of play – Full map.
                </li>
                <li>
                    Review overall- This is a hunt and find type mission that’s fun to play. 
                    Requires some skill with a radio and knowledge of tactics. Team work and 
                    communications with other players is a big help in this game.
                </li>
            </ul>
        </li>
    </ol>
)
const FuelDepotDemolition = () => (
    <ol start={33} className="ol-rules">
        <li className="li-content-rules">
            Fuel Depot “Demolition” – (Destroy the other teams fuel depot, by blowing the depot up “popping three balloons on each tank, representing destruction”).
            <ul>
                <li>
                    General Information – Team #1 starts from Bravo HQ. and Team #2 starts from Charlie HQ.  At the start of the game, there are three flags placed on the tank at Ryan’s Bridge for team #1 to protect, and three balloons on the tank in the red city for Team #2 to protect. Each team is responsible for protecting their respective fuel depots, not letting their balloons be popped. In addition, each team must try and destroy the other teams fuel depot by popping the balloons on the opposing teams tank. Each team must defend as well as attack. First team to eliminate the balloons from the other team’s fuel depot, wins.
                </li>
                <li>
                    The Goal – Destroy the opposing teams fuel depot, by popping the three balloons attached to the opposing team’s depot, pop all the balloons and win.
                </li>
                <li>
                    Respawn/HQ –  Team #1 Bravo HQ and Team #2 Charlie HQ.
                </li>
                <li>
                    Needs – Three balloons for each fuel depot.
                </li>
                <li>
                    Game Time – 25 minutes maximum.
                </li>
                <li>
                    Area of play – Full field map.
                </li>
                <li>
                    Review overall- This is a fast-paced game, teams must defend as well as assault. Strategy is required and communication with team work a plus. Great game, fun and exciting.
                </li>
            </ul>
        </li>
    </ol>
)


export default Gametypes;