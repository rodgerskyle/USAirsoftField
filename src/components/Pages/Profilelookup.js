import React, { Component } from 'react';

import { Container, Row, Col, Spinner } from 'react-bootstrap/';

import logo from '../../assets/logo.png';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

import { Link } from 'react-router-dom';

import default_profile from '../../assets/default.png';

import { withFirebase } from '../Firebase';

import rankimages from '../constants/rankimgs';

import ranks from '../constants/ranks';

import rankincrements from '../constants/rankincrements';

import { makeStyles } from '@material-ui/core/styles';

import { CircularProgress, Slide } from '@material-ui/core';
import { isMobile } from 'react-device-detect';

class ProfileLookup extends Component {
    constructor(props) {
        super(props);

        this.state = {
            images: rankimages,
            rank: '',
            rankindex: 0,
            rankprogress: 0,
            profileicon: null,
            authUser: null,
            loading: true,
            matches: null,
            activePage: 0,
            prevPage: 0,
        };
    }

    componentDidMount() {
        //Figure out rank logic here
        this.props.firebase.user(this.props.match.params.id).on('value', snapshot => {
            const user = snapshot.val();
            user.uid = this.props.match.params.id

            this.getMatchHistory(user)
        });
    }

    componentWillUnmount() {
        this.props.firebase.user(this.props.match.params.id).off();
    }

    // grabs match history for the user and returns the object with the necessary information
    getMatchHistory(user) {
        if (user.profilepic)
            this.getProfile(`${user.uid}/profilepic`);
        else
            this.setState({ profileicon: default_profile })
        const matchObj = user.games
        let matches = null;
        if (matchObj) {
            matches = Object.keys(matchObj).map((key) => ({
                ...matchObj[key],
                date: key,
            }))
        }
        this.setState({ matches, authUser: user }, () => {
            this.getRank();
        })
    }


    //Get image function for profile image = uid
    getProfile(uid) {
        this.props.firebase.pictures(`${uid}.png`).getDownloadURL().then((url) => {
            this.setState({ profileicon: url })
        })
    }

    //Figuring out rank logic
    getRank() {
        var points = this.state.authUser.points;
        var index = 1;
        if (points < 125) {
            index = 1;
        }
        else if (points < 225) {
            index = 2;
        }
        else if (points < 335) {
            index = 3;
        }
        else if (points < 450) {
            index = 4;
        }
        else if (points < 570) {
            index = 5;
        }
        else if (points < 690) {
            index = 6;
        }
        else if (points < 820) {
            index = 7;
        }
        else if (points < 960) {
            index = 8;
        }
        else if (points < 1110) {
            index = 9;
        }
        else if (points < 1270) {
            index = 10;
        }
        else if (points < 1440) {
            index = 11;
        }
        else if (points < 1640) {
            index = 12;
        }
        else if (points < 1840) {
            index = 13;
        }
        else if (points < 2090) {
            index = 14;
        }
        else if (points < 2340) {
            index = 15;
        }
        else if (points < 2615) {
            index = 16;
        }
        else if (points < 2890) {
            index = 17;
        }
        else if (points < 3190) {
            index = 18;
        }
        else if (points < 3490) {
            index = 19;
        }
        else if (points < 3790) {
            index = 20;
        }
        else if (points < 4115) {
            index = 21;
        }
        else if (points < 4500) {
            index = 22;
        }
        else {
            index = 23;
        }
        index--;
        this.setState({ rankindex: index, page: Math.floor(index / 4) })
        let num = points - rankincrements[index]
        let end = rankincrements[index + 1 <= this.state.images.length ? index + 1 : index]
        this.setState({ rankprogress: num / (end - rankincrements[index]), loading: false })
    }

