import React, { Component } from 'react';
import '../../App.css';
import './waiverlookup.css';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';

import convertDate from '../utils/convertDate';
import { Alert, Badge, Button, Form, Card, Breadcrumb, Spinner, Dropdown, Modal } from 'react-bootstrap/';
import { LinkContainer } from 'react-router-bootstrap';

import CustomToggle from '../constants/customtoggle'
import CustomMenu from '../constants/custommenu'

import * as ROLES from '../constants/roles';

import { Helmet } from 'react-helmet-async';
import { getDownloadURL, listAll } from 'firebase/storage';
import { get, onValue, push, remove, set } from 'firebase/database';

import { FormControlLabel, Switch } from '@mui/material';

import SignedWaiver from './SignedWaiver';
import { pdf } from '@react-pdf/renderer';
import { findPotentialBans, normalizePersonName } from '../utils/banMatching';

const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

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
            currentPage: 1,
            itemsPerPage: 50,
            totalPages: 1,
            bannedNames: [],
            bannedNamesLoading: true,
            bannedNamesLoadError: null,
            banManagerOpen: false,
            banName: "",
            banReason: "",
            banSaving: false,
            banError: null,
            banStatus: null,
        };
        // this.validate = this.validate.bind(this)
        this.lookup = this.lookup.bind(this)
    }

    componentWillUnmount() {
        if (this.bannedNamesUnsubscribe) this.bannedNamesUnsubscribe();
    }


    componentDidMount() {
        this.setState({ loading: true });
        this.initializeDates();
        this.loadWaivers();
        this.loadBannedNames();
    }

    loadBannedNames = () => {
        this.bannedNamesUnsubscribe = onValue(
            this.props.firebase.bannedNames(),
            snapshot => {
                const bannedNamesObject = snapshot.val() || {};
                const bannedNames = Object.entries(bannedNamesObject).map(([id, entry]) => ({
                    id,
                    ...entry,
                }));
                this.setState({
                    bannedNames,
                    bannedNamesLoading: false,
                    bannedNamesLoadError: null,
                });
            },
            error => {
                console.error('Unable to load flagged names', error);
                this.setState({
                    bannedNamesLoading: false,
                    bannedNamesLoadError: "Potential-ban checks are unavailable. Do not assume this search is clear.",
                });
            }
        );
    }

    addBannedName = async (authUser) => {
        const name = this.state.banName.trim();
        const normalizedName = normalizePersonName(name);

        if (normalizedName.length < 3 || normalizedName.split(' ').length < 2) {
            this.setState({ banError: "Enter the person's full name." });
            return;
        }

        if (findPotentialBans(name, this.state.bannedNames).some(entry => entry.match.type === 'exact')) {
            this.setState({ banError: "That name is already on the flagged-name list." });
            return;
        }

        this.setState({ banSaving: true, banError: null, banStatus: null });
        try {
            const newEntry = push(this.props.firebase.bannedNames());
            await set(newEntry, {
                name,
                normalizedName,
                reason: this.state.banReason.trim(),
                createdAt: Date.now(),
                createdBy: authUser.uid,
            });
            this.setState({
                banName: "",
                banReason: "",
                banSaving: false,
                banStatus: `${name} was added to the flagged-name list.`,
            });
        } catch (error) {
            console.error('Unable to add flagged name', error);
            this.setState({ banSaving: false, banError: "The name could not be added. Please try again." });
        }
    }

    removeBannedName = async (entry) => {
        if (!window.confirm(`Remove ${entry.name} from the flagged-name list?`)) return;

        this.setState({ banError: null, banStatus: null });
        try {
            await remove(this.props.firebase.bannedName(entry.id));
            this.setState({ banStatus: `${entry.name} was removed from the flagged-name list.` });
        } catch (error) {
            console.error('Unable to remove flagged name', error);
            this.setState({ banError: "The name could not be removed. Please try again." });
        }
    }

    getWaiverName = waiver => waiver.isDigital
        ? waiver.name
        : waiver.name.substr(0, waiver.name.lastIndexOf('('));

    initializeDates = () => {
        let date = new Date();
        this.setState({
            // activeMonth: date.getMonth() + 1,
            // activeDay: date.getDate(),
            // activeYear: date.getFullYear()
            activeMonth: 13,
            activeDay: 32,
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
            const tempWaivers = res.items.map(item => {
                try {
                    const waiverName = item.name;
                    // Extract date from filename
                    const dateMatch = waiverName.match(/\((.*?)\)/);
                    let dateObj;

                    if (dateMatch && dateMatch[1]) {
                        dateObj = this.parseLegacyDate(dateMatch[1]);
                    } else {
                        dateObj = new Date();
                    }

                    return {
                        name: waiverName,
                        date: dateObj,
                        ref: item,
                        isDigital: false
                    };
                } catch (error) {
                    console.error('Error processing waiver:', item.name, error);
                    return {
                        name: item.name,
                        date: new Date(),
                        ref: item.fullPath,
                        isDigital: false
                    };
                }
            });

            const validWaivers = tempWaivers.filter(waiver =>
                waiver && waiver.name && waiver.date && waiver.ref
            );

            this.setState({
                waivers: validWaivers,
                loading: false,
                totalPages: Math.ceil(validWaivers.length / this.state.itemsPerPage)
            });
        }).catch(error => {
            console.error('Error loading legacy waivers:', error);
            this.setState({
                waivers: [],
                loading: false
            });
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
            // Handle digital waiver viewing
            this.setState({ showPdfModal: true });
            try {
                const pdfBlob = await pdf(<SignedWaiver {...this.state.waivers.find(w => w.ref === ref).data} />).toBlob();
                const pdfUrl = URL.createObjectURL(pdfBlob);
                window.open(pdfUrl, '_blank');
                this.setState({ pdfUrl });
            } catch (error) {
                console.error('Error generating PDF:', error);
            }
        } else {
            // Handle legacy waiver opening
            try {
                const url = await getDownloadURL(ref);
                window.open(url, '_blank');
            } catch (error) {
                console.error('Error opening legacy waiver:', error);
            }
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

    // Add this method to parse complex date formats
    parseLegacyDate = (dateString) => {
        try {
            // Handle format: 1-23-2022:9:1:38:752
            if (dateString.includes(':')) {
                const [datePart] = dateString.split(':');
                const [month, day, year] = datePart.split('-');
                return new Date(year, month - 1, day);
            }
            // Handle other formats using existing convertDate
            return convertDate(dateString);
        } catch (error) {
            console.error('Date parsing error:', dateString, error);
            return new Date();
        }
    }

    // Add pagination controls
    handlePageChange = (pageNumber) => {
        this.setState({ currentPage: pageNumber });
    }

    render() {
        const { loading, waivers, search, activeMonth, activeDay, activeYear, currentPage, itemsPerPage, bannedNames } = this.state;
        let index = ((currentPage - 1) * itemsPerPage) + 1;
        const potentialBanMatches = findPotentialBans(search, bannedNames);

        // Get current waivers
        const filteredWaivers = waivers
            .sort((a, b) => b.date - a.date)
            .filter(waiver => {
                if (search !== "" && !waiver.name.toLowerCase().includes(search.toLowerCase())) {
                    return false;
                }
                if (!search && !compareDate(activeMonth, activeDay, activeYear, waiver.date)) {
                    return false;
                }
                return true;
            });

        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentWaivers = filteredWaivers.slice(indexOfFirstItem, indexOfLastItem);

        return (
            <AuthUserContext.Consumer>
                {authUser => (
                    <div className="admin-container admin-compact-page">
                        <Helmet>
                            <title>US Airsoft Field: Waiver Lookup</title>
                        </Helmet>
                        <div className="admin-content usa-waiver-container">
                            <div className="usa-waiver-breadcrumb admin-page-header">
                                <h2 className="admin-header">Waiver Lookup</h2>
                                <Breadcrumb>
                                    <LinkContainer to="/admin">
                                        <Breadcrumb.Item>Admin</Breadcrumb.Item>
                                    </LinkContainer>
                                    <Breadcrumb.Item active>Waiver Lookup</Breadcrumb.Item>
                                </Breadcrumb>
                            </div>

                            <Card className="usa-waiver-card admin-panel-card">
                                <Card.Header className="usa-waiver-header">
                                    <Form.Control
                                        type="text"
                                        placeholder="Search by name..."
                                        value={search}
                                        onChange={(e) => this.setState({ search: e.target.value, currentPage: 1 })}
                                        className="usa-waiver-search"
                                    />

                                    {!!authUser?.roles[ROLES.ADMIN] && (
                                        <Button
                                            variant="outline-danger"
                                            className="usa-waiver-manage-bans"
                                            onClick={() => this.setState({ banManagerOpen: true, banError: null, banStatus: null })}
                                        >
                                            Manage flagged names ({bannedNames.length})
                                        </Button>
                                    )}

                                    {/* Date Filters */}
                                    <div className="usa-waiver-date-filters">
                                        <Dropdown className="usa-waiver-date-dropdown">
                                            <Dropdown.Toggle as={CustomToggle}>
                                                Month: {activeMonth !== 13 ? this.state.months[activeMonth - 1] : "All"}
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu as={CustomMenu}>
                                                <Dropdown.Item onClick={() => this.setState({ activeMonth: 13 })}>
                                                    All Months
                                                </Dropdown.Item>
                                                {this.state.months.map((month, index) => (
                                                    <Dropdown.Item
                                                        key={month}
                                                        onClick={() => this.setState({ activeMonth: index + 1 })}
                                                    >
                                                        {month}
                                                    </Dropdown.Item>
                                                ))}
                                            </Dropdown.Menu>
                                        </Dropdown>

                                        <Dropdown className="usa-waiver-date-dropdown">
                                            <Dropdown.Toggle as={CustomToggle}>
                                                Day: {activeDay !== 32 ? activeDay : "All"}
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu as={CustomMenu}>
                                                <Dropdown.Item onClick={() => this.setState({ activeDay: 32 })}>
                                                    All Days
                                                </Dropdown.Item>
                                                {this.state.days.map((day, index) => (
                                                    <Dropdown.Item
                                                        key={day}
                                                        onClick={() => this.setState({ activeDay: index + 1 })}
                                                    >
                                                        {index + 1}
                                                    </Dropdown.Item>
                                                ))}
                                            </Dropdown.Menu>
                                        </Dropdown>

                                        <Dropdown className="usa-waiver-date-dropdown">
                                            <Dropdown.Toggle as={CustomToggle}>
                                                Year: {activeYear !== new Date().getFullYear() + 1 ? activeYear : "All"}
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu as={CustomMenu}>
                                                <Dropdown.Item
                                                    onClick={() => this.setState({ activeYear: new Date().getFullYear() + 1 })}
                                                >
                                                    All Years
                                                </Dropdown.Item>
                                                {this.state.years.map(year => (
                                                    <Dropdown.Item
                                                        key={year}
                                                        onClick={() => this.setState({ activeYear: year })}
                                                    >
                                                        {year}
                                                    </Dropdown.Item>
                                                ))}
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </div>

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={this.state.useLegacy}
                                                onChange={this.toggleWaiverType}
                                                color="primary"
                                            />
                                        }
                                        label="Use Legacy Waivers"
                                        className="usa-waiver-switch"
                                    />
                                </Card.Header>

                                {this.state.bannedNamesLoadError && (
                                    <Alert variant="warning" className="usa-waiver-ban-alert" role="alert">
                                        <Alert.Heading>Flagged-name check unavailable</Alert.Heading>
                                        {this.state.bannedNamesLoadError}
                                    </Alert>
                                )}

                                {!this.state.bannedNamesLoadError && search.trim().length >= 3 && this.state.bannedNamesLoading && (
                                    <Alert variant="info" className="usa-waiver-ban-alert" role="status">
                                        Checking the flagged-name list…
                                    </Alert>
                                )}

                                {search.trim().length >= 3 && potentialBanMatches.length > 0 && (
                                    <Alert variant="danger" className="usa-waiver-ban-alert" role="alert">
                                        <Alert.Heading>Potential ban match</Alert.Heading>
                                        <p>
                                            Verify the customer's identity before admitting them. A similar name appears on the flagged-name list.
                                        </p>
                                        <div className="usa-waiver-ban-matches">
                                            {potentialBanMatches.map(entry => (
                                                <div key={entry.id} className="usa-waiver-ban-match">
                                                    <strong>{entry.name}</strong>
                                                    <Badge bg={entry.match.type === 'exact' ? 'danger' : 'warning'} text={entry.match.type === 'exact' ? undefined : 'dark'}>
                                                        {entry.match.type === 'exact' ? 'Exact name' : 'Similar name'}
                                                    </Badge>
                                                    {entry.reason && <span>{entry.reason}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </Alert>
                                )}

                                <Card.Body className="usa-waiver-body">
                                    {loading ? (
                                        <div className="usa-waiver-loading">
                                            <Spinner animation="border" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </Spinner>
                                        </div>
                                    ) : (
                                        <>
                                            {filteredWaivers.length > 0 ? (
                                                <>
                                                    <div className="usa-waiver-list">
                                                        {currentWaivers.map((waiver) => {
                                                            const waiverName = this.getWaiverName(waiver);
                                                            const waiverBanMatches = findPotentialBans(waiverName, bannedNames);
                                                            const rowIndex = index++;
                                                            return (
                                                                <div
                                                                    className={`usa-waiver-row ${waiverBanMatches.length > 0 ? 'usa-waiver-row-flagged' : (rowIndex % 2 === 0 ? 'usa-waiver-row-even' : 'usa-waiver-row-odd')}`}
                                                                    key={waiver.ref}
                                                                >
                                                                    <div className="usa-waiver-row-content">
                                                                        <div className="usa-waiver-info">
                                                                            <span className="usa-waiver-index">#{rowIndex}</span>
                                                                            <span className="usa-waiver-name">{waiverName}</span>
                                                                            {waiverBanMatches.length > 0 && <Badge bg="danger">Potential ban</Badge>}
                                                                        </div>
                                                                        <div className="usa-waiver-date">
                                                                            {formatDate(waiver.date)}
                                                                        </div>
                                                                        <Button
                                                                            className={`usa-waiver-button ${waiver.isDigital ? 'usa-waiver-button-view' : 'usa-waiver-button-open'}`}
                                                                            onClick={() => this.openWaiver(waiver.ref, waiver.isDigital)}
                                                                        >
                                                                            {waiver.isDigital ? 'View' : 'Open'}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="usa-waiver-pagination">
                                                        {Array.from({ length: Math.ceil(filteredWaivers.length / itemsPerPage) }, (_, i) => (
                                                            <Button
                                                                key={i + 1}
                                                                onClick={() => this.handlePageChange(i + 1)}
                                                                className={`usa-waiver-page-button ${currentPage === i + 1 ? 'active' : ''}`}
                                                            >
                                                                {i + 1}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="usa-waiver-no-results">
                                                    <p>No waivers found matching your search criteria.</p>
                                                    <p>Try broadening your search or adjusting the date filters.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </Card.Body>
                            </Card>

                            {!!authUser?.roles[ROLES.ADMIN] && (
                                <Modal
                                    show={this.state.banManagerOpen}
                                    onHide={() => this.setState({ banManagerOpen: false })}
                                    centered
                                    className="usa-waiver-ban-modal"
                                >
                                    <Modal.Header closeButton>
                                        <Modal.Title>Manage flagged names</Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body>
                                        <p className="usa-waiver-ban-help">
                                            Add a full name and optional identifying note. Staff will see a warning for exact and closely similar names.
                                        </p>
                                        {this.state.banError && <Alert variant="danger">{this.state.banError}</Alert>}
                                        {this.state.banStatus && <Alert variant="success">{this.state.banStatus}</Alert>}
                                        <Form.Group className="mb-3">
                                            <Form.Label>Full name</Form.Label>
                                            <Form.Control
                                                value={this.state.banName}
                                                onChange={event => this.setState({ banName: event.target.value })}
                                                placeholder="First and last name"
                                                disabled={this.state.banSaving}
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Reason or identifying note (optional)</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={2}
                                                value={this.state.banReason}
                                                onChange={event => this.setState({ banReason: event.target.value })}
                                                placeholder="Enough detail for staff to verify the person"
                                                disabled={this.state.banSaving}
                                            />
                                        </Form.Group>
                                        <Button
                                            variant="danger"
                                            onClick={() => this.addBannedName(authUser)}
                                            disabled={this.state.banSaving}
                                        >
                                            {this.state.banSaving ? 'Adding…' : 'Add flagged name'}
                                        </Button>

                                        <div className="usa-waiver-ban-list">
                                            {bannedNames.length === 0 ? (
                                                <p>No names have been flagged.</p>
                                            ) : bannedNames
                                                .slice()
                                                .sort((left, right) => left.name.localeCompare(right.name))
                                                .map(entry => (
                                                    <div key={entry.id} className="usa-waiver-ban-list-item">
                                                        <div>
                                                            <strong>{entry.name}</strong>
                                                            {entry.reason && <span>{entry.reason}</span>}
                                                        </div>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => this.removeBannedName(entry)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                ))}
                                        </div>
                                    </Modal.Body>
                                </Modal>
                            )}
                        </div>
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

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(WaiverLookup));

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
// )(WaiverLookup);
