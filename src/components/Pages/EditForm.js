import { Avatar, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Modal, Fade, Backdrop, AccordionActions } from '@material-ui/core';
import MUIButton from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import InputBase from '@material-ui/core/InputBase';
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
// Imports for Drag N drop
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
        };
    }

    componentWillUnmount() {
        this.props.firebase.rentalGroups().off()
        this.props.firebase.rentalOptions().off()
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

            // let optionsObjectarr = {};
            // for (let i=0; i<optionsObject.length; i++)
            //     optionsObjectarr[optionsObject[i].value] = {...optionsObject[i]}

            let options = Object.keys(optionsObject).map(key => ({
                ...optionsObject[key]
            }))

            this.setState({ options, loading: false })
        })
    }
    // Map the options array with the available one
    mapOptions = (ind) => {
        const { rentalForms, options } = this.state
        if (rentalForms[ind].available) {
            let new_options = this.state.options
            rentalForms[ind].available.forEach(item => {
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
        const { rentalForms, index } = this.state
        let size = parseInt(rentalForms[index].size)
        if (add) {
            // Add to max
            size += 1
            this.props.firebase.rentalGroup(index).update({ size })
        }
        else {
            // Subtract max amount but verify that the number of participants is less
            if (size - 1 !== 0) {
                if (rentalForms[index].participants && rentalForms[index].participants.length < size) {
                    size -= 1;
                }
                else if (!rentalForms[index].participants) {
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
        let available = optionsState.filter(obj => obj.amount > 0)
        if (this.validateItems(rentalForms[index].available ? rentalForms[index].available : null)) {
            this.incrementStock(rentalForms[index].available ? rentalForms[index].available : null)
            this.props.firebase.rentalGroup(index).update({ available })
            this.setState({ rentalsSuccess: `The ${rentalForms[index].name} group's available rentals was updated.` })
        }
    }

    render() {
        const editProps = { showAP: this.props.showAP, index: this.state.index }
        const { loading, editting, rentalForms, options, index, authUser, open, expanded, optionsState,
            rentalsSuccess, rentalsError } = this.state

        const classes = makeStyles((theme) => ({
            modal: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            },
            paper: {
                backgroundColor: "rgb(73 80 87 / .9)",
                border: '2px solid #000',
                boxShadow: theme.shadows[5],
                padding: theme.spacing(2, 4, 3),
                borderRadius: "5px",
            },
            root: {
                width: '100%',
            },
            heading: {
                fontSize: theme.typography.pxToRem(15),
                flexBasis: '33.33%',
                flexShrink: 0,
                color: 'white',
            },
            secondaryHeading: {
                fontSize: theme.typography.pxToRem(15),
                color: theme.palette.text.secondary,
            },
        }));

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
                                                                // this.setState({ index: i, editting: true })
                                                                this.setState({optionsState: options}, () => {
                                                                    this.mapOptions(i)
                                                                })
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
                        <div>
                            <Row className="row-transaction-rf">
                                <h5 className="h5-transaction-rf">{`Transaction #${rentalForms[index].transaction}`}</h5>
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
                                <h5 className="h5-group-name-rf">{`Group: ${rentalForms[index].name}`}</h5>
                            </Row>
                            <EditSelectedForm {...editProps} />
                            <Modal
                                aria-labelledby="Rental Settings"
                                className={classes.modal}
                                open={open}
                                onClose={() => this.setState({ open: false })}
                                closeAfterTransition
                                BackdropComponent={Backdrop}
                                BackdropProps={{
                                    timeout: 500,
                                }}>
                                <Fade in={open}>
                                    <div className={classes.paper}>
                                        <div className="div-modal-settings-rf">
                                            <Accordion expanded={expanded === 'panel1'} onChange={this.handleChange('panel1')}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    aria-controls="summarypanel-content"
                                                    id="summarypanel"
                                                >
                                                    <Typography className={classes.heading}>General settings</Typography>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <Typography>
                                                        {`Group: ${rentalForms[index].name}`}<br />
                                                        {`Transaction: ${rentalForms[index].transaction}`}
                                                    </Typography>
                                                </AccordionDetails>
                                            </Accordion>
                                            <Accordion expanded={expanded === 'panel2'} onChange={this.handleChange('panel2')}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    aria-controls="userspanel-content"
                                                    id="userspanel"
                                                >
                                                    <Typography className={classes.heading}>Users</Typography>
                                                    <Typography className={classes.secondaryHeading}>
                                                        Increase max number of users in group
                                            </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <Typography>
                                                        <IconButton aria-label="edit" style={{ padding: 0, paddingRight: '5px', color: "white" }}
                                                            onClick={() => {
                                                                this.changeMax(true)
                                                            }}>
                                                            <AddRounded />
                                                        </IconButton>
                                                        {rentalForms[index].size}
                                                        <IconButton aria-label="edit" style={{ padding: 0, paddingLeft: '5px', color: "white" }}
                                                            onClick={() => {
                                                                this.changeMax(false)
                                                            }}>
                                                            <RemoveRounded />
                                                        </IconButton>
                                                    </Typography>
                                                </AccordionDetails>
                                            </Accordion>
                                            <Accordion expanded={expanded === 'panel3'} onChange={this.handleChange('panel3')}>
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    aria-controls="rentalpanel-content"
                                                    id="rentalpanel"
                                                >
                                                    <Typography className={classes.heading}>Rentals</Typography>
                                                    <Typography className={classes.secondaryHeading}>
                                                        Add or remove rentals from group
                                            </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails className="accordion-details-rentals-rf">
                                                    <Typography>
                                                        {optionsState.map((rental, i) => {
                                                            return (<RentalRow key={i} obj={rental} set={this.setNumber.bind(this)} i={i} />)
                                                        })}
                                                    </Typography>
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
                                                    <Typography className={classes.heading}>Credit Card Information</Typography>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <Typography>
                                                        {`Name on Card: ${rentalForms[index].cc.name}`}<br />
                                                        {`Card Number: ${rentalForms[index].cc.number}`}<br />
                                                        {`Expiration: ${rentalForms[index].cc.expiry}`}<br />
                                                        {`CVC: ${rentalForms[index].cc.cvc}`}<br />
                                                        {`Zipcode: ${rentalForms[index].cc.zipcode}`}
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

// Rows for each rental selection the user will have
const RentalRow = ({ obj, set, i }) => {
    const classes = makeStyles((theme) => ({
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

    return (
        <Row>
            <Col>
                <Paper className={classes.root}>
                    <InputBase
                        className={classes.input}
                        placeholder="Amount:"
                        inputProps={{ 'aria-label': 'enter amount' }}
                        type="number"
                        value={obj.amount}
                        onChange={(e) => set(i, e.target.value)}
                    />

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