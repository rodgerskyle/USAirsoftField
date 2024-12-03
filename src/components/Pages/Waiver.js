import React, { useRef, useState } from 'react';
import waiver from './waiver.pdf';
import '../../App.css';
import { Helmet } from 'react-helmet-async';
import { Container, Row, Col, Button, Form, Spinner } from 'react-bootstrap/';
import SignaturePad from 'react-signature-pad-wrapper';
import { Checkbox, FormControlLabel } from '@mui/material';
import ReCAPTCHA from "react-google-recaptcha";
import { withFirebase } from '../Firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons';

import waivercutoff from '../../assets/Waiver-cutoff.png'

const FormField = React.memo(({ label, name, value, onChange, type = "text", placeholder, error }) => (
    <Form.Group>
        <Form.Label>{label}:</Form.Label>
        <Form.Control
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            type={type}
            autoComplete="off"
            placeholder={placeholder || label}
            isInvalid={!!error}
        />
        <Form.Control.Feedback type="invalid">
            {error}
        </Form.Control.Feedback>
    </Form.Group>
));

const Waiver = (props) => {
    const { firebase } = props;

    const [hideWaiver, setHideWaiver] = useState(false);
    const [formState, setFormState] = useState({
        values: {
            fname: '',
            lname: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zipcode: '',
            dob: '',
            pgname: '',
            pgphone: '',
        },
        errors: {},
    });
    const [pgImg, setPgImg] = useState(null);
    const participantSigRef = useRef();
    const guardianSigRef = useRef();
    const [saveButton2, setSaveButton2] = useState(true);
    const [acceptEmailSubscription, setAcceptEmailSubscription] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorWaiver, setErrorWaiver] = useState(null);
    const [agecheck, setAgecheck] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [age, setAge] = useState(null);
    const [participantImg, setParticipantImg] = useState(null);
    const [emailAdded, setEmailAdded] = useState(false);
    const recaptchaRef = useRef();
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);

    const handleSetDob = (value) => {
        setFormState(prev => ({
            ...prev,
            values: { ...prev.values, dob: value },
            errors: { ...prev.errors, dob: '' }
        }));
        const dobDate = new Date(value);
        const age = new Date().getFullYear() - dobDate.getFullYear();
        setAge(age);
    };

    const handlePrint = (event) => {
        event.preventDefault();
        window.open(waiver, "_blank");
    };

    const handleSignatureSave = (type) => {
        if (type === 'participant') {
            if (participantSigRef.current.isEmpty()) {
                setErrorWaiver('Please sign the waiver before saving');
                return;
            }
            setParticipantImg(participantSigRef.current.toDataURL());
        } else {
            if (guardianSigRef.current.isEmpty()) {
                setErrorWaiver('Please sign the guardian section before saving');
                return;
            }
            setPgImg(guardianSigRef.current.toDataURL());
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const { values } = formState;

        // Name validation
        if (!values.fname.trim()) newErrors.fname = 'First name is required';
        if (!values.lname.trim()) newErrors.lname = 'Last name is required';

        // Email validation
        if (!values.email) {
            newErrors.email = 'Email is required';
        } else if (!validateEmail(values.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Phone validation
        if (!values.phone) newErrors.phone = 'Phone number is required';

        // Address validation
        if (!values.address) newErrors.address = 'Street address is required';
        if (!values.city) newErrors.city = 'City is required';
        if (!values.state) newErrors.state = 'State is required';
        if (!values.zipcode) newErrors.zipcode = 'Zip code is required';

        // DOB validation
        if (!values.dob) newErrors.dob = 'Date of birth is required';

        // Guardian info validation for minors
        if (age < 18) {
            if (!values.pgname) newErrors.pgname = 'Guardian name is required';
            if (!values.pgphone) newErrors.pgphone = 'Guardian phone is required';
            if (!pgImg) newErrors.guardianSignature = 'Guardian signature is required';
        }

        // Signature validation
        if (!participantImg) newErrors.participantSignature = 'Participant signature is required';

        setFormState(prev => ({
            ...prev,
            errors: newErrors
        }));

        return Object.keys(newErrors).length === 0;
    };

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    };

    const executeRecaptcha = async (action) => {
        try {
            return await recaptchaRef.current.executeAsync();
        } catch (error) {
            console.error('reCAPTCHA execution failed:', error);
            throw new Error('Failed to verify reCAPTCHA');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            setErrorWaiver('Please correct the errors in the form');
            return;
        }

        setLoading(true);
        setErrorWaiver(null);

        try {
            const token = await executeRecaptcha('submit_waiver');

            const waiverData = {
                name: `${formState.values.fname} ${formState.values.lname}`,
                email: formState.values.email,
                participantSignature: participantImg,
                recaptchaToken: token,
                additionalFields: {
                    phone: formState.values.phone,
                    address: formState.values.address,
                    city: formState.values.city,
                    state: formState.values.state,
                    zipcode: formState.values.zipcode,
                    dob: formState.values.dob,
                    age: age,
                    acceptEmailSubscription: acceptEmailSubscription,
                    ...(age < 18 && pgImg ? {
                        guardianName: formState.values.pgname,
                        guardianPhone: formState.values.pgphone,
                        guardianSignature: pgImg
                    } : {})
                }
            };

            const submitWaiver = firebase.submitWaiver();
            const result = await submitWaiver(waiverData);

            if (result.data.success) {
                setShowSuccessScreen(true);
            } else {
                throw new Error('Waiver submission failed');
            }
        } catch (error) {
            console.error('Error submitting waiver:', error);
            setErrorWaiver(error.message || 'Failed to submit waiver. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const updateForm = (field, value) => {
        setFormState(prev => ({
            ...prev,
            values: { ...prev.values, [field]: value },
            errors: { ...prev.errors, [field]: '' }
        }));
    };

    return (
        <div className="background-static-all">
            <Helmet>
                <title>US Airsoft Field: Waiver</title>
            </Helmet>
            <div className="pdfStyle">
                <Container>
                    {!showSuccessScreen && (
                        <>
                            {/* <Row className="align-items-center mt-2">
                                <Col>
                                    <a href={waiver} target='_blank' rel="noopener noreferrer">
                                        <i className="fa fa-print fa-2x text-white"></i>
                                    </a>
                                </Col>
                            </Row> */}
                            <Row className="align-items-center row-bottom mt-5">
                                <Col className="pdfFile">
                                    <Row className="justify-content-row waiver-row-rp">
                                        <img src={waivercutoff} alt="US Airsoft waiver" className={!hideWaiver ? "waiver-rp" : "waiver-hidden-rp"} />
                                        <Row className="text-block-waiver-rp">
                                            <Button
                                                variant="outline-secondary"
                                                type="button"
                                                className={hideWaiver ? "button-hidden-rp" : ""}
                                                onClick={(e) => handlePrint(e)}
                                            >
                                                Print Waiver
                                                {/* {hideWaiver ? "Show Agreement" : "Hide Agreement"} */}
                                            </Button>
                                        </Row>
                                    </Row>
                                </Col>
                            </Row>
                        </>
                    )}
                    {showSuccessScreen ? (
                        <Row className="justify-content-center">
                            <Col md={8} className="text-center">
                                <div className="success-screen p-4 mt-4">
                                    <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '32px' }} />
                                    <h3 className="mb-3">Waiver Submitted Successfully!</h3>
                                    <p>Thank you for submitting your waiver. You're now ready to play at US Airsoft Field!</p>
                                    {acceptEmailSubscription && (
                                        <p className="mt-2">You've been added to our mailing list and will receive updates about events and promotions.</p>
                                    )}
                                    <div className="mt-4">
                                        <Button
                                            variant="primary"
                                            href="/"
                                            className="me-3"
                                        >
                                            Return to Home
                                        </Button>
                                        <Button
                                            variant="outline-primary"
                                            onClick={() => {
                                                setShowSuccessScreen(false);
                                                setSubmitted(false);
                                                // Reset all form fields to initial state
                                                setFormState({
                                                    values: {
                                                        fname: '',
                                                        lname: '',
                                                        email: '',
                                                        phone: '',
                                                        address: '',
                                                        city: '',
                                                        state: '',
                                                        zipcode: '',
                                                        dob: '',
                                                        pgname: '',
                                                        pgphone: '',
                                                    },
                                                    errors: {},
                                                });
                                                setAge(null);
                                                setParticipantImg(null);
                                                setPgImg(null);
                                                setAcceptEmailSubscription(true);
                                            }}
                                        >
                                            Submit Another Waiver
                                        </Button>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    ) : (
                        <Row className="justify-content-center form-container">
                            <Col md={10} lg={8}>
                                {/* Personal Information */}
                                <h4 className="section-header">Participant Information</h4>
                                <Row>
                                    <Col md={6}>
                                        <FormField
                                            label="First Name"
                                            name="fname"
                                            value={formState.values.fname}
                                            onChange={(value) => updateForm('fname', value)}
                                            error={formState.errors.fname}
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <FormField
                                            label="Last Name"
                                            name="lname"
                                            value={formState.values.lname}
                                            onChange={(value) => updateForm('lname', value)}
                                            error={formState.errors.lname}
                                        />
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <FormField
                                            label="Email"
                                            name="email"
                                            value={formState.values.email}
                                            onChange={(value) => updateForm('email', value)}
                                            type="email"
                                            error={formState.errors.email}
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <FormField
                                            label="Phone Number"
                                            name="phone"
                                            value={formState.values.phone}
                                            onChange={(value) => updateForm('phone', value)}
                                            type="tel"
                                            error={formState.errors.phone}
                                        />
                                    </Col>
                                </Row>

                                {/* Address Information */}
                                <Row>
                                    <Col md={12}>
                                        <FormField
                                            label="Street Address"
                                            name="address"
                                            value={formState.values.address}
                                            onChange={(value) => updateForm('address', value)}
                                            error={formState.errors.address}
                                        />
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={4}>
                                        <FormField
                                            label="City"
                                            name="city"
                                            value={formState.values.city}
                                            onChange={(value) => updateForm('city', value)}
                                            error={formState.errors.city}
                                        />
                                    </Col>
                                    <Col md={4}>
                                        <FormField
                                            label="State"
                                            name="state"
                                            value={formState.values.state}
                                            onChange={(value) => updateForm('state', value)}
                                            error={formState.errors.state}
                                        />
                                    </Col>
                                    <Col md={4}>
                                        <FormField
                                            label="Zip Code"
                                            name="zipcode"
                                            value={formState.values.zipcode}
                                            onChange={(value) => updateForm('zipcode', value)}
                                            error={formState.errors.zipcode}
                                        />
                                    </Col>
                                </Row>

                                {/* Date of Birth */}
                                <Row>
                                    <Col md={12}>
                                        <FormField
                                            label="Date of Birth"
                                            name="dob"
                                            value={formState.values.dob}
                                            onChange={handleSetDob}
                                            type="date"
                                            error={formState.errors.dob}
                                        />
                                    </Col>
                                    {/* <Col md={6}>
                                        <FormField
                                            label="Age"
                                            name="age"
                                            value={age}
                                            onChange={setAge}
                                            type="number"
                                        />
                                    </Col> */}
                                </Row>

                                {/* Parent/Guardian Information (shown if under 18) */}
                                {age && parseInt(age) < 18 && (
                                    <>
                                        <h4 className="section-header mt-4">Parent/Guardian Information</h4>
                                        <Row>
                                            <Col md={6}>
                                                <FormField
                                                    label="Parent/Guardian Name"
                                                    name="pgname"
                                                    value={formState.values.pgname}
                                                    onChange={(value) => updateForm('pgname', value)}
                                                    error={formState.errors.pgname}
                                                />
                                            </Col>
                                            <Col md={6}>
                                                <FormField
                                                    label="Parent/Guardian Phone"
                                                    name="pgphone"
                                                    value={formState.values.pgphone}
                                                    onChange={(value) => updateForm('pgphone', value)}
                                                    type="tel"
                                                    error={formState.errors.pgphone}
                                                />
                                            </Col>
                                        </Row>
                                    </>
                                )}

                                {/* Signature Sections */}
                                <h4 className="section-header mt-4">Participant Signature</h4>
                                <div className="signature-container">
                                    {participantImg ? (
                                        <div className="saved-signature">
                                            <img src={participantImg} alt="Participant Signature" style={{ maxWidth: '100%', height: 'auto' }} />
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    setParticipantImg(null);
                                                    setSaveButton2(true);
                                                }}
                                                className="mt-2"
                                            >
                                                Clear Saved Signature
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="signature-pad-container">
                                                <SignaturePad
                                                    ref={participantSigRef}
                                                    options={{
                                                        penColor: 'black',
                                                        backgroundColor: 'rgb(255, 255, 255)',
                                                        minWidth: 1,
                                                        maxWidth: 2.5,
                                                    }}
                                                />
                                            </div>
                                            {formState.errors.participantSignature && (
                                                <div className="text-danger mt-2">
                                                    {formState.errors.participantSignature}
                                                </div>
                                            )}
                                            <div className="signature-buttons">
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => participantSigRef.current?.clear()}
                                                    className="me-2"
                                                >
                                                    Clear
                                                </Button>
                                                <Button
                                                    variant="primary"
                                                    onClick={() => handleSignatureSave('participant')}
                                                >
                                                    Save Signature
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Guardian Signature */}
                                {age && parseInt(age) < 18 && (
                                    <>
                                        <h4 className="section-header mt-4">Parent/Guardian Signature</h4>
                                        <div className="signature-container">
                                            {pgImg ? (
                                                <div className="saved-signature">
                                                    <img src={pgImg} alt="Guardian Signature" style={{ maxWidth: '100%', height: 'auto' }} />
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => {
                                                            setPgImg(null);
                                                            setSaveButton2(true);
                                                        }}
                                                        className="mt-2"
                                                    >
                                                        Clear Saved Signature
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="signature-pad-container">
                                                        <SignaturePad
                                                            ref={guardianSigRef}
                                                            options={{
                                                                penColor: 'black',
                                                                backgroundColor: 'rgb(255, 255, 255)',
                                                                minWidth: 1,
                                                                maxWidth: 2.5,
                                                            }}
                                                        />
                                                    </div>
                                                    {formState.errors.guardianSignature && (
                                                        <div className="text-danger mt-2">
                                                            {formState.errors.guardianSignature}
                                                        </div>
                                                    )}
                                                    <div className="signature-buttons">
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => guardianSigRef.current?.clear()}
                                                            className="me-2"
                                                        >
                                                            Clear
                                                        </Button>
                                                        <Button
                                                            variant="primary"
                                                            onClick={() => handleSignatureSave('guardian')}
                                                        >
                                                            Save Guardian Signature
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Email Subscription Checkbox */}
                                <Row className="mt-4">
                                    <Col>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={acceptEmailSubscription}
                                                    onChange={(e) => setAcceptEmailSubscription(e.target.checked)}
                                                    color="primary"
                                                />
                                            }
                                            label="I would like to receive email updates and newsletters"
                                        />
                                    </Col>
                                </Row>

                                {/* Submit Button */}
                                <Row>
                                    <Col className="text-center">
                                        <Button
                                            variant="primary"
                                            type="submit"
                                            disabled={loading}
                                            className="submit-button"
                                            onClick={handleSubmit}
                                        >
                                            {loading ? (
                                                <>
                                                    <Spinner animation="border" size="sm" /> Submitting...
                                                </>
                                            ) : 'Submit Waiver'}
                                        </Button>
                                    </Col>
                                </Row>

                                {/* Error Message */}
                                {errorWaiver && (
                                    <Row className="mt-3">
                                        <Col className="text-center">
                                            <div className="error-message">{errorWaiver}</div>
                                        </Col>
                                    </Row>
                                )}
                            </Col>
                        </Row>
                    )}
                </Container>
            </div>

            <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.REACT_APP_RECAPTCHA_V3_SITE_KEY}
                size="invisible"
                badge="bottomright"
            />
        </div>
    );
};

export default withFirebase(Waiver);