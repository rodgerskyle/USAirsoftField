import React, { Component } from 'react';
import '../../App.css';
import './waiverlookup.css';

import { withFirebase } from '../Firebase';
import { AuthUserContext, withAuthorization } from '../session';

import { archiveDateRanges, recentPaperWaivers, waiverArchiveStart } from '../utils/waiverArchive';
import { loadWaiverSearchIndex } from '../utils/waiverArchiveSearch';
import { Alert, Badge, Button, Form, Card, Breadcrumb, Spinner, Dropdown, Modal } from 'react-bootstrap/';
import { LinkContainer } from 'react-router-bootstrap';

import CustomToggle from '../constants/customtoggle'
import CustomMenu from '../constants/custommenu'

import * as ROLES from '../constants/roles';

import { Helmet } from 'react-helmet-async';
import { getDownloadURL, listAll } from 'firebase/storage';
import { endAt, endBefore, get, limitToLast, onValue, orderByChild, push, query, remove, set, startAt } from 'firebase/database';

import { FormControlLabel, Switch } from '@mui/material';

import SignedWaiver from './SignedWaiver';
import WaiverCardSearch from './WaiverCardSearch';
import PaperWaiverReview from './PaperWaiverReview';
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
            hasOlder: false,
            loadingOlder: false,
            loadError: "",
            searchIncomplete: false,
            activeMonth: null,
            activeDay: null,
            activeYear: null,
            days: [...Array(31).keys()].map(String),
            years: [],
            months: [],
            useLegacy: false,
            showPdfModal: false,
            pdfUrl: null,
            currentPage: 1,
            itemsPerPage: 50,
            bannedNames: [],
            bannedNamesLoading: true,
            bannedNamesLoadError: null,
            banManagerOpen: false,
            banName: "",
            banReason: "",
            banSaving: false,
            banError: null,
            banStatus: null,
            banDetailsOpen: false,
            banDetailsName: "",
            banDetailsMatches: [],
        };
        this.generation = 0;
    }

    componentWillUnmount() {
        this.stopArchive();
        if (this.bannedNamesUnsubscribe) this.bannedNamesUnsubscribe();
        if (this.state.pdfUrl) URL.revokeObjectURL(this.state.pdfUrl);
    }


    componentDidMount() {
        this.setState({ loading: true });
        this.initializeDates();
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

    showBanDetails = (name, matches) => {
        this.setState({
            banDetailsOpen: true,
            banDetailsName: name,
            banDetailsMatches: matches,
        });
    }

    initializeDates = () => {
        let date = new Date();
        this.setState({
            // activeMonth: date.getMonth() + 1,
            // activeDay: date.getDate(),
            // activeYear: date.getFullYear()
            activeMonth: 13,
            activeDay: 32,
            activeYear: date.getFullYear() + 1
        });

        let years = [];
        for (let i = new Date(waiverArchiveStart()).getFullYear(); i < date.getFullYear() + 1; i++) {
            years.push(i);
        }

        let months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        this.setState({ years, months });
    }

    stopArchive = () => {
        this.generation++;
        this.olderRequest = null;
        clearTimeout(this.searchTimer);
        if (this.unsubscribeWaivers) this.unsubscribeWaivers();
        this.unsubscribeWaivers = null;
    }

    // Keep only list metadata in memory. The signature and contact details are
    // needed when staff open a single document.
    readPage = snapshot => {
        const rows = [];
        snapshot.forEach(child => {
            const record = child.val();
            rows.push({ name: record.name || '', date: new Date(record.timestamp), ref: child.key, isDigital: true });
        });
        rows.reverse();
        return { waivers: rows.slice(0, this.state.itemsPerPage), hasOlder: rows.length > this.state.itemsPerPage };
    }

    archiveQuery = (index, cursor) => {
        const range = this.ranges[index];
        return query(this.props.firebase.digitalWaivers(), orderByChild('timestamp'), startAt(range.start),
            ...(cursor ? [endBefore(cursor.date.getTime(), cursor.ref)] : this.unfiltered ? [] : [endAt(range.end)]),
            limitToLast(this.state.itemsPerPage + 1));
    }

    usePage = (snapshot, rangeIndex, replace) => {
        const page = this.readPage(snapshot);
        this.pageRange = page.hasOlder ? rangeIndex : rangeIndex + 1;
        this.pageCursor = page.hasOlder ? page.waivers[page.waivers.length - 1] : null;
        if (replace && this.unfiltered) this.recentRows = page.waivers;
        this.setState(state => ({
            waivers: replace ? page.waivers : [...state.waivers, ...page.waivers],
            hasOlder: this.pageRange < this.ranges.length, loading: false, loadingOlder: false,
            ...(replace && { currentPage: 1 })
        }), this.ensureMatches);
    }

    loadWaivers = () => {
        this.stopArchive();
        const generation = this.generation;
        this.setState({ loading: true, waivers: [], currentPage: 1, hasOlder: false, loadingOlder: false, loadError: '', searchIncomplete: false });
        const failed = () => {
            if (generation === this.generation) this.setState({ loading: false, loadError: 'Unable to load the waiver archive.' });
        };
        if (this.state.useLegacy) {
            // The legacy bucket is flat and lists filenames only.
            listAll(this.props.firebase.waiversList()).then(({ items }) => {
                if (generation === this.generation) this.setState({ waivers: recentPaperWaivers(items), loading: false });
            }).catch(failed);
            return;
        }
        const { search, activeYear, activeMonth, activeDay } = this.state;
        if (search.trim()) {
            if (!this.searchIndex) this.searchIndex = loadWaiverSearchIndex(this.props.firebase);
            this.searchIndex.then(batches => {
                if (generation !== this.generation) return;
                const rows = new Map();
                batches.forEach(batch => batch.rows.forEach(row => rows.set(row.ref, row)));
                (this.recentRows || []).forEach(row => rows.set(row.ref, row));
                this.setState({ waivers: [...rows.values()], loading: false, searchIncomplete: batches.some(batch => batch.missing) });
            }).catch(() => {
                if (generation === this.generation) this.setState({ waivers: this.recentRows || [], loading: false, searchIncomplete: true });
            });
            return;
        }
        this.searchIndex = null;
        this.ranges = archiveDateRanges(activeYear, activeMonth, activeDay);
        this.unfiltered = activeYear === new Date().getFullYear() + 1 && activeMonth === 13 && activeDay === 32;
        if (!this.ranges.length) {
            this.setState({ loading: false });
            return;
        }
        this.unsubscribeWaivers = onValue(this.archiveQuery(0), snapshot => {
            if (generation !== this.generation) return;
            this.olderRequest = null;
            this.usePage(snapshot, 0, true);
        }, failed);
    }

    loadOlder = async () => {
        if (this.olderRequest || !this.state.hasOlder || this.state.loadError) return;
        const request = {};
        this.olderRequest = request;
        const index = this.pageRange;
        const cursor = this.pageCursor;
        this.setState({ loadingOlder: true });
        try {
            const snapshot = await get(this.archiveQuery(index, cursor));
            if (this.olderRequest !== request) return;
            this.olderRequest = null;
            this.usePage(snapshot, index, false);
        } catch (error) {
            if (this.olderRequest === request) {
                this.olderRequest = null;
                this.setState({ loadError: 'Unable to load older waivers.', loadingOlder: false });
            }
        }
    }

    matches = (waiver, cutoff, now) => {
        const { search, activeMonth, activeDay, activeYear } = this.state;
        if (!waiver.name || !(waiver.date > cutoff && waiver.date <= now)) return false;
        const term = search.trim().toLowerCase();
        return term ? waiver.name.toLowerCase().includes(term) : compareDate(activeMonth, activeDay, activeYear, waiver.date);
    }

    ensureMatches = () => {
        const { waivers, currentPage, itemsPerPage, hasOlder } = this.state;
        const now = Date.now();
        const cutoff = waiverArchiveStart(now);
        if (hasOlder && waivers.filter(waiver => this.matches(waiver, cutoff, now)).length < currentPage * itemsPerPage) {
            this.loadOlder();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        const filters = ['search', 'activeMonth', 'activeDay', 'activeYear'];
        if (filters.some(key => prevState[key] !== this.state[key])) {
            if (this.state.useLegacy) {
                if (this.state.currentPage !== 1) this.setState({ currentPage: 1 });
            } else {
                this.stopArchive();
                this.setState({ loading: true, hasOlder: false, loadError: '' });
                this.searchTimer = setTimeout(this.loadWaivers, this.state.search.trim() ? 250 : 0);
            }
        } else if (prevState.currentPage !== this.state.currentPage) {
            this.ensureMatches();
        }
    }

    toggleWaiverType = () => {
        this.setState(state => ({ useLegacy: !state.useLegacy }), this.loadWaivers);
    }

    // Opens User's waiver
    openWaiver = async (ref, isDigital) => {
        if (isDigital) {
            // Handle digital waiver viewing
            this.setState({ showPdfModal: true });
            try {
                const record = (await get(this.props.firebase.digitalWaiver(ref))).val();
                if (!record || !(record.timestamp > waiverArchiveStart() && record.timestamp <= Date.now())) {
                    this.setState({ loadError: 'This waiver is no longer in the one-year archive.' });
                    return;
                }
                const pdfBlob = await pdf(<SignedWaiver {...record} />).toBlob();
                const pdfUrl = URL.createObjectURL(pdfBlob);
                window.open(pdfUrl, '_blank');
                this.setState({ pdfUrl });
            } catch (error) {
                this.setState({ loadError: 'Unable to open the signed waiver.' });
            }
        } else {
            // Handle legacy waiver opening
            try {
                const url = await getDownloadURL(ref);
                window.open(url, '_blank');
            } catch (error) {
                this.setState({ loadError: 'Unable to open the scanned waiver.' });
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

    // Add pagination controls
    handlePageChange = (pageNumber) => {
        this.setState({ currentPage: pageNumber });
    }

    render() {
        const { loading, waivers, search, activeMonth, activeDay, activeYear, currentPage, itemsPerPage, bannedNames } = this.state;
        let index = ((currentPage - 1) * itemsPerPage) + 1;
        const potentialBanMatches = findPotentialBans(search, bannedNames);

        // Get current waivers
        const now = Date.now();
        const cutoff = waiverArchiveStart(now);
        const filteredWaivers = waivers.filter(waiver => this.matches(waiver, cutoff, now)).sort((a, b) => b.date - a.date);

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
                                    <WaiverCardSearch key={authUser?.uid} firebase={this.props.firebase} uid={authUser?.uid}
                                        value={search} onChange={name => this.setState({ search: name, currentPage: 1 })} />

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
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => this.showBanDetails(search, [entry])}
                                                    >
                                                        View details
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </Alert>
                                )}

                                <Card.Body className="usa-waiver-body">
                                    <p>Waivers created in the past year</p>
                                    {this.state.searchIncomplete && <Alert variant="warning">Some months have no search index. Clear the name and browse by creation date to check the signed records.</Alert>}
                                    {!this.state.useLegacy && !search.trim() && <Button size="sm" variant="outline-secondary" onClick={this.loadWaivers}>Refresh waivers</Button>}
                                    {this.state.loadError && <Alert variant="danger">{this.state.loadError} <Button size="sm" onClick={this.loadWaivers}>Retry</Button></Alert>}
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
                                                            const waiverName = waiver.name;
                                                            const waiverBanMatches = findPotentialBans(waiverName, bannedNames);
                                                            const rowIndex = index++;
                                                            return (
                                                                <div
                                                                    className={`usa-waiver-row ${waiverBanMatches.length > 0 ? 'usa-waiver-row-flagged' : (rowIndex % 2 === 0 ? 'usa-waiver-row-even' : 'usa-waiver-row-odd')}`}
                                                                    key={waiver.isDigital ? waiver.ref : waiver.ref.fullPath}
                                                                >
                                                                    <div className="usa-waiver-row-content">
                                                                        <div className="usa-waiver-info">
                                                                            <span className="usa-waiver-index">#{rowIndex}</span>
                                                                            <span className="usa-waiver-name">{waiverName}</span>
                                                                            {waiver.isDigital && <details className="ms-2">
                                                                                <summary>Waiver reference</summary>
                                                                                <input aria-label={`Waiver reference for ${waiverName}`} value={waiver.ref} readOnly onFocus={event => event.target.select()} />
                                                                            </details>}
                                                                            {waiverBanMatches.length > 0 && (
                                                                                <Button
                                                                                    variant="danger"
                                                                                    size="sm"
                                                                                    className="usa-waiver-ban-button"
                                                                                    onClick={() => this.showBanDetails(waiverName, waiverBanMatches)}
                                                                                >
                                                                                    Potential ban
                                                                                </Button>
                                                                            )}
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
                                                                        {!waiver.isDigital && <PaperWaiverReview firebase={this.props.firebase}
                                                                            uid={authUser.uid} waiver={waiver} />}
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
                                            ) : (!this.state.hasOlder && !this.state.loadError && (
                                                <div className="usa-waiver-no-results">
                                                    <p>No waivers found matching your search criteria.</p>
                                                    <p>Try broadening your search or adjusting the date filters.</p>
                                                </div>
                                            ))}
                                            {this.state.loadingOlder && <p role="status">Searching older waivers…</p>}
                                            {this.state.hasOlder && !this.state.loadingOlder && !this.state.loadError &&
                                                filteredWaivers.length >= currentPage * itemsPerPage &&
                                                currentPage === Math.ceil(filteredWaivers.length / itemsPerPage) &&
                                                <Button onClick={() => this.handlePageChange(currentPage + 1)}>Older waivers</Button>}
                                            {currentPage > 1 && !currentWaivers.length && !this.state.loadingOlder &&
                                                <Button onClick={() => this.handlePageChange(currentPage - 1)}>Previous page</Button>}
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

                            <Modal
                                show={this.state.banDetailsOpen}
                                onHide={() => this.setState({ banDetailsOpen: false })}
                                centered
                                className="usa-waiver-ban-modal"
                            >
                                <Modal.Header closeButton>
                                    <Modal.Title>Potential ban details</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    <Alert variant="warning">
                                        This is a name-based match. Verify the customer's identity before taking action.
                                    </Alert>
                                    <p className="usa-waiver-ban-details-search">
                                        Name being checked: <strong>{this.state.banDetailsName}</strong>
                                    </p>
                                    <div className="usa-waiver-ban-details-list">
                                        {this.state.banDetailsMatches.map(entry => (
                                            <div key={entry.id} className="usa-waiver-ban-details-item">
                                                <div className="usa-waiver-ban-details-heading">
                                                    <strong>{entry.name}</strong>
                                                    <Badge bg={entry.match.type === 'exact' ? 'danger' : 'warning'} text={entry.match.type === 'exact' ? undefined : 'dark'}>
                                                        {entry.match.type === 'exact' ? 'Exact name' : 'Similar name'}
                                                    </Badge>
                                                </div>
                                                <div className="usa-waiver-ban-details-reason">
                                                    <span>Reason / identifying note</span>
                                                    <p>{entry.reason || 'No reason or identifying note was provided.'}</p>
                                                </div>
                                                {entry.createdAt && (
                                                    <small>Added {new Date(entry.createdAt).toLocaleDateString()}</small>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button variant="secondary" onClick={() => this.setState({ banDetailsOpen: false })}>
                                        Close
                                    </Button>
                                </Modal.Footer>
                            </Modal>
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
