import React, { Component } from 'react';
import { Table } from 'react-bootstrap/';
import '../../App.css';

import { Container, Row, Col, Pagination } from 'react-bootstrap/';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';

import rankimages from '../constants/smallrankimgs';
import Td from '../constants/td';

import { withFirebase } from '../Firebase';

class Leaderboards extends Component {
    constructor(props) {
        super(props);

        this.state = {
            images: rankimages,
            loading: false,
            users: [],
            displayUsers: [],
            getRankState: this.getRank,
            monthly: false,
            currentMonth: true,
            thisMonth: "",
            lastMonth: "",
            curPage: 1,
            numPages: 0,
            usersPerPage: 12,
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

        this.props.firebase.users().on('value', snapshot => {
            const usersObject = snapshot.val();

            const usersList = Object.keys(usersObject).map(key => ({
                ...usersObject[key],
                uid: key,
            }));

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

    render() {
        const { users, loading, getRankState, numPages, curPage, currentMonth, usersPerPage } = this.state;

        return (
            <div className="background-static-lb">
                <Container className="leaderboard-page">
                    <Row className="row-header-lb">
                        <Col xs="auto" className="col-header-lb vertical-divider-col-lb">
                            <h2>Leaderboards</h2>
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
                                                currentMonth: true,
                                                users: users.sort((a,b) => (a.cmwins*10 + a.cmlosses*3 < b.cmwins*10 + b.cmlosses*3 ? 1 : -1))
                                            })
                                    }}
                                />
                            </Row>
                            {this.state.monthly === true ?
                            <Row className="button-left-lb">
                                <BootstrapSwitchButton
                                    checked={this.state.currentMonth}
                                    onstyle="dark"
                                    width={120}
                                    onlabel={this.state.thisMonth}
                                    offlabel={this.state.lastMonth}
                                    onChange={() => {
                                        if (currentMonth) {
                                            this.setState({ 
                                                currentMonth: !currentMonth,
                                                users: users.sort((a,b) => (a.pmwins*10 + a.pmlosses*3 < b.pmwins*10 + b.pmlosses*3 ? 1 : -1)),                                        
                                            })
                                        }
                                        else {
                                            this.setState({ 
                                                currentMonth: !currentMonth,
                                                users: users.sort((a,b) => (a.cmwins*10 + a.cmlosses*3 < b.cmwins*10 + b.cmlosses*3 ? 1 : -1))
                                            })
                                        }
                                    }}
                                /> 
                            </Row> : null}
                        </Col>
                        <Col className="col-header-lb pagination-col-lb">
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
                    <Row>
                        {loading && <div>Loading ...</div>}
                        <UserList users={users.slice((curPage-1) * usersPerPage, ((curPage-1) * usersPerPage) + usersPerPage )} images={this.state.images} getRank={getRankState} 
                            monthly={this.state.monthly} currentMonth={this.state.currentMonth} start={usersPerPage * (curPage-1)} 
                        />
                    </Row>
                </Container>
            </div>
        );
    }
}


const UserList = ({ users, images, getRank, monthly, currentMonth, start }) => (
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
        <tbody>
            {users
            .map((user, i) => (
                <tr key={user.uid}>
                    <Td scope="row"><p className={i + start ===0 ? "firstPlace" : (i + start ===1 ? "secondPlace" : (i + start ===2 ? "thirdPlace" : null))}>
                    {i + start + 1}</p></Td>
                    <Td><img src={images.length !== 0 ? images[getRank(user.points)] : null}
                        alt="Player Rank" /></Td>
                    <Td cl="profilelink-lb" to={'/profilelookup/' + user.uid}>{user.name}</Td>
                    <Td cl="wins-lb">
                        {monthly ? (currentMonth ? (user.cmwins) : (user.pmwins)) : user.wins}
                    </Td>
                    <Td cl="losses-lb">
                        {monthly ? (currentMonth ? (user.cmlosses) : (user.pmlosses)) : user.losses}
                    </Td>
                    <Td>
                        {monthly ? (currentMonth ? (user.cmwins*10 + user.cmlosses*3) : (user.pmwins*10 + user.pmlosses*3)) : user.points}
                    </Td>
                </tr>
            ))}
        </tbody>
    </Table>
);

export default withFirebase(Leaderboards);