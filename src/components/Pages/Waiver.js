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
    <Form.Group className="waiver-field">
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
    const isMinor = age !== null && parseInt(age) < 18;

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
                        <div className="waiver-experience">
                            <Row className="justify-content-center mt-4">
                                <Col xl={10}>
                                    <div className="waiver-intro-card">
                                        <div className="waiver-intro-copy">
                                            <p className="waiver-eyebrow">Online Waiver</p>
                                            <h1 className="waiver-title">Fill out your waiver before you arrive.</h1>
                                            <p className="waiver-lead">
                                                You can complete this waiver at home or on one of our iPads in the store.
                                                Review the agreement, fill in your information, and sign before submitting.
                                            </p>
                                        </div>
                                        <div className="waiver-intro-actions">
                                            <Button
                                                variant="primary"
                                                type="button"
                                                onClick={(e) => handlePrint(e)}
                                            >
                                                Open Printable Waiver
                                            </Button>
                                            <Button
                                                variant="outline-secondary"
                                                type="button"
                                                onClick={() => setHideWaiver(!hideWaiver)}
                                            >
                                                {hideWaiver ? 'Show Agreement Preview' : 'Hide Agreement Preview'}
                                            </Button>
                                        </div>
                                    </div>

                                    {!hideWaiver && (
                                        <div className="waiver-agreement-card">
                                            <div className="waiver-agreement-header">
                                                <div>
                                                    <h2 className="waiver-card-title">Agreement Preview</h2>
                                                    <p className="waiver-card-copy">
                                                        Review the waiver here, or open the full printable version if you need it.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="waiver-agreement-preview">
                                                <img
                                                    src={waivercutoff}
                                                    alt="US Airsoft waiver preview"
                                                    className="waiver-agreement-image"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </div>
                    )}
                    {showSuccessScreen ? (
                        <Row className="justify-content-center">
                            <Col md={8} lg={7} className="text-center">
                                <div className="success-screen waiver-success-screen p-4 mt-4">
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
                            <Col xl={10}>
                                <Form onSubmit={handleSubmit} className="waiver-form-shell">
                                    <div className="waiver-form-section">
                                        <div className="waiver-section-heading">
                                            <h2 className="waiver-section-title">Participant Information</h2>
                                            <p className="waiver-section-copy">Enter the player’s contact and address information.</p>
                                        </div>
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
                                        </Row>
                                    </div>

                                    {isMinor && (
                                        <div className="waiver-form-section">
                                            <div className="waiver-section-heading">
                                                <h2 className="waiver-section-title">Parent / Guardian Information</h2>
                                                <p className="waiver-section-copy">Required for participants under 18.</p>
                                            </div>
                                            <Row>
                                                <Col md={6}>
                                                    <FormField
                                                        label="Parent / Guardian Name"
                                                        name="pgname"
                                                        value={formState.values.pgname}
                                                        onChange={(value) => updateForm('pgname', value)}
                                                        error={formState.errors.pgname}
                                                    />
                                                </Col>
                                                <Col md={6}>
                                                    <FormField
                                                        label="Parent / Guardian Phone"
                                                        name="pgphone"
                                                        value={formState.values.pgphone}
                                                        onChange={(value) => updateForm('pgphone', value)}
                                                        type="tel"
                                                        error={formState.errors.pgphone}
                                                    />
                                                </Col>
                                            </Row>
                                        </div>
                                    )}

                                    <div className="waiver-form-section">
                                        <div className="waiver-section-heading">
                                            <h2 className="waiver-section-title">Participant Signature</h2>
                                            <p className="waiver-section-copy">Sign inside the box, then tap save.</p>
                                        </div>
                                        <div className="signature-container waiver-signature-card">
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
                                    </div>

                                    {isMinor && (
                                        <div className="waiver-form-section">
                                            <div className="waiver-section-heading">
                                                <h2 className="waiver-section-title">Parent / Guardian Signature</h2>
                                                <p className="waiver-section-copy">Required for minors before submitting.</p>
                                            </div>
                                            <div className="signature-container waiver-signature-card">
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
                                        </div>
                                    )}

                                    <div className="waiver-form-section waiver-submit-section">
                                        <Row className="mt-1">
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

                                        <div className="waiver-submit-row">
                                            <Button
                                                variant="primary"
                                                type="submit"
                                                disabled={loading}
                                                className="submit-button"
                                            >
                                                {loading ? (
                                                    <>
                                                        <Spinner animation="border" size="sm" /> Submitting...
                                                    </>
                                                ) : 'Submit Waiver'}
                                            </Button>
                                        </div>

                                        {errorWaiver && (
                                            <Row className="mt-3">
                                                <Col className="text-center">
                                                    <div className="error-message">{errorWaiver}</div>
                                                </Col>
                                            </Row>
                                        )}
                                    </div>
                                </Form>
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
