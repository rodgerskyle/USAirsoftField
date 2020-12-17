import React, { Component, useState } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col, Breadcrumb, Spinner, Dropdown, FormControl, Collapse } from 'react-bootstrap/';
import { LinkContainer } from 'react-router-bootstrap';

import * as ROLES from '../constants/roles';

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
        };
    }

    componentWillUnmount() {
        //this.props.firebase.waiversList().off();
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
            this.setState({waivers: res.items}, function() {
                    this.setState({loading: false})
                })
            }).catch(function(error) {
              // Uh-oh, an error occurred!
              console.log(error)
            });
    }

    // Updates User's free game
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
                                                <Form className="team-manage-text">
                                                    <Form.Group controlId="input1">
                                                        <Form.Label className="search-label-admin">Search by Name:</Form.Label>
                                                        <Form.Control
                                                            type="name"
                                                            placeholder="ex: JohnDoe"
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
                                                                        <Dropdown.Item key={i} eventKey={i} active={i===this.state.activeMonth}
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
                                                year={this.state.activeYear}/>
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
    if (day === 1)
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
    else if (day === 7)
        return "Sun"
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

function WaiverBox ({waivers, index, search, open, loading, month, day, year}) {
    var tempWaivers = [];
    for (let i=0; i<waivers.length; i++) {
        let waiverName = waivers[i].name
        let dateObj = (convertDate(waiverName.substr(waiverName.lastIndexOf('(') + 1).split(')')[0]))
        let waiver_obj = {
            name: waiverName, 
            date: dateObj,
            ref: waivers[i]
        }
        tempWaivers.push(waiver_obj)
    }
    return (
    <Card.Body className="status-card-body-fg-admin">
        {!loading ? 
        <Row className="card-header-wl">
            <Col>
                <Card.Text>
                    Name:
                </Card.Text>
            </Col>
            <Col>
                <Card.Text>
                    Date Created:
                </Card.Text>
            </Col>
        </Row>
        : null}
        {!loading ?
        tempWaivers.sort((a, b) => 
        (b.date - a.date))
        .map((waiver, i) => (
            search !== "" ? // Search query case
                waiver.name.toLowerCase().includes(search.toLowerCase()) ? 
                        index++ % 2 === 0 ? 
                        <Row className={index === 1 ? "row-1-wl" : "row-fg"} key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {returnDay(waiver.date.getDay()) + ", " + 
                                        waiver.date.getDate() + " " + returnMonth(waiver.date.getMonth()) +
                                        " " + waiver.date.getFullYear()}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waiver.ref)}
                                        type="submit" id="update" variant="success">
                                            Open
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                            : 
                        <Row className="status-card-offrow-admin-fg" key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {returnDay(waiver.date.getDay()) + ", " + 
                                        waiver.date.getDate() + " " + returnMonth(waiver.date.getMonth()) +
                                        " " + waiver.date.getFullYear()}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waiver.ref)}
                                        type="submit" id="update" variant="success">
                                            Open
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                : null
            :
                compareDate(month, day, year, waiver.date ) ?
                        index++ % 2 === 0 ? 
                        <Row className={index === 1 ? "row-1-wl" : "row-fg"} key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {returnDay(waiver.date.getDay()) + ", " + 
                                        waiver.date.getDate() + " " + returnMonth(waiver.date.getMonth()) +
                                        " " + waiver.date.getFullYear()}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waiver.ref)}
                                        type="submit" id="update" variant="success">
                                            Open 
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                            : 
                        <Row className="status-card-offrow-admin-fg" key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {returnDay(waiver.date.getDay()) + ", " + 
                                        waiver.date.getDate() + " " + returnMonth(waiver.date.getMonth()) +
                                        " " + waiver.date.getFullYear()}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waiver.ref)}
                                        type="submit" id="update" variant="success">
                                            Open 
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    : null
        ))
        : 
        <Spinner animation="border" />}
    </Card.Body>
    )
};

// The forwardRef is important!!
// Dropdown needs access to the DOM node in order to position the Menu
const CustomToggle = React.forwardRef(({ children, onClick }, ref) => (
    <Button
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
    >
      {children}
      &#x25bc;
    </Button>
  ));
  
  // forwardRef again here!
  // Dropdown needs access to the DOM of the Menu to measure it
  const CustomMenu = React.forwardRef(
    ({ children, style, className, 'aria-labelledby': labeledBy }, ref) => {
      const [value, setValue] = useState('');
  
      return (
        <div
          ref={ref}
          style={style}
          className={className}
          aria-labelledby={labeledBy}
        >
          <FormControl
            autoFocus
            className="mx-3 my-2 w-auto"
            placeholder="Type to filter..."
            onChange={(e) => 
                setValue(e.target.value)
            }
            value={value}
          />
          <ul className="list-unstyled">
            {React.Children.toArray(children).filter(
              (child) =>
                !value || child.props.children.toString().toLowerCase().startsWith(value),
            )}
          </ul>
        </div>
      );
    },
  );

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default compose(
    withAuthorization(condition),
    withFirebase,
)(WaiverLookup);