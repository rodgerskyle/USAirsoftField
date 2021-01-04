import React, { Component } from 'react';
import { Table } from 'react-bootstrap/';
import '../../App.css';

import { Container, Row, Col, Pagination, OverlayTrigger, Tooltip, Spinner, Dropdown } from 'react-bootstrap/';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';

import ranks from '../constants/ranks';
import rankimages from '../constants/smallrankimgs';
import Td from '../constants/td';
import * as ROLES from '../constants/roles';

import CustomToggle from '../constants/customtoggle'
import CustomMenu from '../constants/custommenu'

import { withFirebase } from '../Firebase';

class Leaderboards extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: false,
            users: [],
            displayUsers: [],
            getRankState: this.getRank,
            monthly: false,
            currentMonth: new Date().getMonth(),
            currentYear: new Date().getFullYear(),
            thisMonth: "",
            lastMonth: "",
            curPage: 1,
            numPages: 0,
            usersPerPage: 50,
            months: null,
        };
        this.handleClick = this.handleClick.bind(this);
        this.handleLastClick = this.handleLastClick.bind(this);
        this.handleFirstClick = this.handleFirstClick.bind(this);
    }

    //Figuring out rank logic
    getRank(points) {
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
        return index;
    }
    
    //Grabbing month and storing it
    getMonths(month) {
        if (month === 1)
            this.setState({thisMonth: "January", lastMonth: "December"})
        else if (month === 2)
            this.setState({thisMonth: "February", lastMonth: "January"})
        else if (month === 3)
            this.setState({thisMonth: "March", lastMonth: "February"})
        else if (month === 4)
            this.setState({thisMonth: "April", lastMonth: "March"})
        else if (month === 5)
            this.setState({thisMonth: "May", lastMonth: "April"})
        else if (month === 6)
            this.setState({thisMonth: "June", lastMonth: "May"})
        else if (month === 7)
            this.setState({thisMonth: "July", lastMonth: "June"})
        else if (month === 8)
            this.setState({thisMonth: "August", lastMonth: "July"})
        else if (month === 9)
            this.setState({thisMonth: "September", lastMonth: "August"})
        else if (month === 10)
            this.setState({thisMonth: "October", lastMonth: "September"})
        else if (month === 11)
            this.setState({thisMonth: "November", lastMonth: "October"})
        else if (month === 12)
            this.setState({thisMonth: "December", lastMonth: "November"})
    }

    //Pagination Logic
    handleClick(val) {
        this.setState({
            curPage: val
        });
    }

    handleLastClick(event) {
        event.preventDefault();
        this.setState({
            curPage: this.state.numPages
        });
    }
    handleFirstClick(event) {
        event.preventDefault();
        this.setState({
            curPage:1
        });
    }

    componentDidMount() {
        this.setState({ loading: true });
        this.getMonths(parseInt(new Date().getMonth().toLocaleString()) + 1)
        let date = new Date();

        let months = [];
        months.push("January")
        months.push("February")
        months.push("March")
        months.push("April")
        months.push("May")
        months.push("June")
        months.push("July")
        months.push("August")
        months.push("September")
        months.push("October")
        months.push("November")
        months.push("December")
        this.setState({months})

        let years = [];
        for(let i=2020; i<date.getFullYear()+1; i++) {
            years.push(i)
        }
        this.setState({years, currentYear: date.getFullYear()})

        this.props.firebase.users().on('value', snapshot => {
            const usersObject = snapshot.val();

            let usersList = Object.keys(usersObject).map(key => ({
                ...usersObject[key],
                uid: key,
            }));

            usersList = usersList.filter(obj => typeof(obj.roles) === 'undefined' || !obj.roles[ROLES.WAIVER])

            this.setState({
                users: usersList.sort((a,b) => (a.points < b.points ? 1 : -1)),
                loading: false,
                numPages: Math.ceil(usersList.length/this.state.usersPerPage)
            });
        });
    }

    componentWillUnmount() {
        this.props.firebase.users().off();
    }

    // Current month sorting
    sortArray(a, b, month, year) {
        let a_points = 0;
        let b_points = 0;
        if (typeof a.games !== 'undefined') {
            Object.keys(a.games).forEach((date) => {
                let l_date = date.split('-')
                if (parseInt(l_date[1]) === month && parseInt(l_date[0]) === year) {
                    a_points += a.games[date].wins*10 + a.games[date].losses*3
                }
            })
        }
        if (typeof b.games !== 'undefined') {
            Object.keys(b.games).forEach((date) => {
                let l_date = date.split('-')
                if (parseInt(l_date[1]) === month && parseInt(l_date[0]) === year) {
                    b_points += b.games[date].wins*10 + b.games[date].losses*3
                }
            })
        }
        return a_points > b_points ? -1 : 1
    }


    render() {
        const { users, loading, getRankState, numPages, curPage, currentMonth, usersPerPage, currentYear, months, years } = this.state;

        return (
            <div className="background-static-lb">
                <Container className="leaderboard-page">
                    <Row className="row-header-lb">
                        <Col xs="auto" className="col-header-lb vertical-divider-col-lb">
                            <h2 className="page-header-lb">Leaderboards</h2>
                        </Col>
                        <Col>
                            <Row className="button-right-lb">
                                <BootstrapSwitchButton
                                    checked={!this.state.monthly}
                                    onstyle="dark"
                                    width={120}
                                    onlabel='All Time'
                                    offlabel='Monthly'
                                    onChange={() => {
                                        if (this.state.monthly) {
                                            this.setState({ 
                                                monthly: !this.state.monthly, 
                                                users: users.sort((a,b) => (a.points < b.points ? 1 : -1))
                                            })
                                        }
                                        else
                                            this.setState({ 
                                                monthly: !this.state.monthly,
                                                currentMonth: new Date().getMonth(),
                                                //users: users.sort((a,b) => (a.cmwins*10 + a.cmlosses*3 < b.cmwins*10 + b.cmlosses*3 ? 1 : -1))
                                                users: users.sort((a,b) => this.sortArray(a,b, currentMonth, currentYear))
                                            })
                                    }}
                                />
                            </Row>
                        </Col>
                        <Col className="pagination-col-lb">
                            <Pagination>
                                <Pagination.First onClick={this.handleFirstClick}/>
                                <Pagination.Prev onClick={() => {this.handleClick(curPage-1)}} disabled={curPage === 1}/>
                                {curPage-1 >= 1 ? 
                                <Pagination.Item onClick={() => {this.handleClick(curPage-1)}}>{curPage-1}</Pagination.Item> 
                                : null}
                                <Pagination.Item active>{curPage}</Pagination.Item>
                                {curPage+1 <= numPages ? 
                                <Pagination.Item onClick={() => {this.handleClick(curPage+1)}}>{curPage+1}</Pagination.Item> 
                                : null}
                                <Pagination.Next onClick={() => {this.handleClick(curPage+1)}} disabled={curPage === numPages}/>
                                <Pagination.Last onClick={this.handleLastClick}/>
                            </Pagination>
                        </Col>
                    </Row>
                    {this.state.monthly === true ?
                    <Row className="row-dropdown-months-lb">
                        <Col xs={"auto"}>
                            <Dropdown className="dropdown-lb">
                                <Dropdown.Toggle as={CustomToggle} id="dropdown-custom-components">
                                Month: {months[currentMonth]}
                                </Dropdown.Toggle>
                                <Dropdown.Menu as={CustomMenu} className="dropdown-waiverlookup">
                                    {months.map((month, i) => (
                                        <Dropdown.Item key={i} eventKey={i} active={i===currentMonth}
                                        onClick={() => this.setState({
                                            currentMonth: i, 
                                            users: users.sort((a,b) => this.sortArray(a,b, month, currentYear))
                                        })}>
                                            {month}
                                        </Dropdown.Item>
                                    ))}
                                </Dropdown.Menu>
                            </Dropdown>
                        </Col>
                        <Col xs={"auto"}>
                            <Dropdown className="dropdown-lb">
                                <Dropdown.Toggle as={CustomToggle} id="dropdown-custom-components">
                                Year: {currentYear}
                                </Dropdown.Toggle>
                                <Dropdown.Menu as={CustomMenu} className="dropdown-waiverlookup">
                                    {years.map((year, i) => (
                                        <Dropdown.Item eventKey={i} key={i} active={year===currentYear}
                                        onClick={() => this.setState({
                                            currentYear: year,
                                            users: users.sort((a,b) => this.sortArray(a,b, currentMonth, year))
                                        })}>
                                            {year}
                                        </Dropdown.Item>
                                    ))}
                                </Dropdown.Menu>
                            </Dropdown>
                        </Col>
                    </Row> : null}
                    {loading ? 
                    <Row className="justify-content-row">
                        <Spinner animation="border" />
                    </Row>  :
                    <Row>
                        <UserList users={users.slice((curPage-1) * usersPerPage, ((curPage-1) * usersPerPage) + usersPerPage )} getRank={getRankState} 
                        monthly={this.state.monthly} currentMonth={currentMonth} currentYear={currentYear} start={usersPerPage * (curPage-1)} /> 
                    </Row> 
                    }
                </Container>
            </div>
        );
    }
}


