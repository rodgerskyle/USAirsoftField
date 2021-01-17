import React, { Component, useEffect, useState } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col, Breadcrumb, Spinner } from 'react-bootstrap/';
import MUIButton from '@material-ui/core/Button';
import { LinkContainer } from 'react-router-bootstrap';

import BottomNavigation from '@material-ui/core/BottomNavigation';
import BottomNavigationAction from '@material-ui/core/BottomNavigationAction';
import Icon from '@material-ui/core/Icon';

import { faEdit, faFolderPlus, faFolderMinus, faFolderOpen, faTimes, faCheck } from "@fortawesome/free-solid-svg-icons";
import { faSquare, faCheckSquare } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import MultiSelect from "react-multi-select-component"

import * as ROLES from '../constants/roles';
import { TextField, Checkbox, List, ListItem, ListItemAvatar, Avatar, ListItemSecondaryAction, ListItemText, Fab } from '@material-ui/core';
import { Contacts, Edit, ArrowBackIos, Add, Check, Close } from '@material-ui/icons'
import { withStyles } from '@material-ui/core/styles';
import Autocomplete from '@material-ui/lab/Autocomplete';

import PaymentForm from '../constants/creditcard';

// Imports for Drag N drop
import EditSelectedForm from './EditSelectedForm';

//import { DragDropContext, Droppable, Draggable } from '../constants/DragDrop';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// Imports for MUI Table
import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableFooter from '@material-ui/core/TableFooter';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';

const TextFieldCreate = withStyles({
    root: {
      '& label.Mui-focused': {
        color: 'white',
      },
      '& .MuiInput-underline:after': {
        borderBottomColor: 'white',
      },
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: 'white',
        },
        '&:hover fieldset': {
          borderColor: 'white',
        },
        '&.Mui-focused fieldset': {
          borderColor: 'white',
        },
      },
        '& .MuiInputBase-input': {
            color: 'white',
            borderColor: 'white',
        },
        '&.MuiInputBase-root': {
            color: 'white',
        },
        '& .MuiFormLabel-root': {
            color: 'white',
        },
        '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            borderColor: 'white',
        },
    },
  })(TextField);

const INITIAL_STATE = {
    search: "",
    showAddParticipant: false,
    showAddRental: false,
    participants: [],
    rentals: [],
    participantsRentals: [],
    rentalIndex: "",
    index: "",
    //Create form info
    rentalName: '',
    numParticipants: '',
    showComplete: false,
    checked: false,
    //Create form errors
    cvcError: null,
    expiryError: null,
    nameError: null,
    numberError: null,
    zipcodeError: null,
    rentalnameError: null,
    numparticipantsError: null,
    //Credit card stuff to hold for renting
    cvc: '',
    expiry: '',
    name: '',
    number: '',
    zipcode: '',
}

