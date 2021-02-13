import { Avatar, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Modal, Fade, Backdrop, AccordionActions } from '@material-ui/core';
import MUIButton from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import { AddRounded, ArrowBackIos, Contacts, RemoveRounded, Edit } from '@material-ui/icons';
import React, { Component } from 'react';
import { Col, Row, Spinner } from 'react-bootstrap/';
import { compose } from 'recompose';

import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

import * as ROLES from '../constants/roles';
import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import EditSelectedForm from './EditSelectedForm';

import '../../App.css';

class EditForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            rentalForms: null,
            authUser: this.props.authUser,
            options: null,
            optionsState: null,
            editting: false,
            index: -1,
            open: false,
            rentalsError: null,
            rentalsSuccess: null,
            expanded: false,
            rentalForm: null,
        };
    }

    componentWillUnmount() {
        this.props.firebase.rentalGroups().off()
        this.props.firebase.rentalOptions().off()
        if (this.state.index !== -1)
            this.props.firebase.rentalGroup(this.state.index).off()
    }

    componentDidMount() {
        this.props.firebase.rentalGroups().on('value', snapshot => {
            const rentalsObject = snapshot.val()
            let rentalForms = []
            if (rentalsObject) {
                rentalForms = Object.keys(rentalsObject).map(key => ({
                    ...rentalsObject[key]
                }))
                this.setState({rentalForms})
            }
            else {
                this.setState({ rentalForms })
            }
        })

        this.props.firebase.rentalOptions().on('value', snapshot => {
            const optionsObject = snapshot.val()

            let options = Object.keys(optionsObject).map(key => ({
                ...optionsObject[key]
            }))

            if (this.state.editting)
                this.mapOptions(this.state.index)

            this.setState({ options, loading: false })
        })
    }
    // Map the options array with the available one
    mapOptions = (ind) => {
        const { rentalForm, options } = this.state
        if (rentalForm.available) {
            let new_options = this.state.options
            rentalForm.available.forEach(item => {
                let i = parseInt(item.id.substring(1))
                // let i = parseInt(optionsObject[item.value].id.substring(1))
                new_options[i].amount = item.amount
            })
            this.setState({ optionsState: new_options, index: ind, editting: true })
        }
        else {
            this.setState({ optionsState: options, index: ind, editting: true })
        }
    }

    handleChange = (panel) => (event, isExpanded) => {
        this.setState({ expanded: (isExpanded ? panel : false) })
    };

    setNumber = (i, val) => {
        val = Math.floor(val)
        if (val >= 0) {
            let opt = [...this.state.optionsState]
            opt[i].amount = val
            this.setState({ options: opt })
        }
    }


    // Validates items in selected options for group
    validateItems = (available) => {
        const { optionsState, options } = this.state
        let optionsSelected = JSON.parse(JSON.stringify(optionsState))
        // We need to filter out the ones that already had an amount
        if (available) {
            for (let i = 0; i < available.length; i++) {
                let y = parseInt(available[i].id.substring(1))
                optionsSelected[y].amount -= available[i].amount
            }
        }
        for (let i = 0; i < optionsState.length; i++) {
            if (optionsSelected[i].amount + options[i].stock > options[i].max) {
                this.setState({ rentalsError: `For the ${optionsState[i].label} rental, we only have ${options[i].max - options[i].stock} left. Please ask a US Airsoft Employee to clarify.` })
                return false;
            }
        }
        this.setState({ rentalsError: null })
        return true
    }


    // Increments stock of guns selected from the database
    incrementStock = (available) => {
        const { options, optionsState } = this.state
        let newOptions = options;
        let optionsSelected = JSON.parse(JSON.stringify(optionsState))
        // We need to filter out the ones that already had an amount
        if (available) {
            for (let i = 0; i < available.length; i++) {
                let y = parseInt(available[i].id.substring(1))
                optionsSelected[y].amount -= available[i].amount
            }
        }
        for (let i = 0; i < options.length; i++) {
            let num = optionsSelected[i].amount !== "" ? parseInt(optionsSelected[i].amount) : 0
            newOptions[i].stock = parseInt(newOptions[i].stock) + num
            newOptions[i].amount = ""
        }
        this.props.firebase.rentalOptions().set(newOptions)
    }

    // Changes group max size
    changeMax = (add) => {
        const { rentalForm, index } = this.state
        let size = parseInt(rentalForm.size)
        if (add) {
            // Add to max
            size += 1
            this.props.firebase.rentalGroup(index).update({ size })
        }
        else {
            // Subtract max amount but verify that the number of participants is less
            if (size - 1 !== 0) {
                if (rentalForm.participants && rentalForm.participants.length < size) {
                    size -= 1;
                }
                else if (!rentalForm.participants) {
                    size -= 1;
                }
                else {
                    this.setState({ rentalsError: `You must remove users in order to decrease the size.` })
                }
                this.props.firebase.rentalGroup(index).update({ size })
            }
        }
    }

    // Saves changes to rentals done
    saveAvailable = () => {
        const { optionsState, rentalForms, index } = this.state
        let available = JSON.parse(JSON.stringify(optionsState)).filter(obj => obj.amount > 0)
        if (this.validateItems(rentalForms[index].available ? rentalForms[index].available : null)) {
            this.incrementStock(rentalForms[index].available ? rentalForms[index].available : null)
            this.props.firebase.rentalGroup(index).update({ available }, () => {
                this.mapOptions(index)
            })
            this.setState({ rentalsSuccess: `The ${rentalForms[index].name} group's available rentals was updated.` })
        }
    }

    render() {
        const editProps = { showAP: this.props.showAP, index: this.state.index }
        const { loading, editting, rentalForms, options, index, authUser, open, expanded, optionsState,
            rentalsSuccess, rentalsError, rentalForm} = this.state

        return (
            <div>
                {loading ?
                    <Row className="spinner-standard">
                        <Spinner animation="border" />
                    </Row>
                    :
                    !editting ?
                        <div>
                            <h5 className="admin-header">Edit Rental Form</h5>
                            <List className="list-edit-rf">
                                {rentalForms && rentalForms.length > 0 ?
                                    rentalForms.map((form, i) => {
                                        if (form.complete === true) {
                                            return (
                                                <ListItem key={i}>
                                                    <ListItemAvatar>
                                                        <Avatar>
                                                            <Contacts />
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={form.name}
                                                        secondary={`${form.size} Participants`}
                                                    />
                                                    <ListItemSecondaryAction>
                                                        <IconButton edge="end" aria-label="edit"
                                                            onClick={() => {
                                                                // setIndex(i)
                                                                // setEditting(true)
                                                                this.props.setParentIndex(i)
                                                                this.props.firebase.rentalGroup(i).on('value', obj => {
                                                                    this.setState({rentalForm: obj.val(), optionsState: options}, () => {
                                                                        this.mapOptions(i)
                                                                    })
                                                                })
                                                                // this.setState({ index: i, editting: true })
                                                            }}>
                                                            <Edit />
                                                        </IconButton>
                                                    </ListItemSecondaryAction>
                                                </ListItem>
                                            )
                                        } else return null
                                    }) : <p className="p-empty-rentals-rf">Add Rental Forms to see groups here.</p>}
                            </List>
                        </div> :
                        <div className="div-parent-ef">
                            <Row className="row-transaction-rf">
                                <h5 className="h5-transaction-rf">{`Transaction #${rentalForm.transaction}`}</h5>
                            </Row>
                            <div className="div-back-button-rf">
                                <MUIButton
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    startIcon={<ArrowBackIos />}
                                    onClick={() => {
                                        this.setState({ editting: false })
                                        this.props.showAP(false)
                                        this.props.firebase.rentalGroup(index).off()
                                    }}>
                                    Back
                        </MUIButton>
                            </div>
                            <Row className="justify-content-row row-group-name-rf">
                                {!!authUser.roles[ROLES.ADMIN] ?
                                    <IconButton aria-label="edit" style={{ padding: 0, paddingRight: '5px', color: "white" }}
                                        onClick={() => {
                                            this.setState({ open: true })
                                        }}>
                                        <Edit />
                                    </IconButton> : null}
                                <h5 className="h5-group-name-rf">{`Group: ${rentalForm.name}`}</h5>
                            </Row>
                            <EditSelectedForm {...editProps} />
                            <Modal
                                aria-labelledby="Rental Settings"
                                className={"modal-ef"}
                                open={open}
                                onClose={() => this.setState({ open: false })}
                                closeAfterTransition
                                BackdropComponent={Backdrop}
                                BackdropProps={{
                                    timeout: 500,
                                }}>
                                <Fade in={open}>
                                    <div className={"paper-ef"}>
                                        <div className="div-modal-settings-rf">
                                            <Accordion expanded={expanded === 'panel1'} onChange={this.handleChange('panel1')}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    aria-controls="summarypanel-content"
                                                    id="summarypanel"
                                                >
                                                    <Typography className={"heading-ef"}>General settings</Typography>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <Typography>
                                                        {`Group: ${rentalForm.name}`}<br />
                                                        {`Transaction: ${rentalForm.transaction}`}
                                                    </Typography>
                                                </AccordionDetails>
                                            </Accordion>
                                            <Accordion expanded={expanded === 'panel2'} onChange={this.handleChange('panel2')}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    aria-controls="userspanel-content"
                                                    id="userspanel"
                                                >
                                                    <Typography className={"heading-ef"}>Users</Typography>
                                                    <Typography className={"secondaryHeading-ef"}>
                                                        Change number of users
                                            </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails className="accordion-details-rentals-ef">
                                                    <div>
                                                        <IconButton aria-label="edit" style={{ padding: 0, paddingRight: '5px', color: "white" }}
                                                            onClick={() => {
                                                                this.changeMax(true)
                                                            }}>
                                                            <AddRounded />
                                                        </IconButton>
                                                        {rentalForm.size}
                                                        <IconButton aria-label="edit" style={{ padding: 0, paddingLeft: '5px', color: "white" }}
                                                            onClick={() => {
                                                                this.changeMax(false)
                                                            }}>
                                                            <RemoveRounded />
                                                        </IconButton>
                                                    </div>
                                                </AccordionDetails>
                                            </Accordion>
                                            <Accordion expanded={expanded === 'panel3'} onChange={this.handleChange('panel3')}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    aria-controls="rentalpanel-content"
                                                    id="rentalpanel"
                                                >
                                                    <Typography className={"heading-ef"}>Rentals</Typography>
                                                    <Typography className={"secondaryHeading-ef"}>
                                                        Add or remove rentals from group
                                            </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails className="accordion-details-rentals-rf">
                                                    <div>
                                                        {optionsState.map((rental, i) => {
                                                            return (<RentalRow key={i} obj={rental} set={this.setNumber.bind(this)} i={i} />)
                                                        })}
                                                    </div>
                                                </AccordionDetails>
                                                <Divider />
                                                <AccordionActions className="accordion-actions-rentals-rf">
                                                    <MUIButton type="button" onClick={() => {
                                                        this.saveAvailable()
                                                    }}>
                                                        Save
                                            </MUIButton>
                                                </AccordionActions>
                                            </Accordion>
                                            <Accordion expanded={expanded === 'panel4'} onChange={this.handleChange('panel4')}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    aria-controls="creditcardpanel-content"
                                                    id="creditcardpanel"
                                                >
                                                    <Typography className={"heading-ef"}>Credit Card Information</Typography>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <Typography>
                                                        {`Name on Card: ${rentalForm.cc.name}`}<br />
                                                        {`Card Number: ${rentalForm.cc.number}`}<br />
                                                        {`Expiration: ${rentalForm.cc.expiry}`}<br />
                                                        {`CVC: ${rentalForm.cc.cvc}`}<br />
                                                        {`Zipcode: ${rentalForm.cc.zipcode}`}
                                                    </Typography>
                                                </AccordionDetails>
                                            </Accordion>
                                        </div>
                                    </div>
                                </Fade>
                            </Modal>
                        </div>
                }
                <Snackbar open={rentalsSuccess !== null} autoHideDuration={6000} onClose={() => this.setState({ rentalsSuccess: null })}>
                    <Alert onClose={() => this.setState({ rentalsSuccess: null })} severity="success">
                        {rentalsSuccess}
                    </Alert>
                </Snackbar>
                <Snackbar open={rentalsError !== null} autoHideDuration={6000} onClose={() => this.setState({ rentalsError: null })}>
                    <Alert onClose={() => this.setState({ rentalsError: null })} severity="error">
                        {rentalsError}
                    </Alert>
                </Snackbar>
            </div>
        )
    }
}

