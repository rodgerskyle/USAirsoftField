import React, { Component } from 'react';

import { Container, Row, Col, Spinner, ProgressBar } from 'react-bootstrap/';


import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

import { withAuthorization } from '../session';

import { BrowserView, MobileView } from 'react-device-detect';

import { withFirebase } from '../Firebase';

import rankimages from '../constants/rankimgs';

import ranks from '../constants/ranks';

import rankincrements from '../constants/rankincrements';

import { makeStyles } from '@material-ui/core/styles';

import { IconButton } from '@material-ui/core';
import { ArrowBackIos, ArrowForwardIos } from '@material-ui/icons';

class RankProgress extends Component {
    constructor(props) {
        super(props);

        this.state = {
            images: rankimages,
            rank: '',
            rankindex: 0,
            rankprogress: 0,
            authUser: null,
            loading: true,
            page: 0,
            matches: null,
        };
    }

    componentDidMount() {
        //Figure out rank logic here
        this.authSubscription = this.props.firebase.auth.onAuthStateChanged((user) => {
            // grab points and profile
            this.getMatchHistory(user)
        });
    }

    componentWillUnmount() {
        //this.props.firebase.user(this.state.authUser.uid).off();
        this.authSubscription();
        this.props.firebase.user(this.state.authUser.uid).off()
    }