class RentalForm extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            waivers: [],
            rentalForms: [],
            value: 0,
            ...INITIAL_STATE,
        };

        this.showParticipantBox = this.showParticipantBox.bind(this)
        this.setRentals = this.setRentals.bind(this)
        this.changeRental = this.changeRental.bind(this)
        this.submitDone = this.submitDone.bind(this)
        this.createForm = this.createForm.bind(this)
        this.checkRental = this.checkRental.bind(this)
        this.handleInputChange = this.handleInputChange.bind(this)
        this.onChange = this.onChange.bind(this)
        this.setIndex = this.setIndex.bind(this)
        this.showRentalBox = this.showRentalBox.bind(this)
    }

    // Normal onChange function for input boxes
    onChange = (event) => {
        this.setState({ [event.target.name]: event.target.value });
        this.setState({ [event.target.name.toLowerCase()+"Error"]: null });
    };

    // Passed to credit card page to handle change
    handleInputChange = (e) => {
        const { name, value } = e.target;
      
        if (name === "number" && value.length < 20) 
            this.setState({number: value.replace(/[^\dA-Z]/g, '').replace(/(.{4})/g, '$1 ').trim(), numberError: null})
        else if (name === "expiry" && value.length < 6) {
            if (value.length < 5)
                this.setState({ [name]: value.replace(/[^\dA-Z]/g, '').replace(/(.{2})/g, '$1/').trim(), expiryError: null})
            else 
                this.setState({ [name]: value})
        }
        else if (name === "cvc" && value.length < 4)
            this.setState({ [name]: value.replace(/[^\dA-Z]/g, ''), cvcError: null})
        else if (name === "name")
            this.setState({ [name]: value.replace(/^\d+$/, ''), nameError: null})
        else if (name === "zipcode" && value.length < 6) 
            this.setState({ [name]: value.replace(/[^\dA-Z]/g, ''), zipcodeError: null})
    }

    // Checks if all numbers were filled out for rentals
    checkRental = () => {
        for (let i = 0; i < this.state.rentals.length; i++) {
            if (this.state.rentals[i].number === "")
                return false;
        }
        return true;
    }

    // Validate text field for createform
    validateCreateForm() {
        const {cvc, number, expiry, name, zipcode, rentalName, numParticipants} = this.state
        let check = true
        if (cvc === "" || cvc.length !== 3) {
            this.setState({cvcError: "Enter a valid CVC."})
            check = false
        }
        if (number === "" || number.length !== 19) {
            this.setState({numberError: "Enter a valid card number."})
            check = false
        }
        if (expiry === "" || expiry.length !== 5) {
            this.setState({expiryError: "Enter in MM/YY format."})
            check = false
        }
        if (name === "") {
            this.setState({nameError: "Enter the name on card."})
            check = false
        }
        if (zipcode === "" || zipcode.length !== 5) {
            this.setState({zipcodeError: "Enter valid US Zipcode."})
            check = false 
        }
        if (rentalName === "") {
            this.setState({rentalnameError: "Enter your name."})
            check = false
        }
        if (numParticipants === "" || numParticipants === 0) {
            this.setState({numparticipantsError: "Enter valid number of participants."})
            check = false
        }
        return check
    }

    // Creates rental form
    createForm = (e) => {
        e.preventDefault()
        if (this.validateCreateForm()) {
            const {cvc, number, expiry, name, zipcode, rentalName, numParticipants} = this.state
            this.props.firebase.rentals().once("value", (obj) => {
                let i = obj.val().size
                let cc = {cvc, number, expiry, name, zipcode}
                this.props.firebase.rental(i).set({ name: rentalName, size: numParticipants, cc })
                this.props.firebase.rentals().update({ size: i + 1 })
                this.setState({ 
                    rentalName: '',
                    numParticipants: '',
                    cvc: '',
                    expiry: '',
                    name: '',
                    number: '',
                    zipcode: '',
                    showComplete: true,
                    checked: false,
                })
            })
        }
    }

    // Submit participant after done is pressed
    submitDone = (name) => {
        let obj = { name: name, rentals: this.state.rentals }
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
        this.setState({ rentals: temp })
    }

    // Set Rental for participant
    setRentals = (obj, i) => {
        this.setState({ rentals: obj })
    }

    // Shows rental box for current player 
    showRentalBox = (index, name) => {
        this.setState({showAddRental: !this.state.showAddRental, rentalIndex: index, 
            rentalPName: name, showAddParticipant: false})
    }

    // Show the search participant box
    showParticipantBox = () => {
        this.setState({ showAddParticipant: !this.state.showAddParticipant, showAddRental: false })
    }

    // Add to participants
    addParticipant = (name) => {
        const {index} = this.state
        if (!this.containsObject(name, this.state.rentalForms[index].participants)) {
            let participants = this.state.rentalForms[index].participants
            let rentals = ""
            let obj = {name, rentals}
            participants.push(obj)
            this.props.firebase.rental(index).update({participants})
            this.showParticipantBox(false)
            this.setState({ search: "" })
        }
    }

    // Checks if object is already added
    containsObject(obj, list) {
        var i;
        for (i = 0; i < list.length; i++) {
            if (list[i].name === obj) {
                return true;
            }
        }
        return false;
    }

    // Sets index of current selected rental form
    setIndex(index) {
        this.setState({index})
    }

    componentWillUnmount() {
        this.props.firebase.validatedWaivers().off();
    }

    componentDidMount() {
        this.setState({ loading: true });

        this.props.firebase.validatedWaivers().on('value', snapshot => {
            const filesObject = snapshot.val()

            let validatedList = Object.keys(filesObject).map(key => ({
                ...filesObject[key],
                filename: key,
            }));

            this.setState({ waivers: validatedList})
        })

        this.props.firebase.rentals().on('value', snapshot => {
            const rentalsObject = snapshot.val()

            let rentalForms = Object.keys(rentalsObject).map(key => ({
                ...rentalsObject[key]
            }))
            console.log(rentalForms[0])

            this.setState({rentalForms, loading: false })
        })
    }

    render() {
        const {
            cvc, number, expiry, name, zipcode, cvcError, expiryError, nameError, loading,
            numberError, numparticipantsError, rentalnameError, zipcodeError, rentalForms,
            waivers, rentalIndex, rentalPName
        } = this.state
        const errorProps = {expiryError, nameError, numberError, numparticipantsError, cvcError, rentalnameError, zipcodeError}
        const add = this.addParticipant
        const waiverProps = { waivers, add, loading} 
        const rentalProps = {rentalIndex, rentalPName}
        // Tester cokmponents
        const index = 0
        const showAP = this.showParticipantBox
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
                                            this.setState({ value: newvalue, ...INITIAL_STATE })
                                        }}
                                        showLabels
                                        className="navigation-rf"
                                    >
                                        <BottomNavigationAction className="bottom-nav-rf" label="New Form" icon={<FontAwesomeIcon icon={faFolderPlus} className="icons-rf" />} />
                                        <BottomNavigationAction className="bottom-nav-rf" label="Return Form" icon={<FontAwesomeIcon icon={faFolderMinus} className="icons-rf" />} />
                                        <BottomNavigationAction className="bottom-nav-rf" label="Edit Form" icon={<FontAwesomeIcon icon={faFolderOpen} className="icons-rf" />} />
                                    </BottomNavigation>
                                </Col>
                            </Row>
                            {this.state.value === 0 ?
                                <CreateForm cvc={cvc} number={number} expiry={expiry} name={name} zipcode={zipcode} handleInputChange={this.handleInputChange}
                                numParticipants={this.state.numParticipants} rentalName={this.state.rentalName} onChange={this.onChange} submit={this.createForm}
                                {...errorProps} checked={this.state.checked}/>
                            : null }
                            {this.state.value === 1 ? 
                                !loading ?
                                    <div className="div-edit-rf">
                                    </div>
                                : <div>Teswting</div>
                            : null}
                            {this.state.value === 2 ? 
                                !loading ?
                                    <div className="div-edit-rf">
                                        <EditForm2 rentalForms={rentalForms} showAP={this.showParticipantBox} setParentIndex={this.setIndex} showAR={this.showRentalBox}/>
                                    </div>
                                : <div>Teswting</div>
                            : null}
                            {this.state.showAddParticipant ? 
                                <AddParticipant {...waiverProps}/>
                            : null}
                            {this.state.showAddRental ? 
                                <AddRental {...rentalProps}/>
                            : null}
                            {this.state.value === 3 ? 
                                <div>
                                    <EditForm showBox={this.showParticipantBox} box={this.state.showAddParticipant} rentalForms={rentalForms}
                                        participants={this.state.numParticipants} participantsArray={this.state.participants}
                                        rentals={this.state.rentals} setRentals={this.setRentals} changeRental={this.changeRental}
                                        submitDone={this.submitDone} createForm={this.createForm} checkRental={this.checkRental} />
                                    {this.state.showAddParticipant ?
                                        <Row className="row-margin15-top">
                                            <Col>
                                                <Card className="admin-cards">
                                                    <Card.Header>
                                                        <Form onSubmit={e => { e.preventDefault(); }}>
                                                            <Form.Group controlId="input1">
                                                                <Form.Label className="search-label-admin">Add Participant (Search by Name):</Form.Label>
                                                                <Form.Control
                                                                    type="name"
                                                                    autoComplete="off"
                                                                    placeholder="ex: JohnDoe"
                                                                    value={this.state.search}
                                                                    onChange={(e) => {
                                                                        this.onChange(e);
                                                                    }}
                                                                />
                                                            </Form.Group>
                                                        </Form>
                                                    </Card.Header>
                                                    <WaiverBox waivers={this.state.waivers} index={0}
                                                        search={this.state.search} add={this.addParticipant}
                                                        loading={this.state.loading} />
                                                </Card>
                                            </Col>
                                        </Row> : null} 
                                    </div>
                            : null}
                        </Container>
                    </div>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

