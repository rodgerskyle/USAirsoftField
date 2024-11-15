import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';

import convertDate from '../utils/convertDate';
import { Button, Form, Container, Card, Row, Col, Breadcrumb, Spinner, Dropdown, Collapse, Modal } from 'react-bootstrap/';
import { LinkContainer } from 'react-router-bootstrap';

import CustomToggle from '../constants/customtoggle'
import CustomMenu from '../constants/custommenu'

import * as ROLES from '../constants/roles';

import { Helmet } from 'react-helmet-async';
import { getDownloadURL, listAll } from 'firebase/storage';
import { get, onValue } from 'firebase/database';

import { FormControlLabel, Switch } from '@mui/material';
import { styled } from '@mui/material/styles';

import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

import SignedWaiver from './SignedWaiver';
import { pdf } from '@react-pdf/renderer';

const StyledToggle = styled(FormControlLabel)({
    marginLeft: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '4px 12px',
    borderRadius: '20px',
    '& .MuiFormControlLabel-label': {
        color: '#fff',
        fontSize: '0.9rem',
        marginLeft: '8px'
    },
    '& .MuiSwitch-root': {
        '& .MuiSwitch-track': {
            backgroundColor: '#666'
        },
        '& .MuiSwitch-thumb': {
            backgroundColor: '#fff'
        }
    }
});

const StyledDropdown = styled(Dropdown)({
    '& .dropdown-toggle': {
        backgroundColor: '#f8f9fa',
        border: '1px solid #ced4da',
        color: '#495057',
        padding: '6px 12px',
        borderRadius: '4px',
        minWidth: '120px',
        textAlign: 'left',
        '&:hover, &:focus': {
            backgroundColor: '#e9ecef',
            borderColor: '#adb5bd'
        }
    },
    '& .dropdown-menu': {
        maxHeight: '300px',
        overflowY: 'auto'
    }
});

