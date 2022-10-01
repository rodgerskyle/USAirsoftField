import React, { Component } from 'react';
import { Table } from 'react-bootstrap/';
import '../../App.css';

import { Container, Row, Col, Spinner } from 'react-bootstrap/';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';

import Td from '../constants/td';
import * as ROLES from '../constants/roles';

import { withFirebase } from '../Firebase';
import { AuthUserContext } from '../session';

import Button from '@material-ui/core/Button';

import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowDropUpIcon from '@material-ui/icons/ArrowDropUp';

import { compose } from 'recompose';

import MUIPagination from '@material-ui/lab/Pagination';
import { ButtonGroup, ClickAwayListener, Grow, MenuItem, MenuList, Popper } from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import { isMobile } from 'react-device-detect';
import { Helmet } from 'react-helmet-async';

class TimedLeaderboards extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            users: [],
            displayUsers: [],
            getRankState: this.getRank,
            alltime: false,
            currentMonth: new Date().getMonth(),
            currentYear: new Date().getFullYear(),
            thisMonth: "",
            lastMonth: "",
            curPage: 1,
            numPages: 0,
            usersPerPage: 50,
            months: null,
            tv: true,
            usersObject: null,
            filteredUsers: null,
            anchor: React.createRef(null),
            open: false,
            options: null,
            selected: 0,
            countdownRunning: false,
            _class: this.returnClass(0),
        };
        this.handleClick = this.handleClick.bind(this);
        this.handleLastClick = this.handleLastClick.bind(this);
        this.handleFirstClick = this.handleFirstClick.bind(this);
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
            curPage: 1
        });
    }

    // Handles clicking on item in dropdown
    handleMenuItemClick = (e, i) => {
        this.setState({ 
            loading: true,
            open: false, 
            selected: i, 
            _class: this.returnClass(i) 
        }, () => {
            this.updateClass()
        })
    }

    // Toggles dropdown to open or not
    handleToggle = () => {
        this.setState({open: !this.state.open})
    }

    // Handles closing of dropdown menu
    handleClose = (event) => {
        if (this.state.anchor.current && this.state.anchor.current.contains(event.target)) {
            return
        }
        this.setState({open: false})
    }


    // Returns class given index
    returnClass(index){
        if (index === 0) {
            return "Rifle Class";
        }
        else if (index === 1) {
            return "Pistol Class";
        }
        else if (index === 2) {
            return "Open Class";
        }
    }

    componentDidMount() {
        this.setState({ loading: true });
        let options = []
        let temp = {label: 'Rifle Class'}
        options[0] = temp;
        let temp2 = {label: 'Pistol Class'}
        options[1] = temp2
        let temp3 = {label: 'Open Class'}
        options[2] = temp3
        this.setState({options})
        var usersList; 
        var timedUsersList;
        var newUsersList;
        this.props.firebase.users().on('value', snapshot => {
            const usersObject = snapshot.val();

            this.setState({usersObject})

            usersList = Object.keys(usersObject).map(key => ({
                ...usersObject[key],
                uid: key,
            }));

            newUsersList = this.filterArray(usersList)

        })

            this.props.firebase.timedRun().on('value', snapshot => { 
                const timedUsersObject = snapshot.val();

                const _class = this.state._class.replace(' ', "");

                timedUsersList = Object.keys(timedUsersObject).map(key => ({
                    ...timedUsersObject[key],
                    uid: key,
                }));

                var newTimedUsersList = this.filterArray(timedUsersList)

                var combinedUsers = [...newUsersList, ...newTimedUsersList];

                let combinedClassUsers= combinedUsers.filter(obj => 
                    typeof (obj['timedrun'][_class]) !== 'undefined'
                )
                
                this.setState({
                    filteredUsers: combinedUsers,
                })

                this.setState({
                    users: combinedClassUsers.sort((a, b) => (a['timedrun'][_class]['bestTime'] < b['timedrun'][_class]['bestTime'] ? -1 : 1)),
                    numPages: Math.ceil(combinedClassUsers.length / this.state.usersPerPage),
                    loading: false,
                }, () => {
                    if (!this.state.countdownRunning && this.state.tv) 
                        {
                            this.setState({
                                countdownRunning: true
                            }, () => {
                                this.startCountdown()
                            })
                        }
                    }
                );

            })

    }

    componentWillUnmount() {
        this.props.firebase.users().off();
        this.props.firebase.timedRun().off();
    }

    updateClass() {
        const _class = this.state._class.replace(' ', "");
        let combinedClassUsers= this.state.filteredUsers.filter(obj => 
            typeof (obj['timedrun'][_class]) !== 'undefined'
        )
        this.setState({
            users: combinedClassUsers.sort((a, b) => (a['timedrun'][_class]['bestTime'] < b['timedrun'][_class]['bestTime'] ? -1 : 1)),
            numPages: Math.ceil(combinedClassUsers.length / this.state.usersPerPage),
            loading: false,
        })
    }

    startCountdown() {
        if (!this.state.loading) {
            setTimeout(() => {
                const selected = this.state.selected === 2 ? 0 : this.state.selected+1;
                this.setState({
                    loading: true,
                    open: false, 
                    selected: selected,
                    _class: this.returnClass(selected)
                }, () => {
                    setTimeout(() => {
                        this.updateClass()
                        this.startCountdown();
                    }, 1000)
                })
            }, 15000)
        }
    }

    // Filter out array of users without timedruns
    filterArray(array) {
        let new_array = array.filter(obj => 
            typeof (obj.roles) === 'undefined' || !obj.roles[ROLES.WAIVER])
        new_array = new_array.filter(obj => 
            typeof (obj['timedrun']) !== 'undefined'
        )

        return new_array;
    }

    render() {
        const { 
            users, loading, numPages, curPage, usersPerPage, tv, 
            anchor, open, options, selected, 
        } = this.state;

        const _class = this.state._class.replace(' ', "");

        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-lb">
                        <Helmet>
                            <title>US Airsoft Field: Speed Leaderboards</title>
                        </Helmet>
                        <Container className="leaderboard-page">
                            <Row className={tv ? "row-header-tv-lb" : "row-header-lb"}>
                                <Col xs={"auto"} className="col-header-lb vertical-divider-col-lb">
                                    <h2 className="page-header-lb">{this.state._class}</h2>
                                </Col>
                                <Col xs={4}>
                                    <Row className={this.state.alltime ? "button-right-lb toggled-lb" : "button-right-lb not-toggled-lb"}>
                                        <BootstrapSwitchButton
                                            checked={!this.state.alltime}
                                            onstyle="dark"
                                            width={120}
                                            onlabel='Daily'
                                            offlabel='All Time'
                                            onChange={() => {
                                                this.setState({alltime: !this.state.alltime})
                                            }}
                                        />
                                    </Row>
                                </Col>
                                {loading ? null :
                                <Col className="dropdown-col-tlb col-options-dropdown-teams">
                                    <ButtonGroup variant="contained" color="primary" ref={anchor}>
                                        <Button onClick={this.handleToggle}>{options[selected].label}</Button>
                                        <Button
                                            color="primary"
                                            size="small"
                                            onClick={this.handleToggle}>
                                                {open ? <ArrowDropDownIcon /> : <ArrowDropUpIcon /> }
                                        </Button>
                                    </ButtonGroup>
                                    <Popper open={open} anchorEl={anchor.current} transition disablePortal style={{zIndex: 1}}>
                                        {({ TransitionProps, placement}) => (
                                            <Grow
                                                {...TransitionProps}
                                                style={{
                                                    transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                                                }}>
                                                    <Paper>
                                                        <ClickAwayListener onClickAway={this.handleClose}>
                                                            <MenuList>
                                                                {options.map((option, i) => (
                                                                    <MenuItem
                                                                        key={i}
                                                                        selected={i === selected}
                                                                        onClick={(e) => this.handleMenuItemClick(e, i)}>
                                                                        {option.label}
                                                                    </MenuItem>
                                                                ))}
                                                            </MenuList>
                                                        </ClickAwayListener>
                                                    </Paper>
                                            </Grow>
                                        )}
                                    </Popper>
                                </Col> }
                            </Row>
                            <Row className="row-pagination-lb">
                                
                                <Col className="pagination-col-lb">
                                    <MUIPagination count={numPages} page={curPage} onChange={(e, val) => this.handleClick(val)}
                                        showFirstButton showLastButton color="primary" variant="outlined" shape="rounded" size={isMobile ? 'small' : 'medium'} />
                                </Col>
                            </Row>
                            {loading ?
                                <Row className="justify-content-row">
                                    <Spinner animation="border" />
                                </Row> :
                                <Row>
                                    <UserList users={users.filter(obj => typeof obj['timedrun'][_class] !== 'undefined').slice((curPage - 1) * usersPerPage, ((curPage - 1) * usersPerPage) + usersPerPage)} 
                                        start={usersPerPage * (curPage - 1)} tv={tv} _class={_class} daily={!this.state.alltime}/>
                                </Row>
                            }
                            {!loading ?
                                <Row className="row-bottom">
                                    <Col className="pagination-col-lb">
                                        <MUIPagination count={numPages} page={curPage} onChange={(e, val) => this.handleClick(val)}
                                            showFirstButton showLastButton color="primary" variant="outlined" shape="rounded" size={isMobile ? 'small' : 'medium'} />
                                    </Col>
                                </Row> : null}
                        </Container>
                    </div>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

function UserList({ users, start, tv, _class, daily }) {
    let today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    if (daily) {
        users = users
            .filter((obj) => parseInt(obj['timedrun'][_class]['timestamp'].split('-')[0]) === year)
            .filter((obj) => parseInt(obj['timedrun'][_class]['timestamp'].split('-')[1]) === month)
            .filter((obj) => parseInt(obj['timedrun'][_class]['timestamp'].split('-')[2]) === day)
    }

    return (
        <Table className="table table-striped table-dark table-lb">
            <thead className="header-lb">
                <tr>
                    <th scope="col" className="header-th-tlb">#</th>
                    <th scope="col" className="name-header-th-lb">Name</th>
                    <th scope="col" className="header-th-tlb">Time</th>
                </tr>
            </thead>
            <tbody className="tbody-lb">
                {/**Daily */}
                {users
                    .map((user, i)  => (

                        <tr key={user.uid} className={i+1 > 10 ? "knocked-out-tr-tlb": null}>
                            <Td cl={tv ? "td-tv-lb" : "td-lb"} scope="row"><p className={i + start === 0 ? "firstPlace" : (i + start === 1 ? "secondPlace" : (i + start === 2 ? "thirdPlace" : "p-rank-leaderboard"))}>
                                {i + start + 1}</p></Td>
                            <Td cl={tv ? "profilelink-lb td-tv-lb" : "profilelink-lb td-name-lb"} to={ typeof user.profilepic !== 'undefined' ? `/profilelookup/+${user.uid}` : null} ct="link-td-lb">
                                {user.name}
                            </Td>
                            <Td cl={tv ? "td-tv-lb" : "td-lb"}>
                                {displayTime(user, _class)}
                            </Td>
                        </tr>
                    ))}
            </tbody>
        </Table>
    )
}

function displayTime(user, _class) {
    const a_class = _class.replace(' ', "");
    let time = user['timedrun'][a_class]['bestTime'];
    var min = Math.floor((time / 1000 / 60) % 60);
    var sec = Math.floor((time / 1000) % 60);
    var ms = time - (min * 60000) - (sec * 1000);
    return `${min}m ${sec}s ${ms}ms`;
}

export default compose(
    withFirebase,
    )(TimedLeaderboards);