const useStyles = makeStyles((theme) => ({
    root: {
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'center',
        float: 'right',
        background: '#424242',
        margin: '5px',
        width: 400,
    },
    input: {
        marginLeft: theme.spacing(1),
        color: 'white',
        width: "20%",
    },
    divider: {
        marginLeft: 15,
        height: 28,
        margin: 4,
        background: "rgba(255, 255, 255, 0.12)",
    },
    label: {
        color: 'white',
        fontSize: "1rem",
        margin: 0,
        flex: 1,
        marginRight: 15,
        marginLeft: 15,
    }
}));


// Rows for each rental selection the user will have
const RentalRow = ({ obj, set, i }) => {
    const classes = useStyles()

    return (
        <Row>
            <Col>
                <Paper className={classes.root}>
                    <IconButton aria-label="edit" style={{ padding: 0, paddingRight: '5px', color: "white" }}
                        onClick={() => {
                            if (obj.amount !== "")
                                set(i, obj.amount+1)
                            else
                                set(i, 1)
                        }}>
                        <AddRounded />
                    </IconButton>
                    {obj.amount === "" ? 0 : obj.amount}
                    <IconButton aria-label="edit" style={{ padding: 0, paddingLeft: '5px', color: "white" }}
                        onClick={() => {
                            if (obj.amount !== "")
                                set(i, obj.amount-1)
                        }}>
                        <RemoveRounded />
                    </IconButton>
                    <Divider className={classes.divider} orientation="vertical" />
                    <h5 className={classes.label}>{obj.label}</h5>
                </Paper>
            </Col>
        </Row>
    )
}



const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default compose(
    withAuthorization(condition),
    withFirebase,
)(EditForm);