class WaiverLookup extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            waivers: [],
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
            useLegacy: false,
            showPdfModal: false,
            pdfUrl: null,
        };
        // this.validate = this.validate.bind(this)
        this.lookup = this.lookup.bind(this)
    }

    componentWillUnmount() {
        //this.props.firebase.waiversList().off();
        // this.props.firebase.numWaivers().off();
    }

    componentDidMount() {
        this.setState({ loading: true });
        this.initializeDates();
        this.loadWaivers();
    }

    initializeDates = () => {
        let date = new Date();
        this.setState({
            activeMonth: date.getMonth() + 1,
            activeDay: date.getDate(),
            activeYear: date.getFullYear()
        });

        let years = [];
        for (let i = 2020; i < date.getFullYear() + 1; i++) {
            years.push(i);
        }

        let months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        this.setState({ years, months });
    }

    loadWaivers = () => {
        if (this.state.useLegacy) {
            this.loadLegacyWaivers();
        } else {
            this.loadDigitalWaivers();
        }
    }

    loadDigitalWaivers = () => {
        onValue(this.props.firebase.digitalWaivers(), snapshot => {
            if (snapshot.exists()) {
                const waiversObject = snapshot.val();
                const tempWaivers = Object.keys(waiversObject).map(key => ({
                    name: waiversObject[key].name,
                    date: new Date(waiversObject[key].timestamp),
                    ref: key,
                    isDigital: true,
                    data: waiversObject[key] // Store full waiver data
                }));
                this.setState({
                    waivers: tempWaivers,
                    loading: false
                });
            }
        });
    }

    loadLegacyWaivers = () => {
        listAll(this.props.firebase.waiversList()).then((res) => {
            var tempWaivers = [];
            for (let i = 0; i < res.items.length; i++) {
                let waiverName = res.items[i].name;
                let dateObj = convertDate(waiverName.substr(waiverName.lastIndexOf('(') + 1).split(')')[0]);
                let waiver_obj = {
                    name: waiverName,
                    date: dateObj,
                    ref: res.items[i],
                    isDigital: false
                };
                tempWaivers.push(waiver_obj);
            }
            this.setState({ waivers: tempWaivers, loading: false });
        }).catch(error => {
            console.log(error);
            this.setState({ loading: false });
        });
    }

    toggleWaiverType = () => {
        this.setState({
            useLegacy: !this.state.useLegacy,
            loading: true
        }, () => {
            this.loadWaivers();
        });
    }

    componentDidUpdate() {
        if (this.state.num_waivers_prev !== this.state.num_waivers_cur) {
            listAll(this.props.firebase.waiversList()).then((res) => {
                var tempWaivers = [];
                for (let i = 0; i < res.items.length; i++) {
                    let waiverName = res.items[i].name
                    let dateObj = (convertDate(waiverName.substr(waiverName.lastIndexOf('(') + 1).split(')')[0]))
                    let waiver_obj = {
                        name: waiverName,
                        date: dateObj,
                        ref: res.items[i]
                    }
                    tempWaivers.push(waiver_obj)
                }
                this.setState({ waivers: tempWaivers }, function () {
                    this.setState({ loading: false })
                })
            }).catch(function (error) {
                // Uh-oh, an error occurred!
                console.log(error)
            });
            get(this.props.firebase.numWaivers(), snapshot => {
                let prev = snapshot.val().total_num;
                this.setState({ num_waivers_prev: prev })
            })
        }
    }

    // Adds user to validate list
    // validate = (file) => {
    //     this.props.firebase.validatedWaiver(file.substr(0, file.lastIndexOf(')')+1)).set({attached: false})
    // }

    // Lookups file to see if it exists in validated array
    lookup = (file) => {
        return this.state.validateArray[file.substr(0, file.lastIndexOf(')') + 1)]
    }

    // Opens User's waiver
    openWaiver = async (ref, isDigital) => {
        if (isDigital) {
            const waiver = this.state.waivers.find(w => w.ref === ref);

            if (waiver && waiver.data) {
                try {
                    // Generate and display PDF
                    const blob = await pdf((
                        <SignedWaiver
                            name={waiver.data.name}
                            email={waiver.data.email}
                            phone={waiver.data.phone}
                            address={waiver.data.address}
                            city={waiver.data.city}
                            state={waiver.data.state}
                            zipcode={waiver.data.zipcode}
                            dob={waiver.data.dob}
                            age={waiver.data.age}
                            participantSignature={waiver.data.participantSignature}
                            guardian={waiver.data.guardian}
                        />
                    )).toBlob();

                    const pdfUrl = URL.createObjectURL(blob);
                    window.open(pdfUrl, '_blank');

                    // Clean up URL after a short delay
                    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
                } catch (error) {
                    console.error('Error generating waiver:', error);
                    alert('Failed to generate waiver. Please try again.');
                }
            }
        } else {
            // Legacy waiver handling
            ref.getDownloadURL().then(url => {
                window.open(url);
            });
        }
    }

    onChange = event => {
        this.setState({ search: event.target.value });
    };

    handleModalClose = () => {
        if (this.state.pdfUrl) {
            URL.revokeObjectURL(this.state.pdfUrl);
        }
        this.setState({
            showPdfModal: false,
            pdfUrl: null
        });
    }

    render() {
        const { loading, waivers, search, activeMonth, activeDay, activeYear, useLegacy, showPdfModal, pdfUrl } = this.state;
        let index = 0;

        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-all">
                        <Helmet>
                            <title>US Airsoft Field: Waiver Lookup</title>
                        </Helmet>
                        <Container>
                            <Row className="align-items-center mb-3">
                                <Col>
                                    <h2 className="admin-header">Waiver Lookup</h2>
                                </Col>
                                <Col xs="auto">
                                    <StyledToggle
                                        control={
                                            <Switch
                                                checked={useLegacy}
                                                onChange={this.toggleWaiverType}
                                                color="primary"
                                                sx={{
                                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                                        color: '#90caf9'
                                                    },
                                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                        backgroundColor: '#90caf9'
                                                    }
                                                }}
                                            />
                                        }
                                        label="Legacy Waivers"
                                    />
                                </Col>
                            </Row>
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
                                                <Row className="align-items-center mt-3">
                                                    <Col md="auto">
                                                        <StyledDropdown>
                                                            <Dropdown.Toggle as={CustomToggle} id="dropdown-month">
                                                                Month: {this.state.activeMonth !== 13 ?
                                                                    returnMonth(this.state.activeMonth - 1) : "None"}
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu as={CustomMenu} className="dropdown-waiverlookup">
                                                                <Dropdown.Item eventKey={13} active={13 === this.state.activeMonth}
                                                                    onClick={() => this.setState({ activeMonth: 13 })}>
                                                                    {"None"}
                                                                </Dropdown.Item>
                                                                {this.state.months.map((month, i) => (
                                                                    <Dropdown.Item key={i} eventKey={i} active={i === this.state.activeMonth - 1}
                                                                        onClick={() => this.setState({ activeMonth: i + 1 })}>
                                                                        {i + 1}
                                                                    </Dropdown.Item>
                                                                ))}
                                                            </Dropdown.Menu>
                                                        </StyledDropdown>
                                                    </Col>
                                                    <Col md="auto">
                                                        <StyledDropdown>
                                                            <Dropdown.Toggle as={CustomToggle} id="dropdown-day">
                                                                Day: {this.state.activeDay !== 32 ?
                                                                    this.state.activeDay : "None"}
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu as={CustomMenu} className="dropdown-waiverlookup">
                                                                <Dropdown.Item eventKey={32} active={32 === this.state.activeDay}
                                                                    onClick={() => this.setState({ activeDay: 32 })}>
                                                                    {"None"}
                                                                </Dropdown.Item>
                                                                {this.state.days.map((day, i) => (
                                                                    <Dropdown.Item key={i} eventKey={i} active={i + 1 === this.state.activeDay}
                                                                        onClick={() => this.setState({ activeDay: i + 1 })}>
                                                                        {i + 1}
                                                                    </Dropdown.Item>
                                                                ))}
                                                            </Dropdown.Menu>
                                                        </StyledDropdown>
                                                    </Col>
                                                    <Col md="auto">
                                                        <StyledDropdown>
                                                            <Dropdown.Toggle as={CustomToggle} id="dropdown-year">
                                                                Year: {this.state.activeYear !== new Date().getFullYear() + 1 ?
                                                                    this.state.activeYear : "None"}
                                                            </Dropdown.Toggle>
                                                            <Dropdown.Menu as={CustomMenu} className="dropdown-waiverlookup">
                                                                <Dropdown.Item eventKey={this.state.years.length + 1}
                                                                    active={new Date().getFullYear() + 1 === this.state.activeYear}
                                                                    onClick={() => this.setState({ activeYear: new Date().getFullYear() + 1 })}>
                                                                    {"None"}
                                                                </Dropdown.Item>
                                                                {this.state.years.map((year, i) => (
                                                                    <Dropdown.Item eventKey={i} key={i} active={year === this.state.activeYear}
                                                                        onClick={() => this.setState({ activeYear: year })}>
                                                                        {year}
                                                                    </Dropdown.Item>
                                                                ))}
                                                            </Dropdown.Menu>
                                                        </StyledDropdown>
                                                    </Col>
                                                </Row>
                                            </Collapse>
                                        </Card.Header>
                                        <WaiverBox
                                            waivers={waivers}
                                            index={index}
                                            search={search}
                                            open={this.openWaiver}
                                            loading={loading}
                                            month={activeMonth}
                                            day={activeDay}
                                            year={activeYear}
                                        />
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