function CreateForm({cvc, number, expiry, name, zipcode, handleInputChange, onChange, numParticipants, rentalName, submit,
    cvcError, expiryError, nameError, numberError, numparticipantsError, rentalnameError, zipcodeError, checked}) {

    return (
        <div className="div-selected-rf">
            <Form noValidate autoComplete="off" onSubmit={(e) => submit(e)}>
                <Row className="justify-content-row row-rf">
                    <Col md={"auto"} className="col-form-rf">
                        <TextFieldCreate id="name" label="Full Name" variant="outlined" required
                        onChange={onChange} value={rentalName} name="rentalName"
                        error={rentalnameError !== null} helperText={rentalnameError}/>
                    </Col>
                    <Col md={"auto"} className="col-form-rf">
                        <TextFieldCreate id="participants" label="# Participants" variant="outlined" 
                        type="number" required onChange={onChange} value={numParticipants} name="numParticipants"
                        error={numparticipantsError !== null} helperText={numparticipantsError}/>
                    </Col>
                    <Col md={"auto"} className="col-form-rf">
                        <TextFieldCreate id="date" disabled value={new Date().getMonth() + 1 + "-" + new Date().getDate() + "-" + new Date().getFullYear()} 
                        label="Today's Date" variant="outlined"/>
                    </Col>
                </Row>
            <PaymentForm cvc={cvc} number={number} expiry={expiry} name={name} zipcode={zipcode} handleInputChange={handleInputChange}
            cvcError={cvcError} expiryError={expiryError} nameError={nameError} numberError={numberError} zipcodeError={zipcodeError}/>
            <Row className="row-notice-rf">
                <Col md={10}>
                    <Row className="justify-content-flex-end-col">
                        <Col md="auto" className="col-submit-rf">
                            <MUIButton
                                variant="contained"
                                color={checked ? "primary" : "secondary"}
                                size="small"
                                className={checked ? "add-rental-button-rf" : null}
                                disabled={!checked}
                                startIcon={<Icon className="fa fa-check-circle" />}
                                type="submit">
                                Submit
                            </MUIButton>
                        </Col>
                    </Row>
                </Col>
            </Row>
            <Row className="justify-content-row row-notice-rf">
                <Col md={8}>
                    <p className="p-notice-rf">
                        <Checkbox
                            value={checked}
                            name="checked"
                            disabled={checked ? true : false}
                            onChange={onChange}
                            color="primary"
                        />
                        By checking here, you agree that you will return back the rental equipment back to US Airsoft. You agree that you will bring the
                        equipment back in the same shape they were handed out in. You agree to reimburse US Aisoft for the price of the equipment if the 
                        equipment is damaged, lost, stolen or kept.
                    </p>
                </Col>
            </Row>
            </Form>
        </div> 
    )
}

