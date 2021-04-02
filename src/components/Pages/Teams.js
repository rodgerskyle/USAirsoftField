import React, { Component } from 'react';
import '../../App.css';

import { Container, Row, Col, Spinner } from 'react-bootstrap/';

import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Tune from '@material-ui/icons/Tune';
import SearchIcon from '@material-ui/icons/Search';

import default_profile from '../../assets/default.png';
import { Link } from 'react-router-dom';

import { withFirebase } from '../Firebase';

import { compose } from 'recompose';
import { Helmet } from 'react-helmet-async';

import MUIPagination from '@material-ui/lab/Pagination';
import { isMobile } from 'react-device-detect';

import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowDropUpIcon from '@material-ui/icons/ArrowDropUp';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import { ButtonGroup, ClickAwayListener, Grow, MenuItem, MenuList, Popper, TableHead } from '@material-ui/core';
import { LinkContainer } from 'react-router-bootstrap';

class Teams extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            teams: [],
            teamicon: [],
            usericons: [],
            anchor: React.createRef(null),
            open: false,
            options: null,
            selected: 0,
            curPage: 1,
            teamsPerPage: 6,
            loadingTeams: false,
        };
        this.handleClick = this.handleClick.bind(this);
    }

    //Get image function for team image = teamname
    getPicture(teamname) {
        this.props.firebase.teamsPictures(`${teamname}.png`).getDownloadURL().then((url) => {
            let temp = this.state.teamicon;
            temp[teamname.toString()] = url
            this.setState({ teamicon: temp })
        }).catch((error) => {
            // Handle any errors NOT DONE
            this.setState({})
        })
    }

    //Get image function for profile image = uid
    async getProfile(uid) {
        return this.props.firebase.pictures(`${uid}/profilepic.png`).getDownloadURL().then((url) => {
            return url
        })
    }

    // Get user images from each user
    getUserPictures() {
        const { teams } = this.state;
        let usericons = {}
        for (let i=0; i<teams.length; i++) {
            // Team leader case
            this.props.firebase.user(teams[i].leader).once('value', obj => {
                if (obj.val().profilepic) {
                    this.props.firebase.pictures(`${teams[i].leader}/profilepic.png`).getDownloadURL().then((url) => {
                        usericons[teams[i].leader] = url
                    })
                }
                else 
                    usericons[teams[i].leader] = default_profile
            })
            // Team members case
             if (teams[i].members) {
                 for (let z=0; z<teams[i].members.length; z++) {
                    this.props.firebase.user(teams[i].members[z][1]).once('value', obj => {
                        if (obj.val().profilepic) {
                            this.props.firebase.pictures(`${teams[i].members[z][1]}/profilepic.png`).getDownloadURL().then((url) => {
                                usericons[teams[i].members[z][1]] = url
                            })
                        }
                        else 
                            usericons[teams[i].members[z][1]] = default_profile
                    })
                 }
             }
        }
        this.setState({usericons}, () => {
            this.setState({loading: false})
        })
    }

    componentWillUnmount() {
        this.props.firebase.teams().off();
    }

    componentDidMount() {
        let options = []
        let temp = {link: '/createteam', label: 'Create Team'}
        options[0] = temp;
        let temp2 = {link: '/jointeam', label: 'Join Team'}
        options[1] = temp2
        let temp3 = {link: '/manageteam', label: 'Manage Team'}
        options[2] = temp3
        this.setState({options})

        this.props.firebase.teams().on('value', snapshot => {
            const teamObject = snapshot.val();

            const teamsList = Object.keys(teamObject).map(key => ({
                ...teamObject[key],
                teamname: key,
            }));

            this.setState({
                teams: teamsList,
            }, () => {
                for (var i = 0; i < this.state.teams.length; i++) {
                    this.getPicture(this.state.teams[i].teamname);
                }
                this.setState({loading: false})
                // this.getUserPictures()
            });
        });
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

    // Handles clicking on item in dropdown
    handleMenuItemClick = (e, i) => {
        this.setState({ open: false, selected: i })
    }

    //Pagination Logic
    handleClick(val) {
        this.setState({
            loadingTeams: true,
            curPage: val,
        }, () => {
            setTimeout(() => {
                this.setState({loadingTeams: false}) 
            }, 200);
        });
    }

    render() {
        const { anchor, open, options, selected, loading, usericons, curPage, teams, teamsPerPage, loadingTeams } = this.state
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Teams</title>
                </Helmet>
                {loading ? 
                <Row className="justify-content-row padding-5px"><Spinner animation="border" /></Row> : 
                <Container className="position-relative">
                    <Row className="row-header-teams">
                        <Col xs={"auto"} className="col-center-middle">
                            <p className="p-header-teams">
                                TEAMS
                            </p>
                        </Col>
                        <Col className="col-options-dropdown-teams">
                            <ButtonGroup variant="contained" color="primary" ref={anchor}>
                                <LinkContainer to={options[selected].link}><Button>{options[selected].label}</Button></LinkContainer>
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
                        </Col>
                    </Row>
                    <TeamList teams={teams.slice((curPage - 1) * teamsPerPage, ((curPage - 1) * teamsPerPage) + teamsPerPage)} teamsPerPage={teamsPerPage} loading={loadingTeams}
                    teamicon={this.state.teamicon} numPages={Math.ceil(teams.length / teamsPerPage)} curPage={curPage} usericons={usericons} handleClick={this.handleClick}/>
                    <Row className="row-bottom"></Row>
                </Container> }
            </div>
        );
    }
}