    // grabs match history for the user and returns the object with the necessary information
    getMatchHistory(user) {
        this.props.firebase.user(user.uid).on('value', (obj) => {
            const matchObj = obj.val().games
            let matches = null;
            if (matchObj) {
                matches = Object.keys(matchObj).map((key) => ({
                    ...matchObj[key],
                    date: key,
                }))
            }
            this.setState({matches, authUser: obj.val()}, () => {
                this.getRank();
            })
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
        this.setState({ rankindex: index, page: Math.floor(index/4) })
        let num = points - rankincrements[index]
        let end = rankincrements[index+1 <= this.state.images.length ? index + 1 : index]
        this.setState({rankprogress: num / (end - rankincrements[index]), loading: false})
    }

    //Function to go back on ranks displayed
    previous() {
        if (this.state.page > 0)
            this.setState({page: this.state.page-1})
    }

    //Function to go forward on ranks displayed
    next() {
        if (this.state.page < 5)
            this.setState({page: this.state.page+1})
    }

    render() {
        const {images, rankindex, rankprogress, loading, page, matches, authUser} = this.state;
        const curRankPoints = rankincrements[rankindex]
        const nextRankPoints = rankincrements[rankindex+1 <= images.length ? rankindex + 1 : rankindex]
        return (
                    <div className="background-static-rp">
                    {loading ?
                        <Row className="spinner-standard">
                            <Spinner animation="border" />
                        </Row>
                        :
                        <div>
                        <Container>
                            <div>
                                <Row className="row-title-rp">
                                    <Col md={4} className="padding-0">
                                        <p className="p-page-title-rp">RANK PROGRESSION</p>
                                    </Col>
                                </Row>
                                <Row className="row-parent-rp">
                                    <Col md={4}>
                                        <Row className="row-points-rp">
                                            <Col>
                                                <Row className="justify-content-row padding-5px">
                                                    <p className="p-rank-title-rp">{`${authUser.points} points`}</p>
                                                </Row>
                                            </Col>
                                        </Row>
                                        <Row className="row-cur-rank-rp">
                                            <Col>
                                                <Row className="justify-content-row">
                                                    <p className="p-rank-title-rp">Current Rank</p>
                                                </Row>
                                                <Row className="justify-content-row">
                                                    <img src={images.length !== 0 ? images[rankindex] : null}
                                                        alt="Players rank" />
                                                </Row>
                                                <Row className="justify-content-row">
                                                    <p className="p-rank-title-rp">{ranks[rankindex]}</p>
                                                </Row>
                                            </Col>
                                        </Row>
                                        <Row className="row-next-rank-rp">
                                            <Col>
                                                <Row className="justify-content-row">
                                                    <p className="p-rank-title-rp">Next Rank</p>
                                                </Row>
                                                <Row className="justify-content-row">
                                                    <img src={images.length !== 0 ? images[rankindex+1 <= images.length ? rankindex + 1 : rankindex] : null}
                                                        alt="Players rank" />
                                                </Row>
                                                <Row className="justify-content-row">
                                                    <p className="p-rank-title-rp">{ranks[rankindex+1 <= images.length ? rankindex + 1 : rankindex]}</p>
                                                </Row>
                                                <Row className="row-progress-bar-rp">
                                                    <ProgressBar now={rankprogress*100} label={`${rankprogress*100}%`}/>
                                                </Row>
                                                <Row className="justify-content-row">
                                                    <p className="p-rank-progress-rp">{`${ (nextRankPoints - curRankPoints) - (authUser.points - curRankPoints)} / 
                                                    ${nextRankPoints - curRankPoints} 
                                                    points needed in order to rank up.`}
                                                    </p>
                                                </Row>
                                            </Col>
                                        </Row>
                                        <Row className="row-points-rp">
                                            <Col>
                                                <Row className="justify-content-row padding-5px">
                                                    <p className="p-rank-title-rp">{`
                                                    ${450 * Math.ceil(authUser.points / 450) - authUser.points} 
                                                    more points needed for a free game.`}</p>
                                                </Row>
                                            </Col>
                                        </Row>
                                    </Col>
                                    <Col md={8}>
                                        <RankList images={images.slice((page) * 4, ((page) * 4) + 4 )} ranks={ranks} page={page}
                                        prev={this.previous.bind(this)} next={this.next.bind(this)} rankincs={rankincrements} rankindex={rankindex}/>
                                        <MatchHistory matches={matches} user={authUser}/>
                                    </Col>
                                </Row>
                            </div>
                        </Container>
                        </div>}
                    </div>
        )
    }
}

// Shows the various ranks that you can get as well as the points needed to get to that rank
function RankList({images, ranks, rankincs, next, prev, page, rankindex}) {
    return(
        <div>
            <MobileView>
                <Row className="justify-content-row">
                    <Col className="col-navigation-rp col-navigation-left-rp">
                        <IconButton aria-label="previous" onClick={() => prev()} disabled={page === 0}>
                            <ArrowBackIos />
                        </IconButton>
                    </Col>
                    <Col className="col-navigation-rp col-navigation-right-rp">
                        <IconButton aria-label="next" onClick={() => next()} disabled={page === 6}>
                            <ArrowForwardIos />
                        </IconButton>
                    </Col>
                </Row>
            </MobileView>
            <Row>
                <Col md={2} className="col-navigation-rp col-navigation-left-rp">
                    <BrowserView>
                        <IconButton aria-label="previous" onClick={() => prev()} disabled={page === 0}>
                            <ArrowBackIos />
                        </IconButton>
                    </BrowserView>
                </Col>
                {images.map((image, i) => (
                    <Col md={2} className={rankindex === i + (page*4) ? "col-your-rank-rp" : "col-rank-icon-rp"} key={i}>
                        <Row className="justify-content-row">
                            <img src={image} alt={ranks[i + (page*4)]}/>
                        </Row>
                        <Row className="justify-content-row">
                            <p className="p-ranks-rp">{rankincs[i + (page*4)]}</p>
                        </Row>
                        <Row className="justify-content-row">
                            <p className="p-ranks-rp">{ranks[i + (page*4)]}</p>
                        </Row>
                    </Col>
                ))}
                <Col md={2} className="col-navigation-rp col-navigation-right-rp">
                    <BrowserView>
                        <IconButton aria-label="next" onClick={() => next()} disabled={page === 6}>
                            <ArrowForwardIos />
                        </IconButton>
                    </BrowserView>
                </Col>
            </Row>
        </div>
    )
}

// Shows the users match history
function MatchHistory({matches}) {
    const useStyles = makeStyles({
        table: {
            padding: '2px 4px',
        },
        container: {
            maxHeight: 365,
          },
    })

    const classes = useStyles();

    return(
        <div>
            <Row>
                <Col md={2}>
                </Col>
                <Col md={8} className="col-match-history-rp">
                    <Row className="justify-content-row">
                        <p className="p-match-history-title-rp">
                            Match History
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
                                                {day.date}
                                            </TableCell>
                                            <TableCell align="center">{day.wins}</TableCell>
                                            <TableCell align="center">{day.losses}</TableCell>
                                            <TableCell align="center">{day.wins*10 + day.losses*3}</TableCell>
                                        </TableRow>
                                    )): 
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

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(RankProgress));