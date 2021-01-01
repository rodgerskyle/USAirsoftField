import React, { Component, useEffect, useState } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col, Breadcrumb, Spinner, Dropdown, Collapse } from 'react-bootstrap/';
import MUIButton from '@material-ui/core/Button';
import { LinkContainer } from 'react-router-bootstrap';

import BottomNavigation from '@material-ui/core/BottomNavigation';
import BottomNavigationAction from '@material-ui/core/BottomNavigationAction';
import Icon from '@material-ui/core/Icon';

import MultiSelect from "react-multi-select-component"

import CustomToggle from '../constants/customtoggle'
import CustomMenu from '../constants/custommenu'

import * as ROLES from '../constants/roles';

class RentalForm extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            waivers: [],
            queriedlist: [],
            search: "",
            activeMonth: null,
            activeDay: null,
            activeYear: null,
            days: [...Array(31).keys()].map(String),
            years: [],
            months: [],
            num_waivers_prev: null,
            num_waivers_cur: null,
            value: 0,
            showAddParticipant: false,
            participants: [],
            numParticipants: '',
            rentals: [],
            participantsRentals: [],
        };

        this.showParticipantBox = this.showParticipantBox.bind(this)
        this.setParticipants = this.setParticipants.bind(this)
        this.setRentals = this.setRentals.bind(this)
        this.changeRental = this.changeRental.bind(this)
        this.submitDone = this.submitDone.bind(this)
        this.createForm = this.createForm.bind(this)
    }

    // Creates rental form
    createForm = (name) => {
        this.props.firebase.rentals().once("value", (obj) => {
            let i = obj.val().size
            this.props.firebase.rental(i).set({name, participants: this.state.participantsRentals})
            this.props.firebase.rentals().update({size: i+1})
            this.setState({participantsRentals: [], numParticipants: '', participants: []})
        })
    }

    // Submit participant after done is pressed
    submitDone = (name) => {
        let obj = {name: name, rentals: this.state.rentals}
        this.setState({
            participantsRentals: [...this.state.participantsRentals, obj],
            rentals: []
        })
    }

    // Change rental number for selected index
    changeRental = (val, i) => {
        let temp = this.state.rentals.slice();
        let obj = temp[i]
        obj.number = val
        temp[i] = obj;
        this.setState({rentals: temp})
    }

    // Set Rental for participant
    setRentals = (obj, i) => {
        this.setState({rentals: obj})
    }

    // Set Number of Participants
    setParticipants = (num) => {
        this.setState({numParticipants: num})
    }

    // Show the search participant box
    showParticipantBox = (val) => {
        this.setState({showAddParticipant: val})
    }

    // Add to participants
    addParticipant = (name) => {
        if (!this.containsObject(name, this.state.participants)) {
            this.setState({participants: [...this.state.participants, name]})
            this.showParticipantBox(false)
            this.setState({search: ""})
        }
    }

    // Checks if object is already added
    containsObject(obj, list) {
        var i;
        for (i = 0; i < list.length; i++) {
            if (list[i] === obj) {
                return true;
            }
        }
        return false;
    }

    componentWillUnmount() {
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
            this.setState({waivers: tempWaivers}, function() {
                    this.setState({loading: false})
                })
            }).catch(function(error) {
              // Uh-oh, an error occurred!
              console.log(error)
            });

        this.props.firebase.numWaivers().on('value', snapshot => {
            let num_waivers = snapshot.val().total_num;
            this.setState({num_waivers_cur: num_waivers})
        })
        this.props.firebase.numWaivers().once('value', snapshot => {
            let prev = snapshot.val().total_num;
            this.setState({num_waivers_prev: prev})
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

    onChange = event => {
            this.setState({ search: event.target.value });
    };

    render() {
        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-all">
                            <Container>
                                <h2 className="admin-header">Rental Form</h2>
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
                                    <Breadcrumb.Item active>Rental Form</Breadcrumb.Item>
                                </Breadcrumb>
                                <Row>
                                    <Col>
                                        <BottomNavigation
                                            value={this.state.value}
                                            onChange={(e, newvalue) => {
                                                this.setState({value: newvalue})
                                            }}
                                            showLabels
                                            className="navigation-rf"
                                        >
                                            <BottomNavigationAction className="bottom-nav-rf" label="New Form" icon={<Icon className="fa fa-plus-circle" />} />
                                            <BottomNavigationAction className="bottom-nav-rf" label="Current Forms" icon={<Icon className="fa fa-folder" />} />
                                            <BottomNavigationAction className="bottom-nav-rf" label="Edit Form" icon={<Icon className="fa fa-folder-open" />} />
                                        </BottomNavigation>
                                    </Col>
                                </Row>
                                <SelectedPage selection={this.state.value} showBox={this.showParticipantBox}
                                box={this.state.showAddParticipant} participantsArray={this.state.participants}
                                participants={this.state.numParticipants} setParticipants={this.setParticipants}
                                rentals={this.state.rentals} setRentals={this.setRentals} changeRental={this.changeRental}
                                submitDone={this.submitDone} createForm={this.createForm}/>
                                {this.state.showAddParticipant ? 
                                <Row className="row-margin15-top">
                                    <Col>
                                        <Card className="admin-cards">
                                            <Card.Header>
                                                <Form>
                                                    <Form.Group controlId="input1">
                                                        <Form.Label className="search-label-admin">Add Participant (Search by Name):</Form.Label>
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
                                                search={this.state.search} add={this.addParticipant} 
                                                month={this.state.activeMonth} day={this.state.activeDay}
                                                year={this.state.activeYear} loading={this.state.loading}/>
                                        </Card>
                                    </Col>
                                </Row>
                                : null }
                            </Container>
                    </div>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

function SelectedPage({selection, showBox, box, participantsArray, participants, 
    setParticipants, rentals, setRentals, changeRental, submitDone, createForm}) {
    let added = participantsArray.length
    const [name, setName] = React.useState("")
    const [ButtonArray, setButtonArray] = useState(new Array(added).fill(false));
    const [DoneArray, setDoneArray] = useState(new Array(added).fill(false));
    const [selected, setSelected] = useState([]);
    const [done, setDone] = useState(true)
    const [status, setStatus] = useState("")
    const options = [
        { label: "9.6v Battery", value: "9.6v Battery", number: "N/A" },
        { label: "Condor Sling", value: "Condor Sling", number: "N/A" },
        { label: "Condor Vest", value: "", number: "N/A" },
        { label: "Elite Force 1911", value: "Elite Force 1911", number: "N/A" },
        { label: "Elite Force 1911 Magazine", value: "Elite Force 1911 Magazine", number: "N/A" },
        { label: "Krytac CRB-M", value: "Krytac CRB-M", number: "N/A" },
        { label: "KWA M4", value: "KWA M4", number: "N/A" },
        { label: "Mask", value: "Mask", number: "N/A" },
    ]

    useEffect(() => {
        // This updates the array if there is a new input in the
        // participation array
        if (participantsArray.length !== 0) {
            let i = participantsArray.length - 1;
            let newarray = new Array(participantsArray.length).fill(true)
            newarray.fill(false, i, i+1)
            setDoneArray(newarray)
            setButtonArray(newarray)
        }
    }, [participantsArray.length] )

    // Updates status if selection is changed
    useEffect(() => {
        setStatus("")
    }, [selection])

    return(
        <div className="div-selected-rf">
            {selection === 0 ? 
                <div>
                    <Row className="justify-content-row row-rf">
                        <Col md={4}>
                            <Form className="form-rf">
                                <Form.Group>
                                <Form.Label>Name on Rental Form:</Form.Label>
                                <Form.Control onChange={(e) => setName(e.target.value)}
                                    value={name}
                                    placeholder="Full Name" />
                                </Form.Group>
                            </Form>
                        </Col>
                        <Col md={2}>
                            <Form className="form-rf">
                                <Form.Group>
                                <Form.Label>Participant(s):</Form.Label>
                                <Form.Control onChange={(e) => {
                                    showBox(false)
                                    setParticipants(e.target.value)
                                }}
                                    value={participants}
                                    placeholder="ex: 5"
                                    />
                                </Form.Group>
                            </Form>
                        </Col>
                        <Col md={2}>
                            <Form className="form-rf">
                                <Form.Group>
                                <Form.Label>Date:</Form.Label>
                                <Form.Control disabled
                                    value={new Date().getMonth()+1 + "-" + new Date().getDate() + "-" + new Date().getFullYear()}
                                    />
                                </Form.Group>
                            </Form>
                        </Col>
                    </Row>
                        {participantsArray.map((participant, i) => (
                            <div key={i}>
                                <Row className="justify-content-row row-rf">
                                    {DoneArray[i] === true ? 
                                    <Col md={"auto"}>
                                        <i className="fa fa-check fa-2x text-green"></i>
                                    </Col> : null}
                                    <Col md={"auto"} className="align-items-center-col">
                                        <p className="participant-p">{participant.name.substr(0, participant.name.lastIndexOf('('))}</p>
                                    </Col>
                                    {DoneArray[i] === false ?
                                    <Col md={"auto"} className="align-items-center-col">
                                        <MUIButton
                                            variant="contained"
                                            color="primary"
                                            size="small"
                                            className="add-rental-button-rf"
                                            startIcon={<Icon className="fa fa-plus-circle" />}
                                            onClick={() => {
                                                    let tempArray = [...ButtonArray];
                                                    tempArray[i] = true;
                                                    setButtonArray(tempArray)
                                                }}>
                                            Add Rental
                                        </MUIButton>
                                    </Col> : null}
                                    {ButtonArray[i] === true && DoneArray[i] === false ? 
                                    <Col md={3} className="align-items-center-col">
                                        <MultiSelect
                                                options={options}
                                                value={selected}
                                                onChange={(e) => {
                                                    setSelected(e)
                                                    setRentals(e, i)
                                                }}
                                                labelledBy={"Rental"}
                                                hasSelectAll={false}
                                            />
                                    </Col>
                                    : null}
                                    {ButtonArray[i] === true && DoneArray[i] === false? 
                                    <Col md={"auto"} className="align-items-center-col">
                                        <MUIButton
                                            variant="contained"
                                            color="secondary"
                                            size="small"
                                            className="add-rental-button-rf"
                                            startIcon={<Icon className="fa fa-check" />}
                                            onClick={() => {
                                                    setDone(true)
                                                    let tempArray = [...ButtonArray];
                                                    tempArray[i] = false;
                                                    setButtonArray(tempArray)
                                                    submitDone(participant.name.substr(0, participant.name.lastIndexOf('(')))
                                                    let doneArray = [...DoneArray];
                                                    doneArray[i] = true;
                                                    setDoneArray(doneArray)
                                                    setRentals([], i)
                                                    setSelected([])
                                                }}>
                                            Done
                                        </MUIButton>
                                    </Col> 
                                    : null }
                                </Row>
                                {DoneArray[i] !== true ? 
                                rentals.map((rental, i) => (
                                    <Row key={i} className="justify-content-row">
                                        <Col md={2}>
                                            <Form className="form-rf">
                                                <Form.Group>
                                                <Form.Label column="sm" lg={2} className="rental-label-rf"
                                                >Rental:</Form.Label>
                                                <Form.Control
                                                    disabled
                                                    value={rental?.label}
                                                    size="sm" 
                                                    />
                                                </Form.Group>
                                            </Form>
                                        </Col>
                                        <Col md={2}>
                                            <Form className="form-rf">
                                                <Form.Group>
                                                <Form.Label column="sm" lg={2} className="rental-label-rf"
                                                    >Number:</Form.Label>
                                                <Form.Control onChange={(e) => {
                                                        changeRental(e.target.value, i)
                                                    }}
                                                    value={rental?.number}
                                                    placeholder="Rental #"
                                                    size="sm" 
                                                />
                                                </Form.Group>
                                            </Form>
                                        </Col>
                                    </Row>
                                )) : null}
                            </div>
                        ))
                        }
                    {participants-added > 0 && !box && done ?  
                    <Row className="justify-content-row row-rf">
                        <Col md={8} className="justify-content-flex-end-col col-margin15-right">
                            <Button variant="info" disabled={participants-added <= 0}
                            onClick={() => {
                                showBox(true)
                                setDone(false)
                            }}>
                                Add Participant
                            </Button>
                        </Col> 
                    </Row> : null}
                    <Row className="justify-content-row row-rf">
                        <Col md={8} className="justify-content-flex-end-col col-margin15-right">
                            {participants - added > 0 ? <p className="status-text-rf">{`${participants - added} Participants left to add.`}</p> : null}
                            <Button variant={participants - added > 0 ? "danger" : "success"} disabled={participants-added > 0} 
                            onClick={() => {
                                if (name === "") {
                                    setStatus("Name must be filled out.")
                                }
                                else {
                                    createForm(name)
                                    setName("")
                                    setStatus("Form created.")
                                }
                            }}>
                                Create
                            </Button>
                        </Col>
                    </Row>
                    {status ? <Row className="justify-content-row">
                        <Col md={8} className="justify-content-flex-end-col col-margin15-right">
                            <p className="status-text-rf2">{status}</p>
                        </Col>
                    </Row> : null}
                </div>
            : selection === 1 ?
                <Row>

                </Row>
            :
                <Row>

                </Row>
            }
        </div>
    )
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

function WaiverBox ({waivers, index, search, add, loading, month, day, year}) {
    return (
    <div>
        <Card.Body className="status-card-body-wl-admin">
            <div className="row-allwaivers-wl">
            {!loading ?
            waivers.sort((a, b) => 
            (b.date - a.date))
            .map((waiver, i) => (
                search !== "" ? // Search query case
                    waiver.name.toLowerCase().includes(search.toLowerCase()) ? 
                            index++ % 2 === 0 ? 
                            <Row className="row-wl" key={index}>
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
                                            <Button className="button-submit-admin2" onClick={() => add(waiver)}
                                            type="submit" id="update" variant="success">
                                                Add
                                            </Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                                : 
                            <Row className="status-card-offrow-admin-wl" key={index}>
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
                                            <Button className="button-submit-admin2" onClick={() => {add(waiver)}}
                                            type="submit" id="update" variant="success">
                                                Add
                                            </Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                    : null
                :
                    compareDate(month, day, year, waiver.date ) ?
                            index++ % 2 === 0 ? 
                            <Row className="row-wl" key={index}>
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
                                            <Button className="button-submit-admin2" onClick={() => add(waiver)}
                                            type="submit" id="update" variant="success">
                                                Add 
                                            </Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                                : 
                            <Row className="status-card-offrow-admin-wl" key={index}>
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
                                            <Button className="button-submit-admin2" onClick={() => add(waiver)}
                                            type="submit" id="update" variant="success">
                                                Add
                                            </Button>
                                        </Col>
                                    </Row>
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
    </div>
    )
};

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default compose(
    withAuthorization(condition),
    withFirebase,
)(RentalForm);