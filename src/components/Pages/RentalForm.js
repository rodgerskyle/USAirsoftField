import { faCog, faFolderMinus, faFolderOpen, faFolderPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, Checkbox, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, TextField, Modal, Fade, Backdrop, AccordionActions } from '@material-ui/core';
import BottomNavigation from '@material-ui/core/BottomNavigation';
import BottomNavigationAction from '@material-ui/core/BottomNavigationAction';
import MUIButton from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import InputBase from '@material-ui/core/InputBase';
import Paper from '@material-ui/core/Paper';
import { makeStyles, withStyles } from '@material-ui/core/styles';
import { AddRounded, ArrowBackIos, ArrowForwardIos, Contacts, RemoveRounded, Edit, VerifiedUser } from '@material-ui/icons';
import React, { Component, useState, useEffect } from 'react';
import { Breadcrumb, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap/';
import Collapse from '@material-ui/core/Collapse';
import { LinkContainer } from 'react-router-bootstrap';
import { compose } from 'recompose';

import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

import PinCode from '../constants/pincode'

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableFooter from '@material-ui/core/TableFooter';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import PaymentForm from '../constants/creditcard';
import * as ROLES from '../constants/roles';
import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';
// Imports for Drag N drop
import EditSelectedForm from './EditSelectedForm';
import ReturnForm from './ReturnForm';

import logo from '../../assets/logo.png';
import '../../App.css';
import RentalOptions from "./RentalOptions";

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
    participants: [],
    rentals: [],
    participantsRentals: [],
    rentalIndex: "",
    index: "",
    newForm: null,
    createdIndex: "",
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
            options: null,
            hidenav: false,
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
        this.hideComplete = this.hideComplete.bind(this)
        this.setIndex = this.setIndex.bind(this)
    }

    // Normal onChange function for input boxes
    onChange = (event) => {
        this.setState({ [event.target.name]: event.target.value });
        this.setState({ [event.target.name.toLowerCase() + "Error"]: null });
    };

    // Passed to credit card page to handle change
    handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === "number" && value.length < 17) {
            this.setState({
                // number: value.replace(/[^\dA-Z]/g, '').replace(/(.{4})/g, '$1 ').trim(),
                number: value.includes('*') ? this.state.number.slice(0, -1) : value,
                numberError: null
            })
        }
        else if (name === "expiry" && value.length < 6) {
            if (value.length < 5)
                this.setState({ [name]: value.replace(/[^\dA-Z]/g, '').replace(/(.{2})/g, '$1/').trim(), expiryError: null })
            else
                this.setState({ [name]: value })
        }
        else if (name === "cvc" && value.length < 4)
            this.setState({ [name]: value.replace(/[^\dA-Z]/g, ''), cvcError: null })
        else if (name === "name")
            this.setState({ [name]: value.replace(/^\d+$/, ''), nameError: null })
        else if (name === "zipcode" && value.length < 6)
            this.setState({ [name]: value.replace(/[^\dA-Z]/g, ''), zipcodeError: null })
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
        const { cvc, number, expiry, name, zipcode } = this.state
        let check = true
        if (cvc === "" || cvc.length !== 3) {
            this.setState({ cvcError: "Enter a valid CVC." })
            check = false
        }
        if (number === "" || number.length < 15) {
            this.setState({ numberError: "Enter a valid card number." })
            check = false
        }
        if (expiry === "" || expiry.length !== 5) {
            this.setState({ expiryError: "Enter in MM/YY format." })
            check = false
        }
        if (name === "") {
            this.setState({ nameError: "Enter the name on card." })
            check = false
        }
        if (zipcode === "" || zipcode.length !== 5) {
            this.setState({ zipcodeError: "Enter valid US Zipcode." })
            check = false
        }
        return check
    }

    // Validate 1st page for createform
    validate1stPage() {
        const { rentalName, numParticipants } = this.state
        let check = true
        if (rentalName === "") {
            this.setState({ rentalnameError: "Enter your group name." })
            check = false
        }
        if (numParticipants === "" || numParticipants === 0) {
            this.setState({ numparticipantsError: "Enter valid number of participants." })
            check = false
        }
        return check
    }

    // Increments stock of guns selected from the database
    incrementStock(options) {
        let newOptions = this.state.options;
        for (let i = 0; i < options.length; i++) {
            let num = options[i].amount !== "" ? parseInt(options[i].amount) : 0
            newOptions[i].stock = parseInt(newOptions[i].stock) + num
            newOptions[i].amount = ""
        }
        this.props.firebase.rentalOptions().set(newOptions)
    }

    // Creates rental form
    createForm = (e, options) => {
        e.preventDefault()
        if (this.validateCreateForm()) {
            const { cvc, number, expiry, name, zipcode, rentalName, numParticipants } = this.state
            this.props.firebase.rentalGroups().once("value", (obj) => {
                let group = obj.val() ? obj.val() : []
                let i = group.length
                let cc = { cvc, number, expiry, name, zipcode }
                let available = options.filter(opt => opt.amount > 0);
                group.push({ name: rentalName, size: numParticipants, cc, available, complete: false})
                this.props.firebase.rentals().update({group}, () => {
                    this.grabNewForm(i)
                })
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
                    createdIndex: i
                })
                this.incrementStock(options)
            })
        }
    }

    // Grabs newly created form
    grabNewForm = (i) => {
        this.props.firebase.rentalGroup(i).on("value", (obj) => {
            const newForm = obj.val()

            this.setState({ newForm })
        })
    }

    // Hide navbar toggle
    hideNav = () => {
        this.setState({ hidenav: true })
    }

    dropNewForm = () => {
        this.setState({ hidenav: false })
        this.props.firebase.rentalGroup(this.state.createdIndex).off()
    }

    // Hides complete status
    hideComplete = () => { this.setState({ showComplete: false }) }

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
    setRentals = (obj) => {
        this.setState({ rentals: obj })
    }

    // Show the search participant box
    showParticipantBox = (val) => {
        if (typeof val !== 'undefined')
            this.setState({ showAddParticipant: val, showAddRental: false })
        else
            this.setState({ showAddParticipant: !this.state.showAddParticipant, showAddRental: false })
    }

    // Add to participants
    addParticipant = (name) => {
        const { index, rentalForms } = this.state
        let participants = Array.from(rentalForms[index].participants ? rentalForms[index].participants : [])
        let rentals = ""
        let gamepass = false
        let obj = { name, rentals, gamepass }
        // participants.splice(participants.length, 0, obj);
        participants.push(obj)
        this.props.firebase.rentalGroup(index).update({ participants })
        this.props.firebase.validatedWaiver(name).set({ attached: true })
        this.showParticipantBox()
        this.setState({ search: "" })
    }

    // Sets index of current selected rental form
    setIndex(index) {
        this.setState({ index })
    }

    componentWillUnmount() {
        this.props.firebase.validatedWaivers().off();
        this.props.firebase.rentalGroups().off()
        this.props.firebase.rentalOptions().off()
    }

    componentDidMount() {
        this.setState({ loading: true });

        this.props.firebase.validatedWaivers().on('value', snapshot => {
            const filesObject = snapshot.val()

            let validatedList = Object.keys(filesObject).map(key => ({
                ...filesObject[key],
                filename: key,
            }));

            this.setState({ waivers: validatedList })
        })

        this.props.firebase.rentalGroups().on('value', snapshot => {
            const rentalsObject = snapshot.val()

            let rentalForms = []
            if (rentalsObject) {
                rentalForms = Object.keys(rentalsObject).map(key => ({
                    ...rentalsObject[key]
                }))
            }

            this.setState({ rentalForms })
        })

        this.props.firebase.rentalOptions().on('value', snapshot => {
            const optionsObject = snapshot.val()

            // let optionsObjectarr = {};
            // for (let i=0; i<optionsObject.length; i++)
            //     optionsObjectarr[optionsObject[i].value] = {...optionsObject[i]}

            let options = Object.keys(optionsObject).map(key => ({
                ...optionsObject[key]
            }))

            this.setState({ options, loading: false })
        })
    }

    render() {
        const {
            cvc, number, expiry, name, zipcode, cvcError, expiryError, nameError, loading,
            numberError, numparticipantsError, rentalnameError, zipcodeError, rentalForms,
            waivers, createdIndex, hidenav
        } = this.state
        const errorProps = { expiryError, nameError, numberError, numparticipantsError, cvcError, rentalnameError, zipcodeError }
        const add = this.addParticipant
        const waiverProps = { waivers, add, loading }

        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="background-static-all">
                        <Container>
                            <h2 className="admin-header">Rental Form</h2>
                            {!hidenav ?
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
                                </Breadcrumb> : null}
                            {!hidenav ?
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
                                            <BottomNavigationAction className="bottom-nav-rf" label="Rentals" icon={<FontAwesomeIcon icon={faCog} className="icons-rf" />} />
                                        </BottomNavigation>
                                    </Col>
                                </Row>
                                : null}
                            {this.state.value === 0 ?
                                !loading ?
                                    <CreateForm cvc={cvc} number={number} expiry={expiry} name={name} zipcode={zipcode} handleInputChange={this.handleInputChange}
                                        numParticipants={this.state.numParticipants} rentalName={this.state.rentalName} onChange={this.onChange} submit={this.createForm}
                                        {...errorProps} checked={this.state.checked} showComplete={this.state.showComplete} hideComplete={this.hideComplete}
                                        options={this.state.options} validate1stPage={this.validate1stPage.bind(this)} authUser={authUser} createdIndex={createdIndex}
                                        firebase={this.props.firebase} dropNewForm={this.dropNewForm.bind(this)} newForm={this.state.newForm} hideNav={this.hideNav.bind(this)}
                                        nav={this.state.hidenav} />
                                    :
                                    <Row className="spinner-standard">
                                        <Spinner animation="border" />
                                    </Row>
                                : null}
                            {this.state.value === 1 ?
                                !loading ?
                                    <div className="div-edit-rf">
                                        <ReturnForm />
                                    </div>
                                    :
                                    <Row className="spinner-standard">
                                        <Spinner animation="border" />
                                    </Row>
                                : null}
                            {this.state.value === 2 ?
                                !loading ?
                                    <div className="div-edit-rf">
                                        <EditForm forms={rentalForms} showAP={this.showParticipantBox} setParentIndex={this.setIndex} showAR={this.showRentalBox}
                                            authUser={authUser} options={JSON.parse(JSON.stringify(this.state.options))} firebase={this.props.firebase}/>
                                    </div>
                                    :
                                    <Row className="spinner-standard">
                                        <Spinner animation="border" />
                                    </Row>
                                : null}
                            {this.state.value === 3 ?
                                !loading ?
                                    <div className="div-edit-rf">
                                        <RentalOptions />
                                    </div>
                                    :
                                    <Row className="spinner-standard">
                                        <Spinner animation="border" />
                                    </Row>
                                : null}
                            <Collapse in={this.state.showAddParticipant} timeout="auto" unmountOnExit>
                                <AddParticipant {...waiverProps} />
                            </Collapse>
                        </Container>
                    </div>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

function CreateForm({ cvc, number, expiry, name, zipcode, handleInputChange, onChange, numParticipants, rentalName, submit, options, validate1stPage,
    cvcError, expiryError, nameError, numberError, numparticipantsError, rentalnameError, zipcodeError, checked, showComplete, hideComplete, authUser,
    createdIndex, firebase, dropNewForm, newForm, hideNav, nav }) {

    const [optionsState, setOptionsState] = useState(JSON.parse(JSON.stringify(options)))
    const [page, setPage] = useState(0)
    const [rentalsError, setRentalsError] = useState(null)
    const [pinError, setPinError] = useState(null)

    const useStyles = makeStyles((theme) => ({
        modal: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        paper: {
            backgroundColor: "rgb(73 80 87 / .9)",
            border: '2px solid #000',
            boxShadow: theme.shadows[5],
            padding: theme.spacing(2, 4, 3),
            borderRadius: "5px",
        },
    }));

    function validateItems(e) {
        e.preventDefault()
        for (let i = 0; i < optionsState.length; i++) {
            if (optionsState[i].amount+options[i].stock > options[i].max) {
                setPage(0)
                setRentalsError(`For the ${optionsState[i].label} rental, we only have ${options[i].max - options[i].stock} left. Please ask a US Airsoft Employee to clarify.`)
                return false;
            }
        }
        setRentalsError(null)
        return true
    }

    function verifyPin(val) {
        if (authUser?.pin === parseInt(val)) {
            setPage(2)
            hideComplete()
            setOpen(false)
        }
        else {
            setPinError("The pin code entered in was not correct. Please try again.")
            setTimeout(() => {
                setPinError(null)
            }, 4000)
        }
    }

    const classes = useStyles()

    const [open, setOpen] = React.useState(false);

    return (
        <div className="div-selected-rf">
            {showComplete ?
                <div>
                    <Row className="row-notice">
                        <h2 className="page-header">Successful Rental Form Creation.</h2>
                    </Row>
                    <Row className="row-notice">
                        <p className="notice-text-g">Please let your U.S. Airsoft employee know that you </p>
                    </Row>
                    <Row className="row-notice">
                        <p className="notice-text-g">have finished and they will take it from here.</p>
                    </Row>
                    <Row className="justify-content-row">
                        <Button className="next-button-rp" variant="info" type="button"
                            onClick={() => {
                                // Show modal to continue to summary page
                                setOpen(true)
                                // setPage(0)
                                // setOptionsState(options)
                                // hideComplete()
                            }}>Continue To Summary</Button>
                    </Row>
                    <Row className="row-notice">
                        <img src={logo} alt="US Airsoft logo" className="small-logo-home" />
                    </Row>

                    <Modal
                        aria-labelledby="Pincode"
                        className={classes.modal}
                        open={open}
                        onClose={() => setOpen(false)}
                        closeAfterTransition
                        BackdropComponent={Backdrop}
                        BackdropProps={{
                            timeout: 500,
                        }}>
                        <Fade in={open}>
                            <div className={classes.paper}>
                                <h2 className="h2-modal-rf">Authenticate To Proceed</h2>
                                <Row className="justify-content-row">
                                    <PinCode completePin={verifyPin} />
                                </Row>
                                {pinError ?
                                    <Row className="justify-content-row">
                                        <p className="p-error-text-dashboard">{pinError}</p>
                                    </Row> : null}
                            </div>
                        </Fade>
                    </Modal>
                </div>
                :
                page === 0 ?
                    <AddRentals setPage={setPage} optionsState={optionsState} setOptionsState={setOptionsState} onChange={onChange}
                        numParticipants={numParticipants} rentalName={rentalName} validate1stPage={validate1stPage} hideNav={hideNav}
                        numparticipantsError={numparticipantsError} rentalnameError={rentalnameError} rentalsError={rentalsError}
                        nav={nav} />
                    :
                    page === 1 ?
                        <div>
                            <div className="div-back-button-2-rf">
                                <MUIButton
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    startIcon={<ArrowBackIos />}
                                    onClick={() => {
                                        setPage(0)
                                    }}>
                                    Back
                        </MUIButton>
                            </div>
                            <Form noValidate autoComplete="off" onSubmit={(e) => {
                                if (validateItems(e)) {
                                    let temp = optionsState
                                    submit(e, temp)
                                }
                            }}>
                                <PaymentForm cvc={cvc} number={number} expiry={expiry} name={name} zipcode={zipcode} handleInputChange={handleInputChange}
                                    cvcError={cvcError} expiryError={expiryError} nameError={nameError} numberError={numberError} zipcodeError={zipcodeError} />
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
                                    equipment back in the same shape they were handed out in. You agree to reimburse US Aisoft for the price of the equipment listed
                                    on the previous page. If the equipment is damaged, lost, stolen or kept, you will be charged.
                                </p>
                                    </Col>
                                </Row>
                            </Form>
                        </div>
                        :
                        page === 2 ?
                            <Summary createdIndex={createdIndex} newForm={newForm} firebase={firebase} setPage={setPage} />
                            :
                            <div>
                                <Row className="row-notice">
                                    <h2 className="page-header">Successful Rental Form Creation.</h2>
                                </Row>
                                <Row className="row-notice">
                                    <p className="notice-text-g">Click return to create another Rental Form.</p>
                                </Row>
                                <Row className="justify-content-row">
                                    <Button className="next-button-rp" variant="info" type="button"
                                        onClick={() => {
                                            setPage(0)
                                            setOptionsState(options)
                                            dropNewForm()
                                            // Get rid of listener on newly created form
                                        }}>Return</Button>
                                </Row>
                                <Row className="row-notice">
                                    <img src={logo} alt="US Airsoft logo" className="small-logo-home" />
                                </Row>
                            </div>
            }
        </div>
    )
}

// Summary of the created rental form
function Summary({ createdIndex, newForm, firebase, setPage }) {

    const [loading] = useState(false)
    const [transaction, setTransaction] = useState("")
    const [error, setError] = useState(null)

    function updateForm() {
        newForm.complete = true;
        newForm.transaction = transaction
        firebase.rentalGroup(createdIndex).set(newForm)
    }

    const useStyles = makeStyles({
        table: {
            '& > *': {
                borderBottom: 'unset',
            },
        },
    });

    const classes = useStyles();

    return (
        <div className="div-add-rental-rf">
            {loading ?
                <Row className="spinner-standard">
                    <Spinner animation="border" />
                </Row>
                :
                <div>
                    <h5 className="h5-title-summary">Rental Form Summary</h5>
                    <div className="div-groupname-summary">
                        <p className="p-groupname-summary">{`Group: ${newForm.name}`}</p>
                    </div>
                    <TableContainer component={Paper} className="table-edit-rf">
                        <Table className={classes.table} aria-label="summary table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Rental</TableCell>
                                    <TableCell align="center">Amount Rented</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {newForm.available.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell component="th" scope="row">
                                            {row.label}
                                        </TableCell>
                                        <TableCell align="center">{row.amount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={4} align="right" className="table-cell-total-participants-rf">
                                        {`${newForm.participants ? newForm.participants.length : 0}/${newForm.size} Waivers Attached`}
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </TableContainer>
                    <div className="div-cc-summary">
                        <Col md={4} className="align-items-center-col">
                            <p className="p-cc-summary">{`Card ending in: ${newForm.cc.number.substr(newForm.cc.number.length - 4)}`}</p>
                        </Col>
                        <Col className="justify-content-flex-end-col">
                            <TextField
                                id="transaction-required"
                                label="Transaction #"
                                variant="outlined"
                                value={transaction}
                                onChange={(e) => setTransaction(e.target.value)}
                            />
                        </Col>
                    </div>
                    <div className="div-summary">
                        <Col md={"auto"} className="justify-content-flex-end-col">
                            {error && <p className="p-error-summary">{error}</p>}
                        </Col>
                        <MUIButton
                            variant="contained"
                            color="primary"
                            size="small"
                            endIcon={<VerifiedUser />}
                            onClick={() => {
                                if (transaction === "")
                                    setError("Please enter a transaction/receipt number.")
                                else {
                                    updateForm()
                                    setPage(3)
                                }
                            }}>
                            Complete Form
                        </MUIButton>
                    </div>
                </div>
            }
        </div>
    )

}

// Add rental when creating a rental form
function AddRentals({ setPage, optionsState, setOptionsState, onChange, validate1stPage, nav,
    rentalName, rentalnameError, numParticipants, numparticipantsError, rentalsError, hideNav }) {
    const [total, setTotal] = useState(calcTotal(optionsState, false))
    const [error, setError] = useState(rentalsError)

    function setNumber(i, val) {
        val = Math.floor(val)
        if (val >= 0) {
            let opt = [...optionsState]
            opt[i].amount = val
            setOptionsState(opt)
            calcTotal(opt, true)
        }
    }

    function calcTotal(opt, flag) {
        let tot = 0;
        for (let i = 0; i < opt.length; i++)
            tot += opt[i].amount * opt[i].cost
        if (flag)
            setTotal(tot.toFixed(2))
        else
            return tot
    }

    function validate() {
        if (total > 0) {
            setError(null)
            return validate1stPage();
        }
        else {
            setError("Please enter in the amount of each equipment you wish to check out.")
            return false
        }
    }

    return (
        <div className="div-add-rental-rf">
            {!nav ?
                <Row className="justify-content-row row-hidenav-rf">
                    <MUIButton
                        className="button-next-create-rf"
                        variant="contained"
                        color="primary"
                        size="small"
                        endIcon={<ArrowForwardIos />}
                        onClick={() => {
                            hideNav()
                        }}>
                        Hide Navbar
                </MUIButton>
                </Row> : null}
            <Row className="justify-content-row">
                <Col>
                    <h5 className="h5-add-rental-rf">Create Rental Form:</h5>
                </Col>
            </Row>
            <Row className="justify-content-row">
                <Col md={4}>
                    <Row className="margin15-bottom">
                        <Col className="col-notice-rf">
                            <Row className="justify-content-row">
                                <h5>Notice:</h5>
                            </Row>
                            <Row>
                                <Col>
                                    <p>
                                        Please enter in the equipment you are needing to check out.
                                        Note that the total price is calculated based on the equipment
                                        being checked out. You will <u>NOT</u> be charged this amount below to
                                        use this equipment.
                                    </p>
                                    <p>
                                        The credit card on the next page will be put
                                        on hold but <u>NOT</u> charged unless in the event of the equipment
                                        being damaged, lost, or stolen.
                                    </p>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                    <Row className="justify-content-row">
                        <Col className="col-total-price-rf">
                            <Row className="justify-content-row margin15-bottom"
                                style={{ textAlign: 'center' }}>
                                Rental Replacement Breakdown:
                            </Row>
                            {optionsState.map((rental, i) => {
                                return (<CostRow key={i} obj={rental} />)
                            })}
                            <Row className="row-margin15-top">
                                <p className="p-total-price-rf">
                                    Total Rental Replacement Value<br />
                                    {`$${total}`}
                                </p>
                            </Row>
                        </Col>
                    </Row>
                    <Row className="justify-content-row row-next-button-rf">
                        <MUIButton
                            className="button-next-create-rf"
                            variant="contained"
                            color="primary"
                            size="small"
                            endIcon={<ArrowForwardIos />}
                            onClick={() => {
                                if (validate())
                                    setPage(1)
                            }}>
                            Next
                        </MUIButton>
                    </Row>
                    {error && <Row className="row-error-rf">{error}</Row>}
                </Col>
                <Col md="auto" className="col-rental-rows-rf">
                    <Row className="justify-content-row row-rf">
                        <Col md={"auto"} className="col-textfield-rf">
                            <TextFieldCreate id="name" label="Group Name" variant="outlined" required
                                onChange={onChange} value={rentalName} name="rentalName"
                                error={rentalnameError !== null} helperText={rentalnameError} />
                        </Col>
                        <Col md={"auto"} className="col-textfield-rf col-textfield-right-rf">
                            <TextFieldCreate id="participants" label="# Participants" variant="outlined"
                                type="number" required onChange={onChange} value={numParticipants} name="numParticipants"
                                error={numparticipantsError !== null} helperText={numparticipantsError} />
                        </Col>
                    </Row>
                    {optionsState.map((rental, i) => {
                        return (<RentalRow key={i} obj={rental} set={setNumber} i={i} />)
                    })}
                </Col>
            </Row>
        </div>
    )
}
const useStyles = makeStyles((theme) => ({
    root: {
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        float: 'right',
        background: '#424242',
        margin: '5px',
        width: 400,
    },
    input: {
        marginLeft: theme.spacing(1),
        color: 'white',
        width: "20%",
    },
    divider: {
        height: 28,
        margin: 4,
        background: "rgba(255, 255, 255, 0.12)",
    },
    label: {
        color: 'white',
        fontSize: "1rem",
        margin: 0,
        flex: 1,
        marginRight: 15,
        marginLeft: 15,
    }
}));

// Rows for each rental selection the user will have
const RentalRow = ({ obj, set, i }) => {
    const classes = useStyles();

    return (
        <Row>
            <Col>
                <Paper className={classes.root}>
                    <InputBase
                        className={classes.input}
                        placeholder="Amount:"
                        inputProps={{ 'aria-label': 'enter amount' }}
                        type="number"
                        value={obj.amount}
                        onChange={(e) => set(i, e.target.value)}
                    />

                    <Divider className={classes.divider} orientation="vertical" />
                    <h5 className={classes.label}>{obj.label}</h5>
                </Paper>
            </Col>
        </Row>
    )
}

const CostRow = ({ obj }) => {
    if (obj.amount !== "") {
        return (
            <Row className="justify-content-row">
                <Col md={8}>
                    {`($${(obj.cost).toFixed(2)}) x${obj.amount} ${obj.value}`}
                </Col>
            </Row>
        )
    }
    else
        return null;
}

function AddParticipant(props) {
    const [search, setSearch] = useState("")
    let newprops = { ...props, search }
    return (
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

function EditForm({ forms, showAP, setParentIndex, authUser, options, firebase }) {
    const [rentalForms, setRentalForms] = useState(forms)
    const [editting, setEditting] = useState(false)
    const [index, setIndex] = useState(-1)
    const [open, setOpen] = useState(false)
    const [optionsState, setOptionsState] = useState(options)
    const [rentalsError, setRentalsError] = useState(null)
    const [rentalsSuccess, setRentalsSuccess] = useState(null)
    const editProps = { showAP, index }

    const [expanded, setExpanded] = React.useState(false);

    useEffect(() => {
        setRentalForms(forms)
    }, [forms])

    // Map the options array with the available one
    function mapOptions(ind) {
        if (rentalForms[ind].available) {
            let new_options = optionsState
            rentalForms[ind].available.forEach(item => {
                let i = parseInt(item.id.substring(1))
                // let i = parseInt(optionsObject[item.value].id.substring(1))
                new_options[i].amount = item.amount
            })
            setOptionsState(new_options)
        }
        else {
            setOptionsState(options)
        }
    }

    const handleChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    function setNumber(i, val) {
        val = Math.floor(val)
        if (val >= 0) {
            let opt = [...optionsState]
            opt[i].amount = val
            setOptionsState(opt)
        }
    }


    // Validates items in selected options for group
    function validateItems(available) {
        let optionsSelected = JSON.parse(JSON.stringify(optionsState))
        // We need to filter out the ones that already had an amount
        if (available) {
            for (let i=0; i < available.length; i++) {
                let y = parseInt(available[i].id.substring(1))
                optionsSelected[y].amount -= available[i].amount
            }
        }
        for (let i = 0; i < optionsState.length; i++) {
            if (optionsSelected[i].amount+options[i].stock > options[i].max) {
                setRentalsError(`For the ${optionsState[i].label} rental, we only have ${options[i].max - options[i].stock} left. Please ask a US Airsoft Employee to clarify.`)
                return false;
            }
        }
        setRentalsError(null)
        return true
    }


    // Increments stock of guns selected from the database
    function incrementStock(available) {
        let newOptions = options;
        let optionsSelected = JSON.parse(JSON.stringify(optionsState))
        // We need to filter out the ones that already had an amount
        if (available) {
            for (let i=0; i < available.length; i++) {
                let y = parseInt(available[i].id.substring(1))
                optionsSelected[y].amount -= available[i].amount
            }
        }
        for (let i = 0; i < options.length; i++) {
            let num = optionsSelected[i].amount !== "" ? parseInt(optionsSelected[i].amount) : 0
            newOptions[i].stock = parseInt(newOptions[i].stock) + num
            newOptions[i].amount = ""
        }
        firebase.rentalOptions().set(newOptions)
    }

    // Changes group max size
    function changeMax(add) {
        let size = parseInt(rentalForms[index].size)
        if (add){
            // Add to max
            size+=1
            firebase.rentalGroup(index).update({size})
        }
        else {
            // Subtract max amount but verify that the number of participants is less
            if (size-1 !== 0) {
                if (rentalForms[index].participants && rentalForms[index].participants.length < size) {
                    size-=1;
                }
                else if (!rentalForms[index].participants) {
                    size-=1;
                }
                else {
                    setRentalsError(`You must remove users in order to decrease the size.`)
                }
                firebase.rentalGroup(index).update({size})
            }
        }
    }

    // Saves changes to rentals done
    function saveAvailable() {
        let available = optionsState.filter(obj => obj.amount > 0)
        if (validateItems(rentalForms[index].available ? rentalForms[index].available : null)) {
            incrementStock(rentalForms[index].available ? rentalForms[index].available : null)
            firebase.rentalGroup(index).update({available})
            setRentalsSuccess(`The ${rentalForms[index].name} group's available rentals was updated.`)
        }
    }

    const useStyles = makeStyles((theme) => ({
        modal: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        paper: {
            backgroundColor: "rgb(73 80 87 / .9)",
            border: '2px solid #000',
            boxShadow: theme.shadows[5],
            padding: theme.spacing(2, 4, 3),
            borderRadius: "5px",
        },
        root: {
            width: '100%',
        },
        heading: {
            fontSize: theme.typography.pxToRem(15),
            flexBasis: '33.33%',
            flexShrink: 0,
            color: 'white',
        },
        secondaryHeading: {
            fontSize: theme.typography.pxToRem(15),
            color: theme.palette.text.secondary,
        },
    }));

    const classes = useStyles()

    return (
        <div>
            {!editting ?
                <div>
                    <h5 className="admin-header">Edit Rental Form</h5>
                    <List className="list-edit-rf">
                        {rentalForms.length > 0 ? 
                        rentalForms.map((form, i) => {
                            if (form.complete === true) {
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
                                                    mapOptions(i)
                                                }}>
                                                <Edit />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                )
                            } else return null
                        }) : <p className="p-empty-rentals-rf">Add Rental Forms to see groups here.</p>}
                    </List>
                </div> :
                <div>
                    <Row className="row-transaction-rf">
                        <h5 className="h5-transaction-rf">{`Transaction #${rentalForms[index].transaction}`}</h5>
                    </Row>
                    <div className="div-back-button-rf">
                        <MUIButton
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<ArrowBackIos />}
                            onClick={() => {
                                setEditting(false)
                                showAP(false)
                            }}>
                            Back
                        </MUIButton>
                    </div>
                    <Row className="justify-content-row row-group-name-rf">
                        {!!authUser.roles[ROLES.ADMIN] ?
                            <IconButton aria-label="edit" style={{ padding: 0, paddingRight: '5px', color: "white" }}
                                onClick={() => {
                                    setOpen(true)
                                }}>
                                <Edit />
                            </IconButton> : null}
                        <h5 className="h5-group-name-rf">{`Group: ${rentalForms[index].name}`}</h5>
                    </Row>
                    <EditSelectedForm {...editProps} />
                    <Modal
                        aria-labelledby="Rental Settings"
                        className={classes.modal}
                        open={open}
                        onClose={() => setOpen(false)}
                        closeAfterTransition
                        BackdropComponent={Backdrop}
                        BackdropProps={{
                            timeout: 500,
                        }}>
                        <Fade in={open}>
                            <div className={classes.paper}>
                                <div className="div-modal-settings-rf">
                                    <Accordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls="summarypanel-content"
                                            id="summarypanel"
                                        >
                                            <Typography className={classes.heading}>General settings</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography>
                                                {`Group: ${rentalForms[index].name}`}<br />
                                                {`Transaction: ${rentalForms[index].transaction}`}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                    <Accordion expanded={expanded === 'panel2'} onChange={handleChange('panel2')}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls="userspanel-content"
                                            id="userspanel"
                                        >
                                            <Typography className={classes.heading}>Users</Typography>
                                            <Typography className={classes.secondaryHeading}>
                                                Increase max number of users in group 
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography>
                                                <IconButton aria-label="edit" style={{ padding: 0, paddingRight: '5px', color: "white" }}
                                                    onClick={() => {
                                                        changeMax(true) 
                                                    }}>
                                                    <AddRounded />
                                                </IconButton>
                                                {rentalForms[index].size}
                                                <IconButton aria-label="edit" style={{ padding: 0, paddingLeft: '5px', color: "white" }}
                                                    onClick={() => {
                                                        changeMax(false)
                                                    }}>
                                                    <RemoveRounded />
                                                </IconButton>
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                    <Accordion expanded={expanded === 'panel3'} onChange={handleChange('panel3')}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls="rentalpanel-content"
                                            id="rentalpanel"
                                        >
                                            <Typography className={classes.heading}>Rentals</Typography>
                                            <Typography className={classes.secondaryHeading}>
                                                Add or remove rentals from group
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails className="accordion-details-rentals-rf">
                                            <Typography>
                                                {optionsState.map((rental, i) => {
                                                    return (<RentalRow key={i} obj={rental} set={setNumber} i={i} />)
                                                })}
                                            </Typography>
                                        </AccordionDetails>
                                        <Divider />
                                        <AccordionActions className="accordion-actions-rentals-rf">
                                            <MUIButton type="button" onClick={() => {
                                                saveAvailable()
                                            }}>
                                                Save
                                            </MUIButton>
                                        </AccordionActions>
                                    </Accordion>
                                    <Accordion expanded={expanded === 'panel4'} onChange={handleChange('panel4')}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls="creditcardpanel-content"
                                            id="creditcardpanel"
                                        >
                                            <Typography className={classes.heading}>Credit Card Information</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography>
                                                {`Name on Card: ${rentalForms[index].cc.name}`}<br />
                                                {`Card Number: ${rentalForms[index].cc.number}`}<br />
                                                {`Expiration: ${rentalForms[index].cc.expiry}`}<br />
                                                {`CVC: ${rentalForms[index].cc.cvc}`}<br />
                                                {`Zipcode: ${rentalForms[index].cc.zipcode}`}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                </div>
                            </div>
                        </Fade>
                    </Modal>
                </div>
            }
                <Snackbar open={rentalsSuccess !== null} autoHideDuration={6000} onClose={() => setRentalsSuccess(null)}>
                    <Alert onClose={() => setRentalsSuccess(null)} severity="success">
                        {rentalsSuccess}
                    </Alert>
                </Snackbar>
                <Snackbar open={rentalsError !== null} autoHideDuration={6000} onClose={() => setRentalsError(null)}>
                    <Alert onClose={() => setRentalsError(null)} severity="error">
                        {rentalsError}
                    </Alert>
                </Snackbar>
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
    return new Date(date[2], date[0] - 1, date[1], date[3], date[4], date[5], date[6])
}

function WaiverBox(props) {
    const { waivers, search, add, loading } = props
    return (
        <div>
            <Card.Body className="status-card-body-wl-admin">
                <div className="row-allwaivers-wl">
                    {!loading ?
                        waivers.sort((a, b) =>
                        (convertDate(b.filename.substr(b.filename.lastIndexOf('(') + 1).split(')')[0]) -
                            convertDate(a.filename.substr(a.filename.lastIndexOf('(') + 1).split(')')[0])))
                            .filter(obj => obj.attached === false).map((waiver, i) => (
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