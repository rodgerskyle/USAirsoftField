import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col, Breadcrumb, Spinner, Dropdown, Collapse } from 'react-bootstrap/';
import { LinkContainer } from 'react-router-bootstrap';

import CustomToggle from '../constants/customtoggle'
import CustomMenu from '../constants/custommenu'

import * as ROLES from '../constants/roles';

import { faCheck, faDollarSign } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

class WaiverLookup extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            waivers: [],
            queriedlist: [],
            search: "",
            OpenWaiverState: this.openWaiver,
            activeMonth: null,
            activeDay: null,
            activeYear: null,
            days: [...Array(31).keys()].map(String),
            years: [],
            months: [],
            num_waivers_prev: null,
            num_waivers_cur: null,
            validateArray: null,
        };
        this.validate = this.validate.bind(this)
        this.lookup = this.lookup.bind(this)
    }

    componentWillUnmount() {
        //this.props.firebase.waiversList().off();
        this.props.firebase.numWaivers().off();
    }

    componentDidMount() {
        this.setState({ loading: true });
        let date = new Date();
        this.setState({
            activeMonth: date.getMonth()+1,
            activeDay: date.getDate(),
            activeYear: date.getFullYear()
        })
        let years = [];
        for(let i=2020; i<date.getFullYear()+1; i++) {
            years.push(i)
        }
        this.setState({years})

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

        this.props.firebase.waiversList().listAll().then((res) => {
            var tempWaivers = [];
            for (let i=0; i<res.items.length; i++) {
                let waiverName = res.items[i].name
                let dateObj = (convertDate(waiverName.substr(waiverName.lastIndexOf('(') + 1).split(')')[0]))
                let waiver_obj = {
                    name: waiverName, 
                    date: dateObj,
                    ref: res.items[i]
                }
                tempWaivers.push(waiver_obj)
            }
            this.setState({waivers: tempWaivers})
            }).catch(function(error) {
              // Uh-oh, an error occurred!
              console.log(error)
            });

        this.props.firebase.numWaivers().on('value', snapshot => {
            let num_waivers = snapshot.val().total_num;
            this.setState({num_waivers_cur: num_waivers, validateArray: snapshot.val().validated})
        })
        this.props.firebase.numWaivers().once('value', snapshot => {
            let prev = snapshot.val().total_num;
            this.setState({num_waivers_prev: prev, loading: false})
        })
    }

    componentDidUpdate() {
        if (this.state.num_waivers_prev !== this.state.num_waivers_cur) {
        this.props.firebase.waiversList().listAll().then((res) => {
            var tempWaivers = [];
            for (let i=0; i<res.items.length; i++) {
                let waiverName = res.items[i].name
                let dateObj = (convertDate(waiverName.substr(waiverName.lastIndexOf('(') + 1).split(')')[0]))
                let waiver_obj = {
                    name: waiverName, 
                    date: dateObj,
                    ref: res.items[i]
                }
                tempWaivers.push(waiver_obj)
            }
            this.setState({waivers: tempWaivers}, function() {
                    this.setState({loading: false})
                })
            }).catch(function(error) {
              // Uh-oh, an error occurred!
              console.log(error)
            });
            this.props.firebase.numWaivers().once('value', snapshot => {
                let prev = snapshot.val().total_num;
                this.setState({num_waivers_prev: prev})
            })
        }
    }

    // Adds user to validate list
    validate = (file) => {
        this.props.firebase.validatedWaiver(file.substr(0, file.lastIndexOf(')')+1)).set({attached: false})
    }

    // Lookups file to see if it exists in validated array
    lookup = (file) => {
        return this.state.validateArray[file.substr(0, file.lastIndexOf(')')+1)]
    }

    // Opens User's waiver
    openWaiver = (ref) => {
        ref.getDownloadURL().then(url => {
            window.open(url)
        })
    }

    onChange = event => {
            this.setState({ search: event.target.value });
    };

    render() {
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-all">
                            <Container>
                                <h2 className="admin-header">Waiver Lookup</h2>
                                <Breadcrumb className="admin-breadcrumb">
                                    {authUser && !!authUser.roles[ROLES.ADMIN] ? 
                                    <LinkContainer to="/admin">
                                        <Breadcrumb.Item>Admin</Breadcrumb.Item>
                                    </LinkContainer>
                                    :
                                    <LinkContainer to="/dashboard">
                                        <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
                                    </LinkContainer> 
                                    }
                                    <Breadcrumb.Item active>Waiver Lookup</Breadcrumb.Item>
                                </Breadcrumb>
                                <Row>
                                    <Col>
                                        <Card className="admin-cards">
                                            <Card.Header>
                                                <Form onSubmit={e => { e.preventDefault(); }}>
                                                    <Form.Group controlId="input1">
                                                        <Form.Label className="search-label-admin">Search by Name:</Form.Label>
                                                        <Form.Control
                                                            type="name"
                                                            autoComplete="off"
                                                            placeholder="ex: John Doe"
                                                            value={this.state.search}
                                                            onChange={(e) => {
                                                                this.onChange(e);
                                                            }}
                                                        />
                                                    </Form.Group>
                                                </Form>
                                                <Collapse in={this.state.search === ""}>
                                                    <Row>
                                                        <Col md={"auto"}>
                                                            <Dropdown>
                                                                <Dropdown.Toggle as={CustomToggle} id="dropdown-custom-components">
                                                                Month: {this.state.activeMonth !== 13 ? this.state.activeMonth : "None" }
                                                                </Dropdown.Toggle>
                                                                <Dropdown.Menu as={CustomMenu} className="dropdown-waiverlookup">
                                                                    <Dropdown.Item eventKey={13} active={13===this.state.activeMonth}
                                                                    onClick={() => this.setState({activeMonth: 13})}>
                                                                        {"None"}
                                                                    </Dropdown.Item>
                                                                    {this.state.months.map((month, i) => (
                                                                        <Dropdown.Item key={i} eventKey={i} active={i===this.state.activeMonth-1}
                                                                        onClick={() => this.setState({activeMonth: i+1})}>
                                                                            {i+1}
                                                                        </Dropdown.Item>
                                                                    ))}
                                                                </Dropdown.Menu>
                                                            </Dropdown>
                                                        </Col>
                                                        <Col md={"auto"}>
                                                            <Dropdown>
                                                                <Dropdown.Toggle as={CustomToggle} id="dropdown-custom-components">
                                                                Day: {this.state.activeDay !== 32 ? this.state.activeDay : "None" }
                                                                </Dropdown.Toggle>
                                                                <Dropdown.Menu as={CustomMenu} className="dropdown-waiverlookup">
                                                                    <Dropdown.Item eventKey={32} active={32===this.state.activeDay}
                                                                    onClick={() => this.setState({activeDay: 32})}>
                                                                        {"None"}
                                                                    </Dropdown.Item>
                                                                    {this.state.days.map((day, i) => (
                                                                        <Dropdown.Item key={i} eventKey={i} active={i+1===this.state.activeDay}
                                                                        onClick={() => this.setState({activeDay: i+1})}>
                                                                            {i+1}
                                                                        </Dropdown.Item>
                                                                    ))}
                                                                </Dropdown.Menu>
                                                            </Dropdown>
                                                        </Col>
                                                        <Col md={"auto"}>
                                                            <Dropdown>
                                                                <Dropdown.Toggle as={CustomToggle} id="dropdown-custom-components">
                                                                Year: {this.state.activeYear !== new Date().getFullYear()+1 
                                                                ? this.state.activeYear : "None" }
                                                                </Dropdown.Toggle>
                                                                <Dropdown.Menu as={CustomMenu} className="dropdown-waiverlookup">
                                                                    <Dropdown.Item eventKey={this.state.years.length+1} 
                                                                    active={new Date().getFullYear()+1 === this.state.activeYear}
                                                                    onClick={() => this.setState({activeYear: new Date().getFullYear()+1})}>
                                                                        {"None"}
                                                                    </Dropdown.Item>
                                                                    {this.state.years.map((year, i) => (
                                                                        <Dropdown.Item eventKey={i} key={i} active={year===this.state.activeYear}
                                                                        onClick={() => this.setState({activeYear: year})}>
                                                                            {year}
                                                                        </Dropdown.Item>
                                                                    ))}
                                                                </Dropdown.Menu>
                                                            </Dropdown>
                                                        </Col>
                                                    </Row>
                                                </Collapse>
                                            </Card.Header>
                                            <WaiverBox waivers={this.state.waivers} index={0}
                                                search={this.state.search} open={this.state.OpenWaiverState} 
                                                month={this.state.activeMonth} day={this.state.activeDay}
                                                year={this.state.activeYear} loading={this.state.loading}
                                                validate={this.validate} lookup={this.lookup}/>
                                        </Card>
                                    </Col>
                                </Row>
                            </Container>
                    </div>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

function convertDate(date) {
    // Making date variables in correct format
    date = date.split('-');
    let temp = date[2].split(':')
    date.splice(2, 1)
    date = date.concat(temp)

    // Now to changing them to date objects
    return new Date(date[2], date[0]-1, date[1], date[3], date[4], date[5], date[6])
}

// Compares month, day and year
function compareDate(month, day, year, date2) {
    // month,date,year is selected, date2 is each object
    let o_year = new Date().getFullYear()+1

    if (year === o_year)
        year = date2.getFullYear()
    if (month === 13)
        month = date2.getMonth()+1
    if (day === 32)
        day = date2.getDate()
    
    if (year === date2.getFullYear() 
        && month === date2.getMonth()+1
        && day === date2.getDate())
        return true;
    return false;
}

function returnDay(day) {
    if (day === 0)
        return "Sun"
    else if (day === 1)
        return "Mon"
    else if (day === 2)
        return "Tue"
    else if (day === 3)
        return "Wed"
    else if (day === 4)
        return "Thu"
    else if (day === 5)
        return "Fri"
    else if (day === 6)
        return "Sat"
}

function returnMonth(month) {
    if (month===0)
        return "January"
    else if (month===1)
        return "February"
    else if (month === 2)
        return "March"
    else if (month === 3)
        return "April"
    else if (month === 4)
        return "May"
    else if (month === 5)
        return "June"
    else if (month === 6)
        return "July"
    else if (month === 7)
        return "August"
    else if (month === 8)
        return "September"
    else if (month === 9)
        return "October"
    else if (month === 10)
        return "November"
    else if (month === 11)
        return "December"
}

function WaiverBox ({waivers, index, search, open, loading, month, day, year, validate, lookup}) {
    return (
    <Card.Body className="status-card-body-wl-admin">
        {!loading ? 
        <Row className="card-header-wl">
            <Col md={3}>
                <Card.Text>
                    Name:
                </Card.Text>
            </Col>
            <Col md={4}>
                <Card.Text>
                    Date Created:
                </Card.Text>
            </Col>
            <Col md={3}>
                <Card.Text>
                    Validate:
                </Card.Text>
            </Col>
            <Col md={2}>
            </Col>
        </Row>
        : null}
        <div className="row-allwaivers-wl">
        {!loading ?
        waivers.sort((a, b) => 
        (b.date - a.date))
        .map((waiver, i) => (
            search !== "" ? // Search query case
                waiver.name.toLowerCase().includes(search.toLowerCase()) ? 
                        index++ % 2 === 0 ? 
                        <Row className="row-wl" key={index}>
                            <Col className="col-name-fg" md={3}>
                                <Card.Text>
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col className="col-name-fg">
                                {returnDay(waiver.date.getDay()) + ", " + 
                                waiver.date.getDate() + " " + returnMonth(waiver.date.getMonth()) +
                                " " + waiver.date.getFullYear()}
                            </Col>
                            <Col md={3} className="align-items-center-col">
                                {!lookup(waiver.name) ?
                                <Button variant="warning" className="check-button-wl"
                                onClick={() => {
                                    validate(waiver.name)
                                }}>
                                    <FontAwesomeIcon icon={faCheck} />
                                </Button> 
                                :
                                <Button variant="success" className="validate-button-wl">
                                    <FontAwesomeIcon icon={faDollarSign} />
                                </Button>
                                }
                            </Col>
                            <Col md={2}>
                                <Button className="button-submit-admin2" onClick={() => open(waiver.ref)}
                                type="button" id="update" variant="success">
                                    Open
                                </Button>
                            </Col>
                        </Row>
                            : 
                        <Row className="status-card-offrow-admin-wl" key={index}>
                            <Col className="col-name-fg" md={3}>
                                <Card.Text>
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col className="col-name-fg">
                                {returnDay(waiver.date.getDay()) + ", " + 
                                waiver.date.getDate() + " " + returnMonth(waiver.date.getMonth()) +
                                " " + waiver.date.getFullYear()}
                            </Col>
                            <Col md={3} className="align-items-center-col">
                                {!lookup(waiver.name) ?
                                <Button variant="warning" className="check-button-wl"
                                onClick={() => {
                                    validate(waiver.name)
                                }}>
                                    <FontAwesomeIcon icon={faCheck} />
                                </Button> 
                                :
                                <Button variant="success" className="validate-button-wl">
                                    <FontAwesomeIcon icon={faDollarSign} />
                                </Button>
                                }
                            </Col>
                            <Col md={2}>
                                <Button className="button-submit-admin2" onClick={() => open(waiver.ref)}
                                type="submit" id="update" variant="success">
                                    Open
                                </Button>
                            </Col>
                        </Row>
                : null
            :
                compareDate(month, day, year, waiver.date ) ?
                        index++ % 2 === 0 ? 
                        <Row className="row-wl" key={index}>
                            <Col className="col-name-fg" md={3}>
                                <Card.Text>
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col className="col-name-fg" md={4}>
                                {returnDay(waiver.date.getDay()) + ", " + 
                                waiver.date.getDate() + " " + returnMonth(waiver.date.getMonth()) +
                                " " + waiver.date.getFullYear()}
                            </Col>
                            <Col md={3} className="align-items-center-col">
                                {!lookup(waiver.name) ?
                                <Button variant="warning" className="check-button-wl"
                                onClick={() => {
                                    validate(waiver.name)
                                }}>
                                    <FontAwesomeIcon icon={faCheck} />
                                </Button> 
                                :
                                <Button variant="success" className="validate-button-wl">
                                    <FontAwesomeIcon icon={faDollarSign} />
                                </Button>
                                }
                            </Col>
                            <Col md={2}>
                                <Button className="button-submit-admin2" onClick={() => open(waiver.ref)}
                                type="submit" id="update" variant="success">
                                    Open 
                                </Button>
                            </Col>
                        </Row>
                            : 
                        <Row className="status-card-offrow-admin-wl" key={index}>
                            <Col className="col-name-fg" md={3}>
                                <Card.Text>
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col className="col-name-fg" md={4}>
                                {returnDay(waiver.date.getDay()) + ", " + 
                                waiver.date.getDate() + " " + returnMonth(waiver.date.getMonth()) +
                                " " + waiver.date.getFullYear()}
                            </Col>
                            <Col md={3} className="align-items-center-col">
                                {!lookup(waiver.name) ?
                                <Button variant="warning" className="check-button-wl"
                                onClick={() => {
                                    validate(waiver.name)
                                }}>
                                    <FontAwesomeIcon icon={faCheck} />
                                </Button> 
                                :
                                <Button variant="success" className="validate-button-wl">
                                    <FontAwesomeIcon icon={faDollarSign} />
                                </Button>
                                }
                            </Col>
                            <Col md={2}>
                                <Button className="button-submit-admin2" onClick={() => open(waiver.ref)}
                                type="submit" id="update" variant="success">
                                    Open 
                                </Button>
                            </Col>
                        </Row>
                    : null
        ))
        : 
        <Row className="spinner-standard">
            <Spinner animation="border"/>
        </Row>}
        </div>
    </Card.Body>
    )
};

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default compose(
    withAuthorization(condition),
    withFirebase,
)(WaiverLookup);