    render() {
        const { images, rankindex, rankprogress, loading, matches, authUser, profileicon, activePage, prevPage } = this.state;
        const curRankPoints = rankincrements[rankindex]
        const nextRankPoints = rankincrements[rankindex + 1 <= images.length ? rankindex + 1 : rankindex]
        return (
            <div className="background-static-rp">
                {loading ?
                    <Row className="spinner-standard">
                        <Spinner animation="border" />
                    </Row>
                    :
                    <div style={{ overflowX: 'hidden' }}>
                        <Container>
                            <div>
                                <div className="div-profile-main-p">
                                    <Row className="row-profile-main-p">
                                        <Col md={"auto"} className={isMobile ? "col-mobile-profile-pic-p" : "col-profile-pic-p"}>
                                            <img src={profileicon} alt="personal profile" className="img-profile-p" />
                                        </Col>
                                        <Col className="col-details-p">
                                            <Row className="row-username-p">
                                                {authUser.username}
                                            </Row>
                                            <Row className="row-details-p">
                                                <span className="span-details-p" style={{ marginRight: 31 }}>NAME:&nbsp;</span>
                                                <p className="p-details-p">
                                                    {authUser.name}
                                                </p>
                                            </Row>
                                            <Row className="row-details-p">
                                                <span className="span-details-p">RENEWAL:&nbsp;</span>
                                                <p className="p-details-p">
                                                    {authUser.renewal}
                                                </p>
                                            </Row>
                                            <Row className="row-details-p">
                                                <span className="span-details-p" style={{ marginRight: 33 }}>TEAM:&nbsp;</span>
                                                {authUser.team !== "" ?
                                                    <Link className="p-details-p" to={"/teams/" + authUser.team}>{authUser.team.toUpperCase()}</Link> : "N/A"}
                                            </Row>
                                        </Col>
                                    </Row>
                                </div>
                                <Row style={{ paddingTop: 10 }} className={isMobile ? 'justify-content-row' : ''}>
                                    <p className={activePage === 0 ? "p-nav-profile-active" : "p-nav-profile"}
                                        onClick={() => setTimeout(() => {
                                            this.setState({ activePage: 0 }, () => {
                                                setTimeout(() => { this.setState({ prevPage: 0 }) }, 100)
                                            })
                                        }, 150)}>
                                        PROFILE
                                        </p>
                                    <p className={activePage === 1 ? "p-nav-profile-active" : "p-nav-profile"}
                                        onClick={() => setTimeout(() => {
                                            this.setState({ activePage: 1 }, () => {
                                                setTimeout(() => { this.setState({ prevPage: 1 }) }, 100)
                                            })
                                        }, 150)}>
                                        PROGRESSION
                                        </p>
                                    <p className={activePage === 2 ? "p-nav-profile-active" : "p-nav-profile"}
                                        onClick={() => setTimeout(() => {
                                            this.setState({ activePage: 2 }, () => {
                                                setTimeout(() => { this.setState({ prevPage: 2 }) }, 100)
                                            })
                                        }, 150)}>
                                        GAME FEED
                                        </p>
                                    <p className={activePage === 3 ? "p-nav-profile-active" : "p-nav-profile"}
                                        onClick={() => setTimeout(() => {
                                            this.setState({ activePage: 3 }, () => {
                                                setTimeout(() => { this.setState({ prevPage: 3 }) }, 100)
                                            })
                                        }, 150)}>
                                        BADGES
                                        </p>
                                </Row>
                                <div style={{ paddingTop: 10 }}>
                                    {activePage === 0 ?
                                        <Slide direction={"right"} in={true} mountOnEnter unmountOnExit>
                                            <Row>
                                                <Col md={4}>
                                                    <div className="div-stats-box-profile">
                                                        <Row className="justify-content-row">
                                                            <p className="p-title-stats-box-profile">{"Wins:"}</p>
                                                        </Row>
                                                        <Row className="justify-content-row">
                                                            <p className="p-stats-box-profile">{authUser.wins}</p>
                                                        </Row>
                                                    </div>
                                                    <div className="div-stats-box-profile">
                                                        <Row className="justify-content-row">
                                                            <p className="p-title-stats-box-profile">{"Losses:"}</p>
                                                        </Row>
                                                        <Row className="justify-content-row">
                                                            <p className="p-stats-box-profile">{authUser.losses}</p>
                                                        </Row>
                                                    </div>
                                                    <div className="div-stats-box-profile">
                                                        <Row className="justify-content-row">
                                                            <p className="p-title-stats-box-profile">{"Win Percentage:"}</p>
                                                        </Row>
                                                        <Row className="justify-content-row">
                                                            <p className="p-stats-box-profile">{`${Math.ceil(authUser.wins / (authUser.losses + authUser.wins) * 100)}%`}</p>
                                                        </Row>
                                                    </div>
                                                </Col>
                                                <Col md={4} className="col-rank-box-profile">
                                                    <img style={{ width: '100%' }} src={images[rankindex]}
                                                        alt="Players rank" />
                                                </Col>
                                                <Col md={4}>
                                                    <div className="div-stats-box-profile">
                                                        <Row className="justify-content-row">
                                                            <p className="p-title-stats-box-profile">{"Points:"}</p>
                                                        </Row>
                                                        <Row className="justify-content-row">
                                                            <p className="p-stats-box-profile">{authUser.points}</p>
                                                        </Row>
                                                    </div>
                                                    <div className="div-stats-box-profile">
                                                        <Row className="justify-content-row">
                                                            <p className="p-title-stats-box-profile">{"Badges:"}</p>
                                                        </Row>
                                                        <Row className="justify-content-row">
                                                            <p className="p-stats-box-profile">{"Coming soon..."}</p>
                                                        </Row>
                                                    </div>
                                                    <div className="div-stats-box-profile" style={{ marginBottom: '1rem' }}>
                                                        <Row className="justify-content-row">
                                                            <p className="p-title-stats-box-profile">{"Free Games:"}</p>
                                                        </Row>
                                                        <Row className="justify-content-row">
                                                            <p className="p-stats-box-profile">{authUser.freegames}</p>
                                                        </Row>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Slide> : null}
                                    {activePage === 1 ?
                                        <Slide direction={prevPage < 1 ? "left" : "right"} in={true} mountOnEnter unmountOnExit>
                                            <Row style={{paddingTop: '1rem'}}>
                                                <Col md={4}>
                                                    <Row className="justify-content-row row-rank-progress-profile" style={{ alignItems: 'center' }}>
                                                        <CircularProgress value={100} variant={"determinate"} size={200} className="cp-static-profile" />
                                                        <CircularProgress value={rankprogress * 100} variant={"determinate"} size={200} />
                                                        <div style={{ position: 'absolute' }}>
                                                            <Row className="justify-content-row">
                                                                <img src={images.length !== 0 ? images[rankindex] : null}
                                                                    alt="Players rank" />
                                                            </Row>
                                                            <Row className="justify-content-row">
                                                                <p className="p-rank-title-rp">{ranks[rankindex]}</p>
                                                            </Row>
                                                        </div>
                                                    </Row>
                                                    <Row className="justify-content-row" style={{ marginTop: '1rem' }}>
                                                        <p className="p-title-stats-box-profile">{`${rankindex+1 < images.length ? 
                                                            (rankprogress * 100).toFixed(2) : 100}% | ${authUser.points -
                                                            (rankindex + 1 < images.length ? curRankPoints : 0)} points`}</p>
                                                    </Row>
                                                    <div className="row-rank-progress-profile">
                                                        <p className="p-rank-title-profile">Next Rank</p>
                                                    </div>
                                                    <Row className="justify-content-row">
                                                        <img src={images[rankindex + 1 < images.length ? rankindex + 1 : rankindex]}
                                                            alt="Players rank" />
                                                    </Row>
                                                    <Row className="justify-content-row">
                                                        <p className="p-next-rank-title-rp">{ranks[rankindex + 1 < images.length ? rankindex + 1 : rankindex]}</p>
                                                    </Row>
                                                    {rankindex + 1 < images.length ?
                                                        <Row className="justify-content-row">
                                                            <p className="p-rank-progress-rp">
                                                                {`Points Needed: ${(nextRankPoints - curRankPoints) - (authUser.points - curRankPoints)} `}
                                                            </p>
                                                        </Row> : null}
                                                </Col>
                                                <Col md={8} className="col-center-middle">
                                                    <div>
                                                        <Row className="row-rank-category-title">
                                                            <p className="p-rank-category-title">
                                                                ENLISTED RANKS
                                                            </p>
                                                        </Row>
                                                        <RankList images={images.slice((0) * 6, ((0) * 6) + 6)} ranks={ranks} page={0}
                                                            rankincs={rankincrements} rankindex={rankindex} />
                                                        <RankList images={images.slice((1) * 6, ((1) * 6) + 6)} ranks={ranks} page={1}
                                                            rankincs={rankincrements} rankindex={rankindex} />
                                                        <Row className="row-officer-rank-category-title">
                                                            <p className="p-rank-category-title">
                                                                OFFICER RANKS
                                                            </p>
                                                        </Row>
                                                        <RankList images={images.slice((2) * 6, ((2) * 6) + 6)} ranks={ranks} page={2}
                                                            rankincs={rankincrements} rankindex={rankindex} />
                                                        <RankList images={images.slice((3) * 6, ((3) * 6) + 6)} ranks={ranks} page={3}
                                                            rankincs={rankincrements} rankindex={rankindex} />
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Slide> : null}
                                    {activePage === 2 ?
                                        <Slide direction={prevPage < 2 ? "left" : "right"} in={true} mountOnEnter unmountOnExit>
                                            <div>
                                                <MatchHistory matches={matches} user={authUser} />
                                            </div>
                                        </Slide> : null}
                                    {activePage === 3 ?
                                        <Slide direction={"left"} in={true} mountOnEnter unmountOnExit>
                                            <Row>
                                                <Col className="col-center-middle">
                                                    <p className="p-stats-box-profile">{"Coming soon..."}</p>
                                                    <img src={logo} alt="US Airsoft logo" className="small-logo-home" />
                                                </Col>
                                            </Row>
                                        </Slide> : null}
                                </div>
                            </div>
                        </Container>
                    </div>}
            </div>
        )
    }
}

