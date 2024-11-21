import React, { Component } from 'react';
import { Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap/';
import { TextField, Collapse } from '@mui/material';
import MUIButton from '@mui/material/Button';
import { VerifiedUser } from '@mui/icons-material';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/lab/Alert';
import { withFirebase } from '../../Firebase';
import { AuthUserContext, withAuthorization } from '../../session';
import PaymentForm from './components/creditcard';
import * as ROLES from '../../constants/roles';
import { get, update } from "firebase/database";
import {
    formatCreditCardNumber,
    formatCVC,
    formatExpirationDate,
} from "../../constants/formatcard";
import { styled } from '@mui/material/styles';
import { FormControlLabel } from '@mui/material';
import './rentals.css';
import {
    FormControl,
    FormGroup,
    Checkbox,
    Typography,
    Paper
} from '@mui/material';
import { v4 as uuid } from 'uuid';
import { IconButton } from '@mui/material';
import { Remove, Add } from '@mui/icons-material';
import { CheckCircle } from '@mui/icons-material';

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
};

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

class CreateRentalForm extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            waivers: [],
            rentalForms: [],
            members: null,
            ...INITIAL_STATE,
            selectedRentals: {},
            rentalQuantities: {},
            totalPrice: 0,
            success: false,
            successMessage: ''
        };
    }

    // Keep your existing methods for form handling
    createForm = (e, options) => {
        e.preventDefault();
        if (this.validateCreateForm()) {
            const { cvc, number, expiry, name, zipcode, rentalName, numParticipants, rentalQuantities } = this.state;
            get(this.props.firebase.rentalGroups()).then(async (obj) => {
                try {
                    let group = obj.val() ? obj.val() : [];
                    let i = group.length;
                    let cc = { cvc, number, expiry, name, zipcode };

                    // Create available array with proper quantities
                    let available = options.reduce((acc, opt) => {
                        const quantity = rentalQuantities[opt.id] || 0;
                        const items = Array(quantity).fill({
                            ...opt,
                            id: uuid() // Give each item a unique ID
                        });
                        return [...acc, ...items];
                    }, []);

                    // Get current rental options to update stock
                    const optionsSnapshot = await get(this.props.firebase.rentalOptions());
                    const currentOptions = optionsSnapshot.val();

                    // Update stock numbers for each rental option and convert to object
                    const updatedOptions = currentOptions.reduce((acc, option, index) => {
                        const rentedQuantity = rentalQuantities[option.id] || 0;
                        acc[index] = {
                            ...option,
                            stock: (option.stock || 0) + rentedQuantity
                        };
                        return acc;
                    }, {});

                    // Create new form
                    group.push({
                        name: rentalName,
                        size: numParticipants,
                        cc,
                        available,
                        complete: false
                    });

                    // Update both rental groups and rental options
                    await Promise.all([
                        update(this.props.firebase.rentals(), { group }),
                        update(this.props.firebase.rentalOptions(), updatedOptions)
                    ]);

                    this.setState({
                        ...INITIAL_STATE,
                        success: true,
                        successMessage: 'Rental form created successfully! Please let a US Airsoft staff member know that you are done.',
                        createdIndex: i
                    });
                } catch (error) {
                    console.error('Error creating rental form:', error);
                    this.setState({
                        rentalsError: 'Failed to create rental form. Please try again.'
                    });
                }
            }).catch(error => {
                console.error('Error accessing rental groups:', error);
                this.setState({
                    rentalsError: 'Failed to access rental groups. Please try again.'
                });
            });
        }
    };

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

    // Add this method to handle credit card input changes
    handleInputChange = ({ target }) => {
        if (target.name === "number") {
            target.value = formatCreditCardNumber(target.value);
        } else if (target.name === "expiry") {
            target.value = formatExpirationDate(target.value);
        } else if (target.name === "cvc") {
            target.value = formatCVC(target.value);
        }

        this.setState({
            [target.name]: target.value,
            [`${target.name}Error`]: null
        });
    };

    handleRentalSelect = (rental, quantity = 1) => {
        this.setState(prevState => {
            const currentQuantity = prevState.rentalQuantities[rental.id] || 0;
            const maxStock = rental.max - (rental.stock || 0); // Calculate available stock
            const newQuantity = Math.max(
                0, // Don't go below 0
                Math.min(
                    currentQuantity + quantity,
                    maxStock // Don't exceed available stock
                )
            );

            const newQuantities = {
                ...prevState.rentalQuantities,
                [rental.id]: newQuantity
            };

            // Only mark as selected if quantity > 0
            const newSelectedRentals = {
                ...prevState.selectedRentals,
                [rental.id]: newQuantity > 0
            };

            return {
                selectedRentals: newSelectedRentals,
                rentalQuantities: newQuantities,
                totalPrice: this.calculateTotal(newSelectedRentals, newQuantities)
            };
        });
    };

    calculateTotal = (selectedRentals, quantities) => {
        return this.props.rentalOptions.reduce((total, option) => {
            if (selectedRentals[option.id]) {
                const quantity = quantities[option.id] || 0;
                return total + (option.cost * quantity);
            }
            return total;
        }, 0);
    };

    // Add this method to your CreateRentalForm class
    grabNewForm = (index) => {
        // Redirect to the edit form page with the new form index
        //this.props.history.push(`/rentals/edit/${index}`);
    };

    render() {
        const {
            loading,
            rentalName,
            numParticipants,
            rentalsError,
            showAddParticipant,
            // Add all the error states
            rentalnameError,
            numparticipantsError,
            cvcError,
            numberError,
            expiryError,
            nameError,
            zipcodeError,
            // Add credit card fields
            number,
            cvc,
            expiry,
            name,
            zipcode,
            selectedRentals,
            rentalQuantities,
            totalPrice,
            success,
            successMessage
        } = this.state;

        const options = this.props.rentalOptions;

        if (success) {
            return <SuccessScreen message={successMessage} />;
        }

        return (
            <Container>
                <Row className="justify-content-center">
                    <Card className="card-rental-form">
                        <Card.Body>
                            <h1 className="rental-form-header">New Rental Form</h1>
                            <Form onSubmit={(e) => this.createForm(e, options)} className="rental-form">
                                <div className="rental-form-fields">
                                    <TextField
                                        className="rental-form-input"
                                        label="Rental Name"
                                        value={rentalName}
                                        onChange={(e) => this.setState({ rentalName: e.target.value })}
                                        error={!!rentalnameError}
                                        helperText={rentalnameError}
                                        required
                                        sx={{
                                            backgroundColor: '#fff',
                                            borderRadius: '4px',
                                            marginBottom: '1rem'
                                        }}
                                    />
                                    <TextField
                                        className="rental-form-input"
                                        label="Number of Participants"
                                        type="number"
                                        value={numParticipants}
                                        onChange={(e) => this.setState({ numParticipants: e.target.value })}
                                        error={!!numparticipantsError}
                                        helperText={numparticipantsError}
                                        required
                                        sx={{
                                            backgroundColor: '#fff',
                                            borderRadius: '4px',
                                            marginBottom: '1rem'
                                        }}
                                    />
                                    <Paper elevation={3} className="rental-options-section">
                                        <Typography variant="h6" className="rental-options-header">
                                            Select Rental Equipment
                                        </Typography>
                                        <FormControl component="fieldset" className="rental-options-group">
                                            <FormGroup>
                                                {options && options.map((option) => (
                                                    <div key={option.id} className="rental-option-item">
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    checked={!!selectedRentals[option.id]}
                                                                    onChange={() => this.handleRentalSelect(option, 1)}
                                                                    disabled={option.stock >= option.max}
                                                                />
                                                            }
                                                            label={
                                                                <div className="rental-option-label">
                                                                    <span>{option.label}</span>
                                                                    <span className="rental-option-price">
                                                                        ${option.cost.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            }
                                                        />
                                                        {selectedRentals[option.id] && (
                                                            <div className="rental-quantity-controls">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => this.handleRentalSelect(option, -1)}
                                                                >
                                                                    <Remove />
                                                                </IconButton>
                                                                <Typography variant="body1">
                                                                    {rentalQuantities[option.id] || 0}
                                                                </Typography>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => this.handleRentalSelect(option, 1)}
                                                                    disabled={
                                                                        rentalQuantities[option.id] >= option.max
                                                                    }
                                                                >
                                                                    <Add />
                                                                </IconButton>
                                                            </div>
                                                        )}
                                                        <Typography variant="caption" color="textSecondary">
                                                            {option.stock >= option.max
                                                                ? 'Out of stock'
                                                                : `${option.max - option.stock} available`}
                                                        </Typography>
                                                    </div>
                                                ))}
                                            </FormGroup>
                                        </FormControl>
                                        <div className="rental-total">
                                            <Typography variant="h6">
                                                Total: ${totalPrice.toFixed(2)}
                                            </Typography>
                                        </div>
                                    </Paper>
                                    <PaymentForm
                                        handleInputChange={this.handleInputChange}
                                        cvc={cvc}
                                        expiry={expiry}
                                        name={name}
                                        number={number}
                                        zipcode={zipcode}
                                        cvcError={cvcError}
                                        expiryError={expiryError}
                                        nameError={nameError}
                                        numberError={numberError}
                                        zipcodeError={zipcodeError}
                                    />
                                    <div className="rental-form-submit">
                                        <MUIButton
                                            type="submit"
                                            variant="contained"
                                            color="primary"
                                            endIcon={<VerifiedUser />}
                                            className="submit-button"
                                            disabled={totalPrice === 0}
                                        >
                                            Create Rental (${totalPrice.toFixed(2)})
                                        </MUIButton>
                                    </div>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Row>

                <Snackbar
                    open={rentalsError !== null}
                    autoHideDuration={6000}
                    onClose={() => this.setState({ rentalsError: null })}
                >
                    <Alert
                        onClose={() => this.setState({ rentalsError: null })}
                        severity="error"
                    >
                        {rentalsError}
                    </Alert>
                </Snackbar>
            </Container>
        );
    }
}

const SuccessScreen = ({ message }) => (
    <Paper
        elevation={3}
        sx={{
            p: 4,
            textAlign: 'center',
            maxWidth: 600,
            margin: '40px auto',
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
        }}
    >
        <CheckCircle
            sx={{
                fontSize: 64,
                color: 'success.main',
                mb: 2
            }}
        />
        <Typography
            variant="h5"
            sx={{
                mb: 2,
                color: 'text.primary',
                fontWeight: 500
            }}
        >
            Success!
        </Typography>
        <Typography
            variant="body1"
            sx={{
                mb: 3,
                color: 'text.secondary'
            }}
        >
            {message}
        </Typography>
        <MUIButton
            variant="contained"
            color="primary"
            onClick={() => window.location.reload()}
            startIcon={<Add />}
        >
            Create Another Rental
        </MUIButton>
    </Paper>
);

export default withFirebase(CreateRentalForm); 