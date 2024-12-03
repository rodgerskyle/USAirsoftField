import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Spinner, Button } from 'react-bootstrap';
import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderPlus, faFolderOpen, faFolderMinus, faCog, faLock, faLockOpen } from "@fortawesome/free-solid-svg-icons";
import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import * as ROLES from '../constants/roles';
import ReturnForm from './Rentals/ReturnForm';
import RentalOptions from './Rentals/RentalOptions';
import { Helmet } from 'react-helmet-async';
import { Breadcrumb } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { AuthUserContext } from '../session';
import CreateRentalForm from './Rentals/CreateRentalForm';
import EditForm from './Rentals/EditForm';
import { onValue } from 'firebase/database';
import PinCode from '../constants/pincode';
import logo from '../../assets/usairsoft-small-logo.png';

function RentalsManagement(props) {
    const [value, setValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [rentalForms, setRentalForms] = useState([]);
    const [rentalOptions, setRentalOptions] = useState([]);
    const [isNavHidden, setIsNavHidden] = useState(false);
    const [showPinInput, setShowPinInput] = useState(false);
    const [error, setError] = useState(null);
    const [authUser, setAuthUser] = useState(null);

    // Add auth listener
    useEffect(() => {
        const unsubscribe = props.firebase.onAuthUserListener(
            (user) => setAuthUser(user),
            () => setAuthUser(null)
        );
        return () => unsubscribe();
    }, [props.firebase]);

    // Single listener for rental forms and options
    useEffect(() => {
        const formsRef = props.firebase.rentalGroups();
        const optionsRef = props.firebase.rentalOptions();

        const unsubscribeForms = onValue(formsRef, snapshot => {
            if (snapshot.exists()) {
                const forms = [];
                snapshot.forEach(child => {
                    forms.push({
                        ...child.val(),
                        key: child.key
                    });
                });
                setRentalForms(forms);
            } else {
                setRentalForms([]);
            }
            setLoading(false);
        });

        const unsubscribeOptions = onValue(optionsRef, snapshot => {
            if (snapshot.exists()) {
                setRentalOptions(snapshot.val());
            } else {
                setRentalOptions([]);
            }
        });

        // Cleanup listeners on unmount
        return () => {
            unsubscribeForms();
            unsubscribeOptions();
        };
    }, [props.firebase]);

    const verifyPin = (val) => {
        if (authUser?.pin === parseInt(val)) {
            setShowPinInput(false);
            setIsNavHidden(false);
        } else {
            setError("The pin code entered was not correct. Please try again.");
            setTimeout(() => {
                setError(null);
            }, 4000);
        }
    };

    const toggleNavVisibility = () => {
        if (isNavHidden) {
            // When trying to show the nav, check if user has WAIVER role
            if (authUser?.roles[ROLES.WAIVER]) {
                setShowPinInput(true);
            } else {
                setIsNavHidden(false);
            }
        } else {
            setIsNavHidden(true);
        }
    };

    return (
        <AuthUserContext.Consumer>
            {authUser => (
                <div className="background-static-all">
                    <Helmet>
                        <title>US Airsoft Field: Rental Forms</title>
                    </Helmet>
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

                        {showPinInput ? (
                            <div className="div-pin-code-dashboard">
                                <Container className="container-pin-code-dashboard">
                                    <Row className="justify-content-row row-img-logo-dashboard">
                                        <img src={logo} alt="US Airsoft logo" className="img-logo-dashboard" />
                                    </Row>
                                    <Row className="justify-content-row">
                                        <h5 className="h5-dashboard">Enter the PIN Code:</h5>
                                    </Row>
                                    <Row className="justify-content-row">
                                        <PinCode completePin={verifyPin} />
                                    </Row>
                                    {error && (
                                        <Row className="justify-content-row">
                                            <p className="p-error-text-dashboard">{error}</p>
                                        </Row>
                                    )}
                                </Container>
                            </div>
                        ) : (
                            <Row>
                                <Col>
                                    {!isNavHidden && (
                                        <BottomNavigation
                                            value={value}
                                            onChange={(e, newValue) => {
                                                if (newValue === 4) {
                                                    toggleNavVisibility();
                                                } else {
                                                    setValue(newValue);
                                                }
                                            }}
                                            showLabels
                                            className="navigation-rf"
                                        >
                                            <BottomNavigationAction
                                                className="bottom-nav-rf"
                                                label="New Form"
                                                icon={<FontAwesomeIcon icon={faFolderPlus} className="icons-rf" />}
                                            />
                                            <BottomNavigationAction
                                                className="bottom-nav-rf"
                                                label="Edit Form"
                                                icon={<FontAwesomeIcon icon={faFolderOpen} className="icons-rf" />}
                                            />
                                            <BottomNavigationAction
                                                className="bottom-nav-rf"
                                                label="Return Form"
                                                icon={<FontAwesomeIcon icon={faFolderMinus} className="icons-rf" />}
                                            />
                                            <BottomNavigationAction
                                                className="bottom-nav-rf"
                                                label="Rentals"
                                                icon={<FontAwesomeIcon icon={faCog} className="icons-rf" />}
                                            />
                                            <BottomNavigationAction
                                                className="bottom-nav-rf"
                                                label="Hide"
                                                icon={<FontAwesomeIcon icon={faLock} className="icons-rf" />}
                                            />
                                        </BottomNavigation>
                                    )}
                                    {isNavHidden && (
                                        <Button
                                            onClick={toggleNavVisibility}
                                            className="btn-pin-code-link d-block mx-auto mb-3"
                                        >
                                            <FontAwesomeIcon icon={faLockOpen} className="icons-rf" /> Show Navigation
                                        </Button>
                                    )}
                                </Col>
                            </Row>
                        )}

                        {value === 0 && !loading ? (
                            <CreateRentalForm
                                {...props}
                                rentalForms={rentalForms}
                                rentalOptions={rentalOptions}
                            />
                        ) : value === 0 ? (
                            <Row className="spinner-standard">
                                <Spinner animation="border" />
                            </Row>
                        ) : null}

                        {value === 1 && !loading ? (
                            <div className="div-edit-rf">
                                <EditForm
                                    {...props}
                                    rentalForms={rentalForms}
                                    rentalOptions={rentalOptions}
                                />
                            </div>
                        ) : value === 1 ? (
                            <Row className="spinner-standard">
                                <Spinner animation="border" />
                            </Row>
                        ) : null}

                        {value === 2 && !loading ? (
                            <div className="div-edit-rf">
                                <ReturnForm
                                    {...props}
                                    rentalForms={rentalForms}
                                    rentalOptions={rentalOptions}
                                />
                            </div>
                        ) : value === 2 ? (
                            <Row className="spinner-standard">
                                <Spinner animation="border" />
                            </Row>
                        ) : null}

                        {value === 3 && !loading ? (
                            <div className="div-edit-rf">
                                <RentalOptions
                                    {...props}
                                    rentalOptions={rentalOptions}
                                />
                            </div>
                        ) : value === 3 ? (
                            <Row className="spinner-standard">
                                <Spinner animation="border" />
                            </Row>
                        ) : null}
                    </Container>
                </div>
            )}
        </AuthUserContext.Consumer>
    );
}

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(RentalsManagement)); 