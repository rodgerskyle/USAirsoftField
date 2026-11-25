import { Card, CardContent, CardActions, Chip } from '@mui/material';
import MUIButton from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { ArrowBackIos, Edit } from '@mui/icons-material';
import React, { Component } from 'react';

import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/lab/Alert';


import * as ROLES from '../../constants/roles';
import { withFirebase } from '../../Firebase';
import { withAuthorization } from '../../session';
import EditSelectedForm from './EditSelectedForm';
import { matchesRental, rentalIdentity, rentalParticipants, rentalRows } from './utils/openRental';

import '../../../App.css';
import { Container } from 'react-bootstrap';
import EmptyState from './components/EmptyState';

function selectedRental(props, key, linkedGroupId) {
    const form = props.rentalForms?.find(row => String(row.key) === String(key));
    return { selectedKey: key ?? null, identity: rentalIdentity(form),
        selectionClosed: key != null && (!form || Boolean(linkedGroupId && form.checkInGroup?.id !== linkedGroupId)) };
}

class EditForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            ...selectedRental(props, props.initialFormKey, props.initialLinkedGroupId),
            rentalsSuccess: null,
            rentalsError: null,
        };
    }

    componentDidUpdate(previous) {
        if (!this.state.manualSelection && !this.state.selectionClosed && this.props.initialFormKey != null && this.props.initialFormKey !== previous.initialFormKey) {
            this.setState(selectedRental(this.props, this.props.initialFormKey, this.props.initialLinkedGroupId));
        } else if (this.state.selectedKey != null && !this.state.selectionClosed) {
            const current = this.props.rentalForms?.find(row => String(row.key) === String(this.state.selectedKey));
            if (!matchesRental(current, this.state.identity)) this.setState({ selectionClosed: true });
            else if (!this.state.identity?.groupId && current.checkInGroup?.id) this.setState({ identity: rentalIdentity(current) });
        }
    }

    render() {
        const { selectedKey, rentalsError, rentalsSuccess } = this.state;
        const { rentalForms = [], firebase, uid, canImportGroup, initialGroupId } = this.props;
        const form = selectedKey != null && !this.state.selectionClosed
            ? rentalForms.find(row => String(row.key) === String(selectedKey) && matchesRental(row, this.state.identity)) : null;

        return (
            <Container>
                {selectedKey == null ? (
                    <div className="rental-forms-list">
                        <h2 className="section-header">Edit Rental Forms</h2>
                        {rentalForms && rentalForms.length > 0 && (
                            <Paper elevation={3} className="forms-container">
                                {rentalForms.map((form) => (
                                    <Card key={form.key} className="rental-form-card">
                                        <CardContent>
                                            <Typography variant="h6" className="form-name">
                                                {form.name}
                                            </Typography>
                                            <Typography component="div" color="textSecondary" className="form-details">
                                                {form.size} Participants
                                                {form.complete ?
                                                    <Chip
                                                        label="Active"
                                                        color="success"
                                                        size="small"
                                                        className="status-chip"
                                                    /> :
                                                    <Chip
                                                        label="Not Ready"
                                                        color="warning"
                                                        size="small"
                                                        className="status-chip"
                                                    />
                                                }
                                            </Typography>
                                        </CardContent>
                                        <CardActions>
                                            <MUIButton
                                                size="small"
                                                color="primary"
                                                onClick={() => this.setState({ ...selectedRental(this.props, form.key), manualSelection: true })}
                                                startIcon={<Edit />}
                                            >
                                                Edit Form
                                            </MUIButton>
                                        </CardActions>
                                    </Card>
                                ))}
                            </Paper>
                        )}
                        {(!rentalForms || rentalForms.length === 0) && <EmptyState />}
                    </div>
                ) : (
                    <div>
                        <div className="edit-form-header">
                            {!this.props.checkedInPlayer && <MUIButton
                                variant="outlined"
                                startIcon={<ArrowBackIos />}
                                onClick={() => this.setState({ selectedKey: null, manualSelection: true })}
                                className="back-button"
                            >
                                Back to Forms
                            </MUIButton>}
                            {form && <h3>Editing: {form.name}</h3>}
                        </div>
                        {form && !form.returned ? <EditSelectedForm key={form.key} index={form.key}
                            form={{ ...form, participants: rentalParticipants(form.participants), available: rentalRows(form.available) }}
                            firebase={firebase} uid={uid} canImportGroup={canImportGroup} initialGroupId={initialGroupId}
                            returnToCheckIn={this.props.returnToCheckIn}
                            checkedInPlayer={this.props.checkedInPlayer} verifyCheckedInPlayer={this.props.verifyCheckedInPlayer} onOpenReturns={this.props.onOpenReturns}
                            showAP={this.props.showAP} /> : <p role="status">This rental form is no longer open.</p>}
                    </div>
                )}

                <Snackbar
                    open={rentalsSuccess !== null}
                    autoHideDuration={6000}
                    onClose={() => this.setState({ rentalsSuccess: null })}
                >
                    <Alert severity="success">
                        {rentalsSuccess}
                    </Alert>
                </Snackbar>

                <Snackbar
                    open={rentalsError !== null}
                    autoHideDuration={6000}
                    onClose={() => this.setState({ rentalsError: null })}
                >
                    <Alert severity="error">
                        {rentalsError}
                    </Alert>
                </Snackbar>
            </Container>
        );
    }
}

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(EditForm));

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
// )(EditForm);