// Shows the various ranks that you can get as well as the points needed to get to that rank
function RankList({ images, ranks, rankincs, page, rankindex }) {
    return (
        <div>
            <Row>
                {images.map((image, i) => (
                    <Col md={2} className={rankindex === i + (page * 6) ? "col-your-rank-rp" : "col-rank-icon-rp"} key={i}>
                        <Row className="justify-content-row">
                            <img src={image} alt={ranks[i + (page * 6)]} />
                        </Row>
                        <Row className="justify-content-row">
                            <p className="p-ranks-rp">{rankincs[i + (page * 6)]}</p>
                        </Row>
                        <Row className="justify-content-row">
                            <p className="p-ranks-rp">{ranks[i + (page * 6)]}</p>
                        </Row>
                    </Col>
                ))}
            </Row>
        </div>
    )
}

// Shows the users match history
function MatchHistory({ matches }) {
    const useStyles = makeStyles({
        table: {
            padding: '2px 4px',
        },
        container: {
            maxHeight: 365,
        },
    })

    function convert(date) {
        let array = date.split('-')
        array[1] = +array[1] + 1
        return array.join('-')
    }

    const classes = useStyles();

    return (
        <div>
            <Row style={{ paddingRight: 15, paddingLeft: 15 }}>
                <Col className="col-match-history-rp">
                    <Row className="justify-content-row">
                        <p className="p-match-history-title-rp">
                            Game Feed
                        </p>
                    </Row>
                    <Row className="row-table-match-history-rp">
                        <TableContainer component={Paper} className={classes.container}>
                            <Table stickyHeader className={classes.table} aria-label="match history table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell align="center">Wins</TableCell>
                                        <TableCell align="center">Losses&nbsp;</TableCell>
                                        <TableCell align="center">Points&nbsp;</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {matches ?
                                        matches.map((day) => (
                                            <TableRow key={day.date}>
                                                <TableCell component="th" scope="row">
                                                    {convert(day.date)}
                                                </TableCell>
                                                <TableCell align="center">{day.wins}</TableCell>
                                                <TableCell align="center">{day.losses}</TableCell>
                                                <TableCell align="center">{day.wins * 10 + day.losses * 3}</TableCell>
                                            </TableRow>
                                        )) :
                                        <TableRow>
                                            <TableCell colspan={5} className="p-rank-title-rp">Scan games to see your match history!</TableCell>
                                        </TableRow>
                                    }
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Row>
                </Col>
            </Row>
        </div>
    )
}

export default withFirebase(ProfileLookup);