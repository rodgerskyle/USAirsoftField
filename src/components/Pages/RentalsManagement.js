import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Spinner } from 'react-bootstrap';
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
import {
    Box,
    Tabs,
    Tab,
    Paper,
    Typography,
    Chip,
    IconButton
} from '@mui/material';
import { AddBox, EditNote, AssignmentReturn, Inventory2, Lock, LockOpen } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import '../constants/admin.css';

const VIEW_KEYS = ['new', 'edit', 'return', 'inventory'];

const VIEW_CONFIG = {
    new: { label: 'New Form', icon: <AddBox fontSize="small" /> },
    edit: { label: 'Edit Form', icon: <EditNote fontSize="small" /> },
    return: { label: 'Return Form', icon: <AssignmentReturn fontSize="small" /> },
    inventory: { label: 'Inventory', icon: <Inventory2 fontSize="small" /> }
};

function RentalsManagement(props) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [rentalForms, setRentalForms] = useState([]);
    const [rentalOptions, setRentalOptions] = useState([]);
    const [isNavHidden, setIsNavHidden] = useState(false);
    const [showPinInput, setShowPinInput] = useState(false);
    const [error, setError] = useState(null);
    const [authUser, setAuthUser] = useState(null);

    const activeView = useMemo(() => {
        const view = searchParams.get('view');
        return VIEW_KEYS.includes(view) ? view : 'new';
    }, [searchParams]);

    useEffect(() => {
        if (!searchParams.get('view')) {
            setSearchParams({ view: 'new' }, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const unsubscribe = props.firebase.onAuthUserListener(
            (user) => setAuthUser(user),
            () => setAuthUser(null)
        );
        return () => unsubscribe();
    }, [props.firebase]);

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

        return () => {
            unsubscribeForms();
            unsubscribeOptions();
        };
    }, [props.firebase]);

    const verifyPin = (val) => {
        if (authUser?.pin === parseInt(val, 10)) {
            setShowPinInput(false);
            setIsNavHidden(false);
        } else {
            setError('The pin code entered was not correct. Please try again.');
            setTimeout(() => setError(null), 4000);
        }
    };

    const toggleNavVisibility = () => {
        if (isNavHidden) {
            if (authUser?.roles?.[ROLES.WAIVER]) {
                setShowPinInput(true);
            } else {
                setIsNavHidden(false);
            }
        } else {
            setIsNavHidden(true);
        }
    };

    const setView = (view) => {
        setSearchParams({ view });
    };

    const activeFormsCount = rentalForms.filter(form => !!form.complete).length;
    const pendingFormsCount = rentalForms.filter(form => !form.complete).length;

    return (
        <AuthUserContext.Consumer>
            {viewer => (
                <div className="admin-container admin-compact-page admin-rentals-page">
                    <Helmet>
                        <title>US Airsoft Field: Rental Forms</title>
                    </Helmet>
                    <div className="admin-content">
                    <Container fluid className="p-0">
                        <div className="admin-page-header">
                            <h2 className="admin-header">Rental Form</h2>
                            <Breadcrumb className="admin-breadcrumb admin-page-breadcrumb">
                                {viewer && !!viewer.roles[ROLES.ADMIN] ? (
                                    <LinkContainer to="/admin">
                                        <Breadcrumb.Item>Admin</Breadcrumb.Item>
                                    </LinkContainer>
                                ) : (
                                    <LinkContainer to="/dashboard">
                                        <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
                                    </LinkContainer>
                                )}
                                <Breadcrumb.Item active>Rental Form</Breadcrumb.Item>
                            </Breadcrumb>
                        </div>

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
                            <>
                                <Paper
                                    className="admin-panel-card"
                                    elevation={2}
                                    sx={{
                                        p: 1.25,
                                        mb: 2,
                                        borderRadius: 3,
                                        background: 'var(--admin-surface)',
                                        border: '1px solid var(--admin-border)',
                                        color: 'var(--admin-text)'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--admin-text)', fontSize: '1.2rem' }}>
                                                Rental Operations
                                            </Typography>
                                            <Chip label={`${rentalForms.length} total`} size="small" sx={{ backgroundColor: 'var(--admin-accent-soft)', color: 'var(--admin-accent-text)' }} />
                                            <Chip label={`${activeFormsCount} active`} size="small" sx={{ backgroundColor: 'var(--admin-success-bg)', color: 'var(--admin-success)' }} />
                                            <Chip label={`${pendingFormsCount} pending`} size="small" sx={{ backgroundColor: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' }} />
                                        </Box>

                                        <IconButton
                                            onClick={toggleNavVisibility}
                                            title={isNavHidden ? 'Show navigation' : 'Hide navigation'}
                                            sx={{ border: '1px solid var(--admin-border)', color: 'var(--admin-subtext)', backgroundColor: 'var(--admin-surface-muted)' }}
                                        >
                                            {isNavHidden ? <LockOpen /> : <Lock />}
                                        </IconButton>
                                    </Box>

                                    {!isNavHidden && (
                                        <Tabs
                                            value={activeView}
                                            onChange={(event, newValue) => setView(newValue)}
                                            variant="scrollable"
                                            allowScrollButtonsMobile
                                            sx={{
                                                mt: 1,
                                                minHeight: 44,
                                                '.MuiTabs-indicator': { backgroundColor: 'var(--admin-accent)' },
                                                '.MuiTab-root': {
                                                    minHeight: 44,
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    color: 'var(--admin-subtext)',
                                                    borderRadius: '10px'
                                                },
                                                '.Mui-selected': {
                                                    color: 'var(--admin-text) !important'
                                                }
                                            }}
                                        >
                                            {VIEW_KEYS.map((key) => (
                                                <Tab
                                                    key={key}
                                                    value={key}
                                                    icon={VIEW_CONFIG[key].icon}
                                                    iconPosition="start"
                                                    label={VIEW_CONFIG[key].label}
                                                />
                                            ))}
                                        </Tabs>
                                    )}
                                </Paper>

                                <Box sx={{ minHeight: 420, mt: 1 }}>
                                    {loading ? (
                                        <Row className="spinner-standard">
                                            <Spinner animation="border" />
                                        </Row>
                                    ) : null}

                                    {!loading && activeView === 'new' ? (
                                        <CreateRentalForm
                                            {...props}
                                            rentalForms={rentalForms}
                                            rentalOptions={rentalOptions}
                                        />
                                    ) : null}

                                    {!loading && activeView === 'edit' ? (
                                        <EditForm
                                            {...props}
                                            rentalForms={rentalForms}
                                            rentalOptions={rentalOptions}
                                        />
                                    ) : null}

                                    {!loading && activeView === 'return' ? (
                                        <ReturnForm
                                            {...props}
                                            rentalForms={rentalForms}
                                            rentalOptions={rentalOptions}
                                        />
                                    ) : null}

                                    {!loading && activeView === 'inventory' ? (
                                        <RentalOptions
                                            {...props}
                                            rentalOptions={rentalOptions}
                                        />
                                    ) : null}
                                </Box>
                            </>
                        )}
                    </Container>
                    </div>
                </div>
            )}
        </AuthUserContext.Consumer>
    );
}

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(RentalsManagement));
