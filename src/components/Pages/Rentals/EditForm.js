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

import '../../../App.css';
import { Container } from 'react-bootstrap';
import EmptyState from './components/EmptyState';

class EditForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editting: false,
            options: null,
            index: -1,
            authUser: null,
            open: false,
            expanded: false,
            optionsState: null,
            rentalsSuccess: null,
            rentalsError: null,
            rentalForm: null,
            showSummary: false
        };
    }

    componentDidUpdate = (prevProps) => {
        if (prevProps.rentalForms !== this.props.rentalForms) {
            this.setState({
                rentalForms: this.props.rentalForms,
                rentalForm: this.props.rentalForms.find(form => form.key === this.state.index)
            })
        }
    }

    handleEditForm = (index, form) => {
        this.setState({
            editting: true,
            index,
            rentalForm: form
        });
    };

    render() {
        const { editting, index, rentalsError, rentalsSuccess } = this.state;
        const { rentalForms, rentalOptions } = this.props;

        return (
            <Container>
                {!editting ? (
                    <div className="rental-forms-list">
                        <h2 className="section-header">Edit Rental Forms</h2>
                        {rentalForms && rentalForms.length > 0 && (
                            <Paper elevation={3} className="forms-container">
                                {rentalForms.map((form, i) => (
                                    <Card key={i} className="rental-form-card">
                                        <CardContent>
                                            <Typography variant="h6" className="form-name">
                                                {form.name}
                                            </Typography>
                                            <Typography color="textSecondary" className="form-details">
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
                                                onClick={() => this.handleEditForm(form.key, form)}
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
                            <MUIButton
                                variant="outlined"
                                startIcon={<ArrowBackIos />}
                                onClick={() => this.setState({ editting: false, index: -1 })}
                                className="back-button"
                            >
                                Back to Forms
                            </MUIButton>
                            <h3 style={{ color: '#fff' }}>Editing: {this.state.rentalForm?.name}</h3>
                        </div>
                        <EditSelectedForm
                            index={index}
                            form={this.state.rentalForm}
                            firebase={this.props.firebase}
                            showAP={this.props.showAP}
                        />
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