import { Avatar, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Modal, Fade, Backdrop, AccordionActions, Card, CardContent, CardActions, Chip } from '@mui/material';
import MUIButton from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import { AddRounded, ArrowBackIos, Contacts, RemoveRounded, Edit, VerifiedUser, Warning, ExpandMore } from '@mui/icons-material';
import React, { Component, useState } from 'react';
import { Col, Row, Spinner } from 'react-bootstrap/';
import { onValue, set, update, get } from 'firebase/database';

import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/lab/Alert';

import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

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
                                                onClick={() => this.handleEditForm(i, form)}
                                                startIcon={<Edit />}
                                            >
                                                Edit Form
                                            </MUIButton>
                                        </CardActions>
                                    </Card>
                                ))}
                            </Paper>
                        )}
                        {!rentalForms || rentalForms.length === 0 && <EmptyState />}
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
                            <h3 style={{ color: '#fff' }}>Editing: {this.state.rentalForm.name}</h3>
                        </div>
                        <EditSelectedForm
                            index={index}
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

// Summary of the created rental form
function Summary({ createdIndex, newForm, firebase, goBack }) {

    const [loading] = useState(false)
    const [transaction, setTransaction] = useState("")
    const [error, setError] = useState(null)

    function updateForm() {
        newForm.complete = true;
        newForm.transaction = transaction
        set(firebase.rentalGroup(createdIndex), newForm)
    }

    return (
        <div className="div-add-rental-rf">
            {loading ?
                <Row className="spinner-standard">
                    <Spinner animation="border" />
                </Row>
                :
                <div>
                    <div className="div-back-button-rf">
                        <MUIButton
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<ArrowBackIos />}
                            onClick={() => {
                                goBack()
                            }}>
                            Back
                        </MUIButton>
                    </div>
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
                                    goBack()
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

// Rows for each rental selection the user will have
const RentalRow = ({ obj, set, i }) => {

    return (
        <Row>
            <Col>
                <Paper>
                    <IconButton aria-label="edit" style={{ padding: 0, paddingRight: '5px', color: "white" }}
                        onClick={() => {
                            if (obj.amount !== "")
                                set(i, +obj.amount + 1)
                            else
                                set(i, 1)
                        }}>
                        <AddRounded />
                    </IconButton>
                    {obj.amount === "" ? 0 : obj.amount}
                    <IconButton aria-label="edit" style={{ padding: 0, paddingLeft: '5px', color: "white" }}
                        onClick={() => {
                            if (obj.amount !== "")
                                set(i, +obj.amount - 1)
                        }}>
                        <RemoveRounded />
                    </IconButton>
                    <Divider orientation="vertical" />
                    <h5>{obj.label}</h5>
                </Paper>
            </Col>
        </Row>
    )
}



const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(EditForm));

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
// )(EditForm);