// Compares month, day and year
function compareDate(month, day, year, date2) {
    // month,date,year is selected, date2 is each object
    let o_year = new Date().getFullYear() + 1

    if (year === o_year)
        year = date2.getFullYear()
    if (month === 13)
        month = date2.getMonth() + 1
    if (day === 32)
        day = date2.getDate()

    if (year === date2.getFullYear()
        && month === date2.getMonth() + 1
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
    if (month === 0)
        return "January"
    else if (month === 1)
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

function WaiverBox({ waivers, index, search, open, loading, month, day, year, validate, lookup }) {
    return (
        <Card.Body className="status-card-body-wl-admin">
            {!loading ? (
                <>
                    <Row className="card-header-wl">
                        <Col md={3}>
                            <Card.Text>Name:</Card.Text>
                        </Col>
                        <Col md={4}>
                            <Card.Text>Date Created:</Card.Text>
                        </Col>
                        <Col md={2}></Col>
                    </Row>
                    <div className="row-allwaivers-wl">
                        {waivers.sort((a, b) => (b.date - a.date))
                            .map((waiver, i) => {
                                if (search !== "" && !waiver.name.toLowerCase().includes(search.toLowerCase())) {
                                    return null;
                                }

                                if (!search && !compareDate(month, day, year, waiver.date)) {
                                    return null;
                                }

                                const rowClass = index++ % 2 === 0 ? "row-wl" : "status-card-offrow-admin-wl";

                                return (
                                    <Row className={rowClass} key={index}>
                                        <Col className="col-name-fg" md={3}>
                                            <Card.Text>
                                                {"(" + index + ") " + (waiver.isDigital ? waiver.name : waiver.name.substr(0, waiver.name.lastIndexOf('(')))}
                                            </Card.Text>
                                        </Col>
                                        <Col className="col-name-fg" md={7}>
                                            {returnDay(waiver.date.getDay()) + ", " +
                                                waiver.date.getDate() + " " + returnMonth(waiver.date.getMonth()) +
                                                " " + waiver.date.getFullYear()}
                                        </Col>
                                        <Col md={2}>
                                            <Button
                                                className="button-submit-admin2"
                                                onClick={() => open(waiver.ref, waiver.isDigital)}
                                                type="button"
                                                variant="success"
                                            >
                                                {waiver.isDigital ? 'View' : 'Open'}
                                            </Button>
                                        </Col>
                                    </Row>
                                );
                            })
                        }
                    </div>
                </>
            ) : (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                </div>
            )}
        </Card.Body>
    );
}

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(WaiverLookup));

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
// )(WaiverLookup);