const useStyles = makeStyles((theme) => ({
    root: {
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'transparent',
        border: '1px solid gray',
        '& > *': {
            borderBottom: 'unset',
        },
    },
    input: {
        marginLeft: theme.spacing(1),
        flex: 1,
        color: 'white',
    },
    iconButton: {
        padding: 10,
        color: 'white',
    },
    divider: {
        height: 28,
        margin: 4,
    },
    table: {
        minWidth: 500,
    },
    tableCell: {
        fontWeight: 300,
        color: '#595959',
        border: '1px solid #595959',
        padding: 5,
    },
    tableCellIndex: {
        width: '1%',
        fontWeight: 300,
        color: '#595959',
        border: 'none',
        textAlign: 'center',
        fontSize: 20,
    },
    tableCellPoints: {
        width: '1%',
        fontWeight: 300,
        color: 'white',
        fontSize: 20,
    },
    tableHCell: {
        fontWeight: 300,
        color: 'white',
        padding: 5,
        backgroundColor: 'transparent',
    },
    tableHCellIndex: {
        width: '1%',
        fontWeight: 300,
        color: 'white',
        backgroundColor: 'transparent',
        textAlign: 'center',
    },
    tableTeamNameCell: {
        fontWeight: 300,
        color: 'white',
        border: '1px solid #595959',
        padding: 5,
        width: '20%',
    },
    tableRowHead: {
        backgroundColor: 'transparent',
    },
    tableCellMember: {
        border: 'none',
    },
    container: {
        maxHeight: '100%',
        display: 'flex',
        justifyContent: 'center',
    },
    containerLoading: {
        maxHeight: '100%',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    tableBodyLoading: {
        visibility: 'hidden',
    },
}));

const TeamList = ({ teams, teamicon, numPages, teamsPerPage, curPage, usericons, handleClick, loading }) => {
    const classes = useStyles();

    const [search, handleSearch] = React.useState("");

    return (
        <div>
            <Row className="row-navigation-teams">
                <Col md={8}>
                    <Paper component="form" className={classes.root}>
                        <IconButton type="submit" className={classes.iconButton} aria-label="search">
                            <SearchIcon />
                        </IconButton>
                        <InputBase
                            className={classes.input}
                            placeholder="Search Teams"
                            inputProps={{ 'aria-label': 'search teams' }}
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        <IconButton className={classes.iconButton} aria-label="filter">
                            <Tune />
                        </IconButton>
                    </Paper>
                </Col>
                <Col md={4} className="pagination-col-teams">
                    <MUIPagination count={numPages} page={curPage} onChange={(e, val) => handleClick(val)}
                        showFirstButton showLastButton color="primary" variant="outlined" shape="rounded" size={isMobile ? 'small' : 'medium'} />
                </Col>
            </Row>
            <div className="div-parent-teams">
                <TableContainer className={loading ? classes.containerLoading : classes.container}>
                    <Table className={classes.table}>
                        <TableHead>
                            <TableRow className={classes.tableRowHead}>
                                <TableCell className={classes.tableHCellIndex} colSpan={1}>RANK</TableCell>
                                <TableCell className={classes.tableHCell} align="center">TEAM</TableCell>
                                {/* <TableCell className={classes.tableHCell}>Banner</TableCell> */}
                                {/* <TableCell className={classes.tableHCell} align="center">Members</TableCell> */}
                                <TableCell className={classes.tableHCell} align="center">Points</TableCell>
                            </TableRow>
                        </TableHead>
                            <TableBody className={loading ? classes.tableBodyLoading : null}>
                                {teams.map((team, i) => {
                                    if (team.teamname.includes(search.toLowerCase())) {
                                        return (
                                            <TableRow key={i}>
                                                <TableCell className={classes.tableCellIndex}>{i+1+((curPage-1)*teamsPerPage)}</TableCell>
                                                {/* <Td to={"/teams/" + team.teamname.toString()} ct={"link-team-name"}
                                                cl={classes.tableTeamNameCell}>{team.teamname.toUpperCase()}</Td> */}
                                                <TableCell className="td-team-imgname-teams">
                                                    <Row>
                                                        <Col xs={10}>
                                                            <Link to={"/teams/" + team.teamname.toString()}>
                                                                <img className="team-pictures"
                                                                    src={teamicon[team.teamname.toString()]} alt={"Team " + team.teamname}></img>
                                                            </Link>
                                                        </Col>
                                                        <Col className="col-team-name-teams" xs={2}>
                                                            <Link to={"/teams/" + team.teamname.toString()}>
                                                                {team.teamname.toUpperCase()}
                                                            </Link>
                                                        </Col>
                                                    </Row>
                                                </TableCell>
                                                {/* <TableCell className={classes.tableCell}>
                                                    <div>
                                                        <div className="div-team-leader-teams">
                                                            <img className="img-crown-teams" src={crown} alt="crown"/>
                                                            <Tooltip title={"placeholder"}>
                                                                <Link to={`/profilelookup/${team.leader}`}>
                                                                    <img className="img-team-member-teams" src={usericons[team.leader]} />
                                                                </Link>
                                                            </Tooltip>
                                                        </div>
                                                    {typeof team.members !== 'undefined' ? 
                                                        <TeamMembers members={team.members} usericons={usericons} classes={classes}/> 
                                                    : null }
                                                    </div>
                                                </TableCell> */}
                                                <TableCell className={classes.tableCellPoints} align="center">{400}</TableCell>
                                            </TableRow>
                                    )} return null;
                                })}
                            </TableBody>
                    </Table>
                </TableContainer>
                {loading ?
                <Row className="justify-content-row spinner-table-teams">
                    <Spinner animation="border" />
                </Row> : null}
            </div>
            <Row className="row-pagination-bot-teams">
                <Col md={4} className="pagination-col-teams">
                <MUIPagination count={numPages} page={curPage} onChange={(e, val) => handleClick(val)}
                        showFirstButton showLastButton color="primary" variant="outlined" shape="rounded" size={isMobile ? 'small' : 'medium'} />
                </Col>
            </Row>
        </div>
    );
}

// const TeamMembers = ({ members, usericons, classes }) => {
//     return (
//         <>
//             {members.map((member, i) => {
//                 return (
//                     <Tooltip title={member[0]} key={i}>
//                         <Link to={`/profilelookup/${member[1]}`}>
//                             <img className="img-team-member-teams" src={usericons[member[1]]} />
//                         </Link>
//                     </Tooltip>
//                 )
//             })}
//         </>
//     )
// }

                /* <tbody>
                    {/* {teams.map((team, i) => (
                        <tr key={team.teamname}>
                            <Td to={"/teams/" + team.teamname.toString()}>
                                <img className="team-pictures"
                                    src={teamicon[team.teamname.toString()]} alt={"Team " + team.teamname}></img>
                            </Td>
                            <Td cl="team-name" to={"/teams/" + team.teamname} ct={"link-team-name"}>
                                <strong>{(team.teamname).toUpperCase()}</strong>
                            </Td>
                        </tr>
                    ))} 
                </tbody> */

export default compose(
    withFirebase,
    )(Teams);