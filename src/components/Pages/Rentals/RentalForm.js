import { faCog, faFolderMinus, faFolderOpen, faFolderPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Checkbox, TextField, Modal, Fade, Backdrop, FormControlLabel, Switch } from '@mui/material';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import MUIButton from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Icon from '@mui/material/Icon';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import { ArrowBackIos, ArrowForwardIos, VerifiedUser } from '@mui/icons-material';
import React, { Component, useState, useEffect } from 'react';
import { Breadcrumb, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap/';
import Collapse from '@mui/material/Collapse';
import { LinkContainer } from 'react-router-bootstrap';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/lab/Alert';

import PinCode from '../../constants/pincode'

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import PaymentForm from './components/creditcard';
import * as ROLES from '../../constants/roles';
import { withFirebase } from '../../Firebase';
import { AuthUserContext, withAuthorization } from '../../session';
// Imports for Drag N drop
import EditForm from './EditForm';
import ReturnForm from './ReturnForm';
import { Helmet } from 'react-helmet-async';

import {
    formatCreditCardNumber,
    formatCVC,
    formatExpirationDate,
} from "../../constants/formatcard";

import logo from '../../../assets/usairsoft-small-logo.png';
import '../../../App.css';
import RentalOptions from "./RentalOptions";
import { get, onValue, set, update } from "firebase/database";

import { styled } from '@mui/material/styles';
import { listAll } from 'firebase/storage';

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


const INITIAL_STATE = {
    search: "",
    showAddParticipant: false,
    participants: [],
    rentals: [],
    participantsRentals: [],
    rentalIndex: "",
    rentalsError: null,
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
    addingParticipant: false,
}

class RentalForm extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            waivers: [],
            rentalForms: [],
            options: null,
            members: null,
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
        if (name === "number") {
            this.setState({
                // number: value.replace(/[^\dA-Z]/g, '').replace(/(.{4})/g, '$1 ').trim(),
                // number: value.includes('*') ? this.state.number.slice(0, -1) : value,
                number: formatCreditCardNumber(value),
                numberError: null
            })
        }
        else if (name === "expiry" && value.length < 6) {
            if (value.length < 5) {
                this.setState({
                    // [name]: value.replace(/[^\dA-Z]/g, '').replace(/(.{2})/g, '$1/').trim(), 
                    [name]: formatExpirationDate(value),
                    expiryError: null
                })
            }
            else {
                this.setState({ [name]: value })
            }
        }
        else if (name === "cvc")
            this.setState({
                // [name]: value.replace(/[^\dA-Z]/g, ''), 
                [name]: formatCVC(value),
                cvcError: null
            })
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
        if (cvc === "" || (cvc.length < 3 && cvc.length > 4)) {
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
        get(this.props.firebase.rentalOptions(), obj => {
            let newOptions = obj.val()
            for (let i = 0; i < options.length; i++) {
                let num = options[i].amount !== "" ? parseInt(options[i].amount) : 0
                newOptions[i].stock = parseInt(newOptions[i].stock) + num
                newOptions[i].amount = ""
            }
            set(this.props.firebase.rentalOptions(), newOptions);
        })
    }

    // Creates rental form
    createForm = (e, options) => {
        e.preventDefault()
        if (this.validateCreateForm()) {
            const { cvc, number, expiry, name, zipcode, rentalName, numParticipants } = this.state
            get(this.props.firebase.rentalGroups()).then((obj) => {
                let group = obj.val() ? obj.val() : []
                let i = group.length
                let cc = { cvc, number, expiry, name, zipcode }
                let available = options.filter(opt => opt.amount > 0);
                group.push({ name: rentalName, size: numParticipants, cc, available, complete: false })
                update(this.props.firebase.rentals(), { group }).then(() => {
                    this.grabNewForm(i)
                });
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
            });
        }
    }

    // Grabs newly created form
    grabNewForm = (i) => {
        onValue(this.props.firebase.rentalGroup(i), (obj) => {
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
        // this.props.firebase.rentalGroup(this.state.createdIndex).off()
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

    // Lookup participant to see if they exist already
    // This will mainly be a function to check for members existance
    // Return false if not found, true if found
    lookupMember = (participants, name) => {
        for (let i = 0; i < participants.length; i++) {
            if (participants[i].name === name)
                return true;
        }
        return false;
    }

    // Add to participants
    addParticipant = (ref, isMember) => {
        const { index } = this.state;
        console.log("Adding participant with ref:", ref, "isMember:", isMember, "index:", index);

        this.setState({ addingParticipant: true });

        get(this.props.firebase.rentalGroup(index)).then(groupSnapshot => {
            console.log("Rental group data:", groupSnapshot.val());

            let participants = Array.from(groupSnapshot.val()?.participants || []);

            // Get the waiver data using the reference
            get(this.props.firebase.digitalWaiver(ref)).then(waiverSnapshot => {
                console.log("Waiver data:", waiverSnapshot.val());
                const waiver = waiverSnapshot.val();

                if (this.lookupMember(participants, waiver.name)) {
                    console.log("Member already exists in group");
                    this.setState({
                        rentalsError: "This member is already added to this group.",
                        addingParticipant: false
                    });
                    return;
                }

                let rentals = "";
                let gamepass = false;
                let obj = {
                    name: waiver.name,
                    rentals,
                    gamepass,
                    isMember,
                    email: waiver.email,
                    phone: waiver.phone,
                    dob: waiver.dob
                };

                participants.push(obj);
                console.log("Updating rental group with new participant:", obj);

                update(this.props.firebase.rentalGroup(index), { participants })
                    .then(() => {
                        console.log("Successfully added participant");
                        this.showParticipantBox();
                        this.setState({
                            search: "",
                            addingParticipant: false
                        });
                    })
                    .catch(error => {
                        console.error("Error adding participant:", error);
                        this.setState({
                            rentalsError: "Error adding participant. Please try again.",
                            addingParticipant: false
                        });
                    });
            }).catch(error => {
                console.error("Error fetching waiver:", error);
                this.setState({
                    rentalsError: "Error fetching waiver data. Please try again.",
                    addingParticipant: false
                });
            });
        }).catch(error => {
            console.error("Error fetching rental group:", error);
            this.setState({
                rentalsError: "Error fetching rental group. Please try again.",
                addingParticipant: false
            });
        });
    }

    // Sets index of current selected rental form
    setIndex = (index) => {
        this.setState({ index })
    }

    componentWillUnmount() {
        // this.props.firebase.validatedWaivers().off();
        // this.props.firebase.numWaivers().off();
        // this.props.firebase.rentalGroups().off()
        // this.props.firebase.rentalOptions().off()
        // this.props.firebase.users().off()
    }

    componentDidMount() {
        this.setState({ loading: true });

        // onValue(this.props.firebase.rentalGroups(), (obj) => {
        //     console.log(obj)
        // }, {
        //     onlyOnce: true
        // });

        // get(this.props.firebase.rentalGroups()).then((snapshot) => {
        //     if (snapshot.exists())
        //         console.log(snapshot)
        // })

        onValue(this.props.firebase.numWaivers(), snapshot => {
            let num_waivers = snapshot.val().total_num;
            this.setState({ num_waivers_cur: num_waivers, validateArray: snapshot.val().validated })
        })
        onValue(this.props.firebase.digitalWaivers(), (snapshot) => {
            if (snapshot.exists()) {
                const waiversObject = snapshot.val();
                const tempWaivers = Object.keys(waiversObject).map(key => {
                    const waiver = waiversObject[key];
                    return {
                        name: waiver.name,
                        date: new Date(waiver.timestamp), // Using timestamp field instead
                        ref: key,
                        // Add additional fields that might be useful
                        email: waiver.email,
                        phone: waiver.phone,
                        dob: waiver.dob,
                        address: waiver.address,
                        city: waiver.city,
                        state: waiver.state,
                        zipcode: waiver.zipcode
                    };
                });
                this.setState({ waivers: tempWaivers });
            } else {
                this.setState({ waivers: [] });
            }
        });
        get(this.props.firebase.numWaivers(), snapshot => {
            let prev = snapshot.val().total_num;
            this.setState({ num_waivers_prev: prev })
        })

        onValue(this.props.firebase.rentalGroups(), snapshot => {
            const rentalsObject = snapshot.val()

            let rentalForms = []
            if (rentalsObject) {
                rentalForms = Object.keys(rentalsObject).map(key => ({
                    ...rentalsObject[key]
                }))
            }

            this.setState({ rentalForms })
        })

        onValue(this.props.firebase.users(), snapshot => {
            const usersObject = snapshot.val();

            let usersList = Object.keys(usersObject).map(key => ({
                ...usersObject[key],
                uid: key,
            }));

            this.setState({ members: usersList })
        })

        onValue(this.props.firebase.rentalOptions(), snapshot => {
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

    componentDidUpdate() {
        if (this.state.num_waivers_prev !== this.state.num_waivers_cur) {
            // listAll(this.props.firebase.waiversList()).then((res) => {
            //     var tempWaivers = [];
            //     for (let i = 0; i < res.items.length; i++) {
            //         let waiverName = res.items[i].name
            //         let dateObj = (convertDate(waiverName.substr(waiverName.lastIndexOf('(') + 1).split(')')[0]))
            //         let waiver_obj = {
            //             name: waiverName,
            //             date: dateObj,
            //             ref: res.items[i]
            //         }
            //         tempWaivers.push(waiver_obj)
            //     }
            //     this.setState({ waivers: tempWaivers }, function () {
            //         this.setState({ loading: false })
            //     })
            // }).catch(function (error) {
            //     // Uh-oh, an error occurred!
            //     console.log(error)
            // });
            // get(this.props.firebase.numWaivers(), snapshot => {
            //     let prev = snapshot.val().total_num;
            //     this.setState({ num_waivers_prev: prev })
            // })
        }
    }

    render() {
        const {
            cvc, number, expiry, name, zipcode, cvcError, expiryError, nameError, loading, members, rentalsError,
            numberError, numparticipantsError, rentalnameError, zipcodeError, waivers, createdIndex, hidenav
        } = this.state
        const errorProps = { expiryError, nameError, numberError, numparticipantsError, cvcError, rentalnameError, zipcodeError }
        const add = this.addParticipant
        const waiverProps = { waivers, add, loading, members, firebase: this.props.firebase }

        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div>
                        <Container>
                            <div className="div-rental-form">
                                <Card>
                                    <Card.Body>
                                        <Form onSubmit={(e) => this.createForm(e, this.state.options)}>
                                            {/* Your existing form fields */}
                                        </Form>
                                    </Card.Body>
                                </Card>

                                <Collapse in={this.state.showAddParticipant} timeout="auto" unmountOnExit>
                                    <AddParticipant {...waiverProps} />
                                </Collapse>

                                <Snackbar open={rentalsError !== null} autoHideDuration={6000} onClose={() => this.setState({ rentalsError: null })}>
                                    <Alert onClose={() => this.setState({ rentalsError: null })} severity="error">
                                        {rentalsError}
                                    </Alert>
                                </Snackbar>
                            </div>
                        </Container>
                    </div>
                )}
            </AuthUserContext.Consumer>
        );
    }
}

function CreateForm({ cvc, number, expiry, name, zipcode, handleInputChange, onChange, numParticipants, rentalName, submit, options, validate1stPage,
    cvcError, expiryError, nameError, numberError, numparticipantsError, rentalnameError, zipcodeError, showComplete, hideComplete, authUser,
    createdIndex, firebase, dropNewForm, newForm, hideNav, nav }) {

    const [checked, setChecked] = useState(false)
    const [optionsState, setOptionsState] = useState(JSON.parse(JSON.stringify(options)))
    const [page, setPage] = useState(0)
    const [rentalsError, setRentalsError] = useState(null)
    const [pinError, setPinError] = useState(null)

    function validateItems(e) {
        e.preventDefault()
        for (let i = 0; i < optionsState.length; i++) {
            if (+optionsState[i].amount + +options[i].stock > options[i].max) {
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
                        className="modal-pincode"
                        aria-labelledby="Pincode"
                        open={open}
                        onClose={() => setOpen(false)}
                        closeAfterTransition
                        BackdropComponent={Backdrop}
                        BackdropProps={{
                            timeout: 500,
                        }}>
                        <Fade in={open}>
                            <div>
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
                                                onChange={(e, val) => setChecked(val)}
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
        set(firebase.rentalGroup(createdIndex), (newForm));
    }

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
                        <Table aria-label="summary table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Rental</TableCell>
                                    <TableCell align="center">Amount Rented</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {newForm.available ? newForm.available.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell component="th" scope="row">
                                            {row.label}
                                        </TableCell>
                                        <TableCell align="center">{row.amount}</TableCell>
                                    </TableRow>
                                )) : null}
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
        if (Number.isInteger(parseInt(val)) || val === "") {
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
        let check = true
        for (let i = 0; i < optionsState.length; i++) {
            if (optionsState[i].amount !== "" && parseInt(optionsState[i].amount) < 0)
                check = false
        }
        if (check) {
            setError(null)
            return validate1stPage();
        }
        else {
            setError("Please enter in a valid amount of each equipment you wish to check out.")
            return false
        }
    }

    return (
        <div className="div-add-rental-rf">
            {!nav ?
                <Row className="justify-content-row row-hidenav-rf">
                    <MUIButton
                        className="button-hide-nav-rf"
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
                                <h5 className="h5-rentalform">Notice:</h5>
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
                    <Row className="row-rf">
                        <Col md={7} className="col-textfield-rf col-textfield-left-rf">
                            <TextField id="name" label="Group Name" variant="outlined" required
                                onChange={onChange} value={rentalName} name="rentalName"
                                error={rentalnameError !== null} helperText={rentalnameError} />
                        </Col>
                        <Col md={5} className="col-textfield-rf col-textfield-right-rf">
                            <TextField id="participants" label="# Participants" variant="outlined"
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

// Rows for each rental selection the user will have
const RentalRow = ({ obj, set, i }) => {

    return (
        <Row>
            <Col>
                <Paper className="paper-rental-row-rf">
                    <InputBase
                        placeholder="Amount:"
                        inputProps={{ 'aria-label': 'enter amount' }}
                        type="number"
                        value={obj.amount}
                        onChange={(e) => set(i, e.target.value)}
                    />

                    <Divider orientation="vertical" />
                    <h5>{obj.label}</h5>
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
    const [isMember, setIsMember] = useState(false)
    const [useLegacy, setUseLegacy] = useState(false)

    let newprops = { ...props, search, isMember }

    return (
        <div>
            <Row className="row-margin15-top">
                <Col>
                    <Card className="admin-cards">
                        <Card.Header>
                            <Form onSubmit={e => { e.preventDefault(); }}>
                                <Form.Group controlId="input1" className="add-participant-form-group-rf">
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
                                    <div className="d-flex align-items-center">
                                        <FormControlLabel
                                            label="Members Search"
                                            control={<Checkbox color="primary" />}
                                            value={isMember}
                                            onChange={(e) => {
                                                setIsMember(!isMember)
                                                setUseLegacy(false) // Reset legacy when switching
                                            }}
                                        />
                                        {!isMember && (
                                            <StyledToggle
                                                control={
                                                    <Switch
                                                        checked={useLegacy}
                                                        onChange={() => setUseLegacy(!useLegacy)}
                                                        color="primary"
                                                    />
                                                }
                                                label="Legacy Waivers"
                                            />
                                        )}
                                    </div>
                                </Form.Group>
                            </Form>
                        </Card.Header>
                        {isMember ? (
                            <MemberBox {...newprops} />
                        ) : useLegacy ? (
                            <LegacyWaiverBox {...newprops} />
                        ) : (
                            <WaiverBox {...newprops} />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    )
}

// Converts Non-Members date to a date object
function convertDate(date) {
    // Making date variables in correct format
    date = date.split('-');
    let temp = date[2].split(':')
    date.splice(2, 1)
    date = date.concat(temp)

    // Now to changing them to date objects
    return new Date(date[2], date[0] - 1, date[1], date[3], date[4], date[5], date[6])
}

// Converts Members renewal date to a date object
function membersConvertDate(date) {
    if (date === "N/A")
        return new Date(-621672192000001)
    else {
        let temp = date.split("-")
        return (new Date(temp[2], temp[0], temp[1]))
    }
}

// Convert renewal date to date signed up (just subtract one from the year)
function membersConvertRenewal(date) {
    if (date === "N/A")
        return "N/A"
    else {
        let temp = date.split('-')
        let newDate = new Date(temp[2] - 1, temp[0] - 1, temp[1])
        return `${newDate.getMonth() + 1}-${newDate.getDate()}-${newDate.getFullYear()}`
    }
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

function returnDateString(date) {
    return returnDay(date.getDay()) + ", " + date.getDate() + " " + returnMonth(date.getMonth()) + " " + date.getFullYear()
}

function WaiverBox(props) {
    const { waivers, search, add, loading, isMember, addingParticipant } = props;
    return (
        <div>
            <Card.Body className="status-card-body-wl-admin">
                <div className="row-allwaivers-wl">
                    {!loading ?
                        waivers.sort((a, b) =>
                            (b.date) - (a.date)).map((waiver, i) => (
                                search !== "" ? // Search query case
                                    waiver.name.toLowerCase().includes(search.toLowerCase()) ?
                                        <Row className={i % 2 === 0 ? "row-wl" : "status-card-offrow-admin-wl"} key={i}>
                                            <Col className="col-name-fg">
                                                <Card.Text>
                                                    {"(" + i + ") " + waiver.name}
                                                </Card.Text>
                                            </Col>
                                            <Col>
                                                <Row>
                                                    <Col className="col-name-fg">
                                                        {returnDateString(waiver.date)}
                                                    </Col>
                                                    <Col>
                                                        <Button
                                                            className="button-submit-admin2"
                                                            onClick={() => add(waiver.ref, isMember)}
                                                            type="submit"
                                                            id="update"
                                                            variant="success"
                                                            disabled={addingParticipant}
                                                        >
                                                            {addingParticipant ? (
                                                                <Spinner
                                                                    as="span"
                                                                    animation="border"
                                                                    size="sm"
                                                                    role="status"
                                                                    aria-hidden="true"
                                                                />
                                                            ) : (
                                                                'Add'
                                                            )}
                                                        </Button>
                                                    </Col>
                                                </Row>
                                            </Col>
                                        </Row>
                                        : null
                                    : // No search query case
                                    <Row className={i % 2 === 0 ? "row-wl" : "status-card-offrow-admin-wl"} key={i}>
                                        <Col className="col-name-fg">
                                            <Card.Text>
                                                {"(" + i + ") " + waiver.name}
                                            </Card.Text>
                                        </Col>
                                        <Col>
                                            <Row>
                                                <Col className="col-name-fg">
                                                    {returnDateString(waiver.date)}
                                                </Col>
                                                <Col>
                                                    <Button
                                                        className="button-submit-admin2"
                                                        onClick={() => add(waiver.ref, isMember)}
                                                        type="submit"
                                                        id="update"
                                                        variant="success"
                                                        disabled={addingParticipant}
                                                    >
                                                        {addingParticipant ? (
                                                            <Spinner
                                                                as="span"
                                                                animation="border"
                                                                size="sm"
                                                                role="status"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            'Add'
                                                        )}
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
}

function MemberBox(props) {
    const { members, search, add, loading, isMember } = props
    return (
        <div>
            <Card.Body className="status-card-body-wl-admin">
                <div className="row-allwaivers-wl">
                    {!loading ?
                        members.sort((a, b) =>
                            (membersConvertDate(b.renewal) - membersConvertDate(a.renewal)))
                            .map((user, i) => (
                                search !== "" ? // Search query case
                                    user.name.toLowerCase().includes(search.toLowerCase()) ?
                                        i % 2 === 0 ?
                                            <Row className="row-wl" key={i}>
                                                <Col className="col-name-fg">
                                                    <Card.Text>
                                                        {"(" + i + ") " + user.name}
                                                    </Card.Text>
                                                </Col>
                                                <Col>
                                                    <Row>
                                                        <Col className="col-name-fg">
                                                            {membersConvertRenewal(user.renewal)}
                                                        </Col>
                                                        <Col>
                                                            <Button className="button-submit-admin2" onClick={() => add(`${user.name}(${membersConvertRenewal(user.renewal)})`, isMember)}
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
                                                        {"(" + i + ") " + user.name}
                                                    </Card.Text>
                                                </Col>
                                                <Col>
                                                    <Row>
                                                        <Col className="col-name-fg">
                                                            {membersConvertRenewal(user.renewal)}
                                                        </Col>
                                                        <Col>
                                                            <Button className="button-submit-admin2" onClick={() => add(`${user.name}(${membersConvertRenewal(user.renewal)})`, isMember)}
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
                                                    {"(" + i + ") " + user.name}
                                                </Card.Text>
                                            </Col>
                                            <Col>
                                                <Row>
                                                    <Col className="col-name-fg">
                                                        {membersConvertRenewal(user.renewal)}
                                                    </Col>
                                                    <Col>
                                                        <Button className="button-submit-admin2" onClick={() => add(`${user.name}(${membersConvertRenewal(user.renewal)})`, isMember)}
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
                                                    {"(" + i + ") " + user.name}
                                                </Card.Text>
                                            </Col>
                                            <Col>
                                                <Row>
                                                    <Col className="col-name-fg">
                                                        {membersConvertRenewal(user.renewal)}
                                                    </Col>
                                                    <Col>
                                                        <Button className="button-submit-admin2" onClick={() => add(`${user.name}(${membersConvertRenewal(user.renewal)})`, isMember)}
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

function LegacyWaiverBox(props) {
    const [loading, setLoading] = useState(true);
    const [legacyWaivers, setLegacyWaivers] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        listAll(props.firebase.waiversList()).then((res) => {
            const tempWaivers = res.items.map(item => {
                const waiverName = item.name;
                const dateObj = convertDate(waiverName.substr(waiverName.lastIndexOf('(') + 1).split(')')[0]);
                return {
                    name: waiverName.substr(0, waiverName.lastIndexOf('(')),
                    date: dateObj,
                    ref: item,
                    isLegacy: true
                };
            });
            setLegacyWaivers(tempWaivers);
            setLoading(false);
        }).catch(error => {
            console.log(error);
            setError("Failed to load legacy waivers");
            setLoading(false);
        });
    }, [props.firebase]);

    if (loading) {
        return <Spinner animation="border" />;
    }

    return (
        <Card.Body>
            <TableContainer component={Paper} className="table-edit-rf">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {legacyWaivers.map((waiver, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{waiver.name}</TableCell>
                                <TableCell>
                                    {`${returnDay(waiver.date.getDay())}, ${waiver.date.getDate()} ${returnMonth(waiver.date.getMonth())} ${waiver.date.getFullYear()}`}
                                </TableCell>
                                <TableCell>
                                    <MUIButton
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        onClick={() => props.addParticipant(waiver.ref, false)}
                                    >
                                        Add
                                    </MUIButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {error && (
                <Alert severity="error" className="mt-3">
                    {error}
                </Alert>
            )}
        </Card.Body>
    );
}

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(RentalForm));

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
// )(RentalForm);