function EditForm({showBox, box, participantsArray, participants, rentalForms,
    setParticipants, rentals, setRentals, changeRental, submitDone, createForm,
    checkRental }) {
    let added = participantsArray.length
    const [name, setName] = React.useState("")
    const [ButtonArray, setButtonArray] = useState(new Array(added).fill(false));
    const [DoneArray, setDoneArray] = useState(new Array(added).fill(false));
    const [selected, setSelected] = useState([]);
    const [done, setDone] = useState(true)
    const [status, setStatus] = useState("")
    const [rentalError, setRentalError] = useState(null)
    const options = [
        { label: "M4 Rental w/ battery", value: "M4 Rental", number: "", checked: false },
        { label: "M4 Magazine", value: "M4 Magazine", number: "", checked: false },
        { label: "Mask", value: "Mask", number: "", checked: false },
        { label: "M4 Premium Rental w/ battery", value: "M4 Premium Rental", number: "", checked: false, },
        { label: "Condor Sling", value: "Condor Sling", number: "", checked: false },
        { label: "Condor Vest", value: "Condor Vest", number: "", checked: false },
        { label: "9.6v Battery", value: "9.6v Battery", number: "", checked: false},
        { label: "Elite Force 1911", value: "Elite Force 1911", number: "", checked: false },
        { label: "Elite Force 1911 Magazine", value: "Elite Force 1911 Magazine", number: "", checked: false},
    ]

    useEffect(() => {
        // This updates the array if there is a new input in the
        // participation array
        if (participantsArray.length !== 0) {
            let i = participantsArray.length - 1;
            let newarray = new Array(participantsArray.length).fill(true)
            newarray.fill(false, i, i + 1)
            setDoneArray(newarray)
            setButtonArray(newarray)
        }
    }, [participantsArray.length])

    return (
        <div className="div-selected-rf">
            <Row className="justify-content-row row-rf">

                <Col md={4}>
                    <Form className="form-rf" onSubmit={e => { e.preventDefault(); }}>
                        <Form.Group>
                            <Form.Label>Name on Rental Form:</Form.Label>
                            <Form.Control onChange={(e) => setName(e.target.value)}
                                value={name}
                                autoComplete="off"
                                placeholder="Full Name" />
                        </Form.Group>
                    </Form>
                </Col>
                <Col md={2}>
                    <Form className="form-rf" onSubmit={e => { e.preventDefault(); }}>
                        <Form.Group>
                            <Form.Label>Participant(s):</Form.Label>
                            <Form.Control onChange={(e) => {
                                showBox(false)
                                setParticipants(e.target.value)
                            }}
                                value={participants}
                                autoComplete="off"
                                placeholder="ex: 5"
                            />
                        </Form.Group>
                    </Form>
                </Col>
                <Col md={2}>
                    <Form className="form-rf" onSubmit={e => { e.preventDefault(); }}>
                        <Form.Group>
                            <Form.Label>Date:</Form.Label>
                            <Form.Control disabled
                                value={new Date().getMonth() + 1 + "-" + new Date().getDate() + "-" + new Date().getFullYear()}
                            />
                        </Form.Group>
                    </Form>
                </Col>
            </Row>
            {participantsArray.map((participant, i) => (
                <div key={i}>
                    <Row className="justify-content-row row-rf">
                        {DoneArray[i] === true ?
                            <Col md={"auto"} className="align-items-center-col">
                                <i className="fa fa-check fa-2x text-green"></i>
                            </Col> : null}
                        <Col md={"auto"} className="align-items-center-col">
                            <FontAwesomeIcon icon={faEdit} className="icon-editing-rf" />
                        </Col>
                        <Col md={"auto"} className="align-items-center-col">
                            <p className="participant-p">{participant.substr(0, participant.lastIndexOf('('))}</p>
                        </Col>
                        {ButtonArray[i] !== true && DoneArray[i] === false ?
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
                        {ButtonArray[i] === true && DoneArray[i] === false ?
                            <Col md={"auto"} className="align-items-center-col">
                                <MUIButton
                                    variant="contained"
                                    color="secondary"
                                    size="small"
                                    className="add-rental-button-rf"
                                    startIcon={<Icon className="fa fa-check" />}
                                    onClick={() => {
                                        if (checkRental()) {
                                            setRentalError(null)
                                            setDone(true)
                                            let tempArray = [...ButtonArray];
                                            tempArray[i] = false;
                                            setButtonArray(tempArray)
                                            submitDone(participant.substr(0, participant.lastIndexOf('(')))
                                            let doneArray = [...DoneArray];
                                            doneArray[i] = true;
                                            setDoneArray(doneArray)
                                            setRentals([], i)
                                            setSelected([])
                                        }
                                        else {
                                            setRentalError("Please fill out numbers for the rentals.")
                                        }
                                    }}>
                                    Done
                                    </MUIButton>
                            </Col>
                            : null}
                    </Row>
                    {DoneArray[i] !== true ?
                        rentals.map((rental, i) => (
                            <Row key={i} className="justify-content-row">
                                <Col md={2}>
                                    <Form className="form-rf" onSubmit={e => { e.preventDefault(); }}>
                                        <Form.Group>
                                            <Form.Label column="sm" lg={2} className="rental-label-rf"
                                            >Rental:</Form.Label>
                                            <Form.Control
                                                disabled
                                                value={rental.label}
                                                size="sm"
                                            />
                                        </Form.Group>
                                    </Form>
                                </Col>
                                <Col md={2}>
                                    <Form className="form-rf" onSubmit={e => { e.preventDefault(); }}>
                                        <Form.Group>
                                            <Form.Label column="sm" lg={2} className="rental-label-rf"
                                            >Number:</Form.Label>
                                            <Form.Control onChange={(e) => {
                                                changeRental(e.target.value, i)
                                            }}
                                                value={rental.number}
                                                placeholder="Rental #"
                                                size="sm"
                                                autoComplete="off"
                                            />
                                        </Form.Group>
                                    </Form>
                                </Col>
                            </Row>
                        )) : null}
                </div>
            ))}
            {rentalError &&
                <Row className="justify-content-row">
                    <span className="error-text-rental-rf">
                        {rentalError}
                    </span>
                </Row>
            }
            {participants - added > 0 && !box && done ?
                <Row className="justify-content-row row-rf">
                    <Col md={8} className="justify-content-flex-end-col col-margin15-right">
                        <Button variant="info" disabled={participants - added <= 0}
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
                    {participants - added > 0 ? <p className="status-text-rf">{`${added}/${participants}`}</p> : null}
                    <Button variant={participants - added > 0 ? "danger" : "success"} disabled={participants - added > 0}
                        onClick={() => {
                            if (name === "") {
                                setStatus("Name must be filled out.")
                                setTimeout(() => {
                                    setStatus("")
                                }, 5000);
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
    )
}

function AddRental(props) {
    const { rentalPName, rentalIndex } = props
    const name = rentalPName.substr(0, rentalPName.lastIndexOf('('))
    const [selected, setSelected] = useState([]);

    const options = [
        { label: "M4 Rental w/ battery", value: "M4 Rental", number: "", checked: false },
        { label: "M4 Magazine", value: "M4 Magazine", number: "", checked: false },
        { label: "Mask", value: "Mask", number: "", checked: false },
        { label: "M4 Premium Rental w/ battery", value: "M4 Premium Rental", number: "", checked: false, },
        { label: "Condor Sling", value: "Condor Sling", number: "", checked: false },
        { label: "Condor Vest", value: "Condor Vest", number: "", checked: false },
        { label: "9.6v Battery", value: "9.6v Battery", number: "", checked: false},
        { label: "Elite Force 1911", value: "Elite Force 1911", number: "", checked: false },
        { label: "Elite Force 1911 Magazine", value: "Elite Force 1911 Magazine", number: "", checked: false},
    ]



    return (
        <div className="div-add-rental-rf">
            <Row>
                <Col>
                    <h5 className="h5-add-rental-rf">{`Add Rental(s) for ${name}`}</h5>
                </Col>
            </Row>
            <Row>
                <Col className="align-items-center-col">
                    <MultiSelect
                        options={options}
                        value={selected}
                        onChange={(e) => {
                            setSelected(e)
                        }}
                        labelledBy={"Rental"}
                        hasSelectAll={false}
                    />
                </Col>
            </Row>
        </div>
    )
}

function AddParticipant(props) {
    const [search, setSearch] = useState("")
    let newprops = {...props, search}
    return(
        <div>
            <Row className="row-margin15-top">
                <Col>
                    <Card className="admin-cards">
                        <Card.Header>
                            <Form onSubmit={e => { e.preventDefault(); }}>
                                <Form.Group controlId="input1">
                                    <Form.Label className="search-label-admin">Add Participant (Search by Name):</Form.Label>
                                    <Form.Control
                                        type="name"
                                        autoComplete="off"
                                        placeholder="ex: JohnDoe"
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                        }}
                                    />
                                </Form.Group>
                            </Form>
                        </Card.Header>
                        <WaiverBox {...newprops} />
                    </Card>
                </Col>
            </Row>
        </div>
    )
}

function EditForm2({rentalForms, showAP, setParentIndex}) {
    const length = rentalForms.length
    const [editting, setEditting] = useState(false)
    const [index, setIndex] = useState(-1)
    const editProps = {showAP, index}
    return (
        <div>
            {!editting ? 
            <List className="list-edit-rf">
                {rentalForms.map((form, i) => {
                    if (i !== length-1) {
                        return (
                            <ListItem key={i}>
                                <ListItemAvatar>
                                    <Avatar>
                                        <Contacts />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={form.name}
                                    secondary={`${form.size} Participants`}
                                />
                                <ListItemSecondaryAction>
                                    <IconButton edge="end" aria-label="edit" 
                                        onClick={() => {
                                                setIndex(i)
                                                setParentIndex(i)
                                                setEditting(true)
                                            }
                                        }>
                                        <Edit />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        )
                    } else return null
                })}
            </List> :
            <div>
                <div className="div-back-button-rf">
                    <MUIButton
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<ArrowBackIos />}
                        onClick={() => {
                            setEditting(false)
                        }}>
                        Back
                    </MUIButton>
                </div>
                <EditSelectedForm {...editProps} />
            </div>
            }
        </div>
    )
}

// Edits the selected rental form so you can add or lookup people's numbers
function EditSelectedFormOld({rentalForms, index, showAP}) {
    const options = [
        { label: "M4 Rental w/ battery", value: "M4 Rental", number: "", checked: false },
        { label: "M4 Magazine", value: "M4 Magazine", number: "", checked: false },
        { label: "Mask", value: "Mask", number: "", checked: false },
        { label: "M4 Premium Rental w/ battery", value: "M4 Premium Rental", number: "", checked: false, },
        { label: "Condor Sling", value: "Condor Sling", number: "", checked: false },
        { label: "Condor Vest", value: "Condor Vest", number: "", checked: false },
        { label: "9.6v Battery", value: "9.6v Battery", number: "", checked: false},
        { label: "Elite Force 1911", value: "Elite Force 1911", number: "", checked: false },
        { label: "Elite Force 1911 Magazine", value: "Elite Force 1911 Magazine", number: "", checked: false},
    ]
    return (
        <TableContainer component={Paper} className="table-edit-rf">
            <Table aria-label="collapsible table">
                <TableHead>
                    <TableRow>
                    <TableCell />
                    <TableCell>Participant Name</TableCell>
                    <TableCell align="right">Number of Rentals</TableCell>
                    <TableCell align="right"></TableCell>
                    <TableCell align="right"></TableCell>
                    <TableCell align="right"></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rentalForms[index]?.participants.map((row, i) => (
                    <MUITableRow key={row.name} row={row} index={i}/>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={4} align="left" className="table-cell-button-rf">
                            <MUIButton
                                variant="contained"
                                color="primary"
                                size="small"
                                startIcon={<Add />}
                                onClick={() => {
                                    showAP()
                                }}>
                                Add Participant
                            </MUIButton>
                        </TableCell>
                        <TableCell colSpan={2} align="right">
                            {`${rentalForms[index]?.participants.length ? rentalForms[index].participants.length : 0}/${rentalForms[index].size} Participants`}
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        {options.map((rental, i) => {
                            return(
                                    <Col>
                                        <Fab color="primary" variant="extended">
                                            {rental.label}
                                        </Fab>
                                    </Col>
                                )}
                            )
                        }
                    </TableRow>
                </TableFooter>
            </Table>
      </TableContainer>
    )
}

const useRowStyles = makeStyles({
    root: {
      '& > *': {
        borderBottom: 'unset',
      },
    },
  });

function MUITableRow(props) {
    const { row } = props;

    const [open, setOpen] = React.useState(false);
    const classes = useRowStyles();
  
    return (
      <React.Fragment>
        <TableRow className={classes.root}>
          <TableCell>
            <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell component="th" scope="row">
            {row.name.substr(0, row.name.lastIndexOf('('))}
          </TableCell>
          <TableCell align="right">{row?.rentals.length}</TableCell>
        </TableRow>
        <TableRow className="collapse-table-row-rf" >
            <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                <Collapse in={open} timeout="auto" unmountOnExit>
                <Box margin={1}>
                    <Typography variant="h6" gutterBottom component="div">
                    {`Rentals for ${row.name.substr(0, row.name.lastIndexOf('('))}`}
                    </Typography>
                    <Table size="small" aria-label="participants-rentals">
                    <TableHead>
                        <TableRow>
                            <TableCell>Rental</TableCell>
                            <TableCell align="right">Number</TableCell>
                            <TableCell align="right">Returned</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {typeof row.rentals === 'object' ?
                        row.rentals.map((rental, i) => (
                        <TableRow key={i}>
                            <TableCell component="th" scope="row">
                            {rental.label}
                            </TableCell>
                            <TableCell align="right">
                                <IconButton aria-label="edit">
                                    <Edit />
                                </IconButton>
                                {rental.number}
                            </TableCell>
                            <TableCell align="right">{!rental.checked ?
                                <FontAwesomeIcon icon={faSquare} className="icon-checked-rf" />
                                :
                                <FontAwesomeIcon icon={faCheckSquare} className="icon-checked-rf" />
                            }</TableCell>
                        </TableRow>
                        )) : null}
                    </TableBody>
                    </Table>
                </Box>
                </Collapse>
            </TableCell>
        </TableRow>
      </React.Fragment>
    );
  }

function convertDate(date) {
    // Making date variables in correct format
    date = date.split('-');
    let temp = date[2].split(':')
    date.splice(2, 1)
    date = date.concat(temp)

    // Now to changing them to date objects
    return new Date(date[2], date[0] - 1, date[1], date[3], date[4], date[5], date[6])
}

function WaiverBox(props) {
    console.log(props)
    const { waivers, search, add, loading } = props
    return (
        <div>
            <Card.Body className="status-card-body-wl-admin">
                <div className="row-allwaivers-wl">
                    {!loading ?
                        waivers.sort((a, b) =>
                        (convertDate(b.filename.substr(b.filename.lastIndexOf('(') + 1).split(')')[0]) -
                            convertDate(a.filename.substr(a.filename.lastIndexOf('(') + 1).split(')')[0])))
                            .map((waiver, i) => (
                                search !== "" ? // Search query case
                                    waiver.filename.toLowerCase().includes(search.toLowerCase()) ?
                                        i % 2 === 0 ?
                                            <Row className="row-wl" key={i}>
                                                <Col className="col-name-fg">
                                                    <Card.Text>
                                                        {"(" + i + ") " + waiver.filename.substr(0, waiver.filename.lastIndexOf('('))}
                                                    </Card.Text>
                                                </Col>
                                                <Col>
                                                    <Row>
                                                        <Col className="col-name-fg">
                                                            {waiver.filename.substr(waiver.filename.lastIndexOf('(') + 1).split(')')[0]}
                                                        </Col>
                                                        <Col>
                                                            <Button className="button-submit-admin2" onClick={() => add(waiver.filename)}
                                                                type="submit" id="update" variant="success">
                                                                Add
                                                            </Button>
                                                        </Col>
                                                    </Row>
                                                </Col>
                                            </Row>
                                            :
                                            <Row className="status-card-offrow-admin-wl" key={i}>
                                                <Col className="col-name-fg">
                                                    <Card.Text>
                                                        {"(" + i + ") " + waiver.filename.substr(0, waiver.filename.lastIndexOf('('))}
                                                    </Card.Text>
                                                </Col>
                                                <Col>
                                                    <Row>
                                                        <Col className="col-name-fg">
                                                            {waiver.filename.substr(waiver.filename.lastIndexOf('(') + 1).split(')')[0]}
                                                        </Col>
                                                        <Col>
                                                            <Button className="button-submit-admin2" onClick={() => add(waiver.filename)}
                                                                type="submit" id="update" variant="success">
                                                                Add
                                                            </Button>
                                                        </Col>
                                                    </Row>
                                                </Col>
                                            </Row>
                                        : null
                                    :
                                    i % 2 === 0 ?
                                        <Row className="row-wl" key={i}>
                                            <Col className="col-name-fg">
                                                <Card.Text>
                                                    {"(" + i + ") " + waiver.filename.substr(0, waiver.filename.lastIndexOf('('))}
                                                </Card.Text>
                                            </Col>
                                            <Col>
                                                <Row>
                                                    <Col className="col-name-fg">
                                                        {waiver.filename.substr(waiver.filename.lastIndexOf('(') + 1).split(')')[0]}
                                                    </Col>
                                                    <Col>
                                                        <Button className="button-submit-admin2" onClick={() => add(waiver.filename)}
                                                            type="submit" id="update" variant="success">
                                                            Add
                                        </Button>
                                                    </Col>
                                                </Row>
                                            </Col>
                                        </Row>
                                        :
                                        <Row className="status-card-offrow-admin-wl" key={i}>
                                            <Col className="col-name-fg">
                                                <Card.Text>
                                                    {"(" + i + ") " + waiver.filename.substr(0, waiver.filename.lastIndexOf('('))}
                                                </Card.Text>
                                            </Col>
                                            <Col>
                                                <Row>
                                                    <Col className="col-name-fg">
                                                        {waiver.filename.substr(waiver.filename.lastIndexOf('(') + 1).split(')')[0]}
                                                    </Col>
                                                    <Col>
                                                        <Button className="button-submit-admin2" onClick={() => add(waiver.filename)}
                                                            type="submit" id="update" variant="success">
                                                            Add
                                                        </Button>
                                                    </Col>
                                                </Row>
                                            </Col>
                                        </Row>
                            ))
                        :
                        <Row className="spinner-standard">
                            <Spinner animation="border" />
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