function UserList ({users, getRank, monthly, currentMonth, currentYear, start }) {
    return (
        <Table className="table table-striped table-dark table-lb">
            <thead className="header-lb">
                <tr>
                    <th scope="col" className="header-th-lb">#</th>
                    <th scope="col" className="header-th-lb">Rank</th>
                    <th scope="col" className="header-th-lb">Name</th>
                    <th scope="col" className="header-th-lb">Wins</th>
                    <th scope="col" className="header-th-lb">Losses</th>
                    <th scope="col" className="header-th-lb">Points</th>
                </tr>
            </thead>
            <tbody className="tbody-lb">
                {users
                .map((user, i) => (
                    <tr key={user.uid}>
                        <Td cl="td-lb" scope="row"><p className={i + start ===0 ? "firstPlace" : (i + start ===1 ? "secondPlace" : (i + start ===2 ? "thirdPlace" : "p-rank-leaderboard"))}>
                        {i + start + 1}</p></Td>
                        <Td cl="td-lb">
                            <OverlayTrigger
                            transition={false}
                            key='top'
                            placement='top'
                            overlay={
                                <Tooltip id={`tooltip-top`}>
                                    {ranks[getRank(user.points)]}
                                </Tooltip>
                            }
                            >
                                <img src={rankimages.length !== 0 ? rankimages[getRank(user.points)] : null}
                                alt="Player Rank" className="rank-image-lb"/>
                            </OverlayTrigger>
                        </Td>
                        <Td cl="profilelink-lb td-lb" to={'/profilelookup/' + user.uid} ct="link-td-lb">{user.name}</Td>
                        <Td cl="wins-lb td-lb">
                            {monthly ? (countWins(user, currentMonth, currentYear)) : user.wins}
                        </Td>
                        <Td cl="losses-lb td-lb">
                            {monthly ? (countLosses(user, currentMonth, currentYear)) : user.losses}
                        </Td>
                        <Td cl="td-lb">
                            {monthly ? (countPoints(user, currentMonth, currentYear)) : user.points}
                        </Td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}


// Count points given object, for match history
function countPoints(obj, month, year) {
    let points = 0;
    if (typeof obj.games !== 'undefined') {
        Object.keys(obj.games).forEach((date) => {
            let l_date = date.split('-')
            if (parseInt(l_date[1]) === month && parseInt(l_date[0]) === year) {
                points += obj.games[date].wins*10 + obj.games[date].losses*3
            }
        })
    }
    return points
}

// Count wins given object, for match history
function countWins(obj, month, year) {
    let wins = 0;
    if (typeof obj.games !== 'undefined') {
        Object.keys(obj.games).forEach((date) => {
            let l_date = date.split('-')
            if (parseInt(l_date[1]) === month && parseInt(l_date[0]) === year) {
                wins += obj.games[date].wins
            }
        })
    }
    return wins
}

// Count losses given object, for match history
function countLosses(obj, month, year) {
    let losses = 0;
    if (typeof obj.games !== 'undefined') {
        Object.keys(obj.games).forEach((date) => {
            let l_date = date.split('-')
            if (parseInt(l_date[1]) === month && parseInt(l_date[0]) === year) {
                losses += obj.games[date].losses
            }
        })
    }
    return losses
}

export default withFirebase(Leaderboards);