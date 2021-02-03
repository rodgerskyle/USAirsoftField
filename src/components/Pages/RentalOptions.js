import React, { Component } from 'react';
import { withFirebase } from '../Firebase';
import * as ROLES from '../constants/roles';
import { withAuthorization } from '../session';
import { compose } from 'recompose';
import { Col, Container, Row, Spinner } from 'react-bootstrap/';

import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import MUIButton from '@material-ui/core/Button';
import InputBase from '@material-ui/core/InputBase';
import Divider from '@material-ui/core/Divider';

import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

import '../../App.css';

class RentalOptions extends Component {
    constructor(props) {
        super(props);

        this.state = {
            options: null,
            loading: true,
            rentalsError: null,
            rentalsSuccess: null,
        };

    }

    componentDidMount() {
        this.props.firebase.rentalOptions().on('value', snapshot => {
            const optionsObject = snapshot.val()

            let options = Object.keys(optionsObject).map(key => ({
                ...optionsObject[key]
            }))

            this.setState({ options, loading: false })
        })
    }

    componentWillUnmount() {
        this.props.firebase.rentalOptions().off()
    }


    // Set number of max rentals given index
    setNumber(i, val) {
        const { options } = this.state
        // val = Math.floor(val)
        // if (val >= 0 && options[i].stock <= val) {
            let opt = [...options]
            opt[i].max = val
            this.setState({ options: opt })
        // }
    }

    // Submit the saved changes if it passes validation
    submit() {
        const { options } = this.state
        for (let i=0; i<options.length; i++) {
            if (options[i].stock > options[i].max) {
                //error case
                this.setState({
                    rentalsError: `The number inputted for ${options[i].value} was less than the current stock checked out.`,
                })
                return;
            }
        }
        this.props.firebase.rentalOptions().set(options)
        this.setState({rentalsSuccess: "Rental inventory successfully updated."})
    }

    render() {
        const {loading, rentalsSuccess, rentalsError} = this.state
        return (
            <Container>
                {loading ?
                    <Row className="spinner-standard">
                        <Spinner animation="border" />
                    </Row> :
                    <div>

                        <Row className="justify-content-row">
                            <Col>
                                <h5 className="h5-add-rental-rf">Rental Inventory:</h5>
                            </Col>
                        </Row>
                        <Row className="justify-content-row">
                            <div className="div-header-ro">
                                <Col className="col-header-ro" md={3}>
                                    <p className="header1-ro">
                                        In Use:
                            </p>
                                </Col>
                                <Col className="col-header-ro" md={3}>
                                    <p className="header2-ro">
                                        Max:
                            </p>
                                </Col>
                                <Col className="col-header-ro" md={6}>
                                    <p className="header3-ro">
                                        Rental:
                            </p>
                                </Col>
                            </div>
                        </Row>
                        <Row className="justify-content-row">
                            <Col md={"auto"}>
                                {this.state.options.map((rental, i) => {
                                    return (<RentalRow key={i} obj={rental} set={this.setNumber.bind(this)} i={i} />)
                                })}
                            </Col>
                        </Row>
                        <Row className="justify-content-row">
                            <Col md={7} className="col-save-button-ro">
                                <MUIButton type="button" onClick={() => {
                                    this.submit()
                                    // this.props.firebase.rentalOptions().set(this.state.optionsState)
                                    // this.setState({rentalsSuccess: "Rental inventory successfully updated."})
                                }}>
                                    Save
                        </MUIButton>
                            </Col>
                        </Row>
                    </div>
                }
                <Snackbar open={rentalsSuccess !== null} autoHideDuration={6000} onClose={() => this.setState({rentalsSuccess: null})}>
                    <Alert onClose={() => this.setState({rentalsSuccess: null})} severity="success">
                        {rentalsSuccess}
                    </Alert>
                </Snackbar>
                <Snackbar open={rentalsError !== null} autoHideDuration={6000} onClose={() => this.setState({rentalsError: null})}>
                    <Alert onClose={() => this.setState({rentalsError: null})} severity="error">
                        {rentalsError}
                    </Alert>
                </Snackbar>
            </Container>
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
        width: 600,
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

// Rows for each rental selection the user will have
const RentalRow = ({ obj, set, i }) => {
    const classes = useStyles();

    return (
        <Row>
            <Col className="col-rentals-ro">
                <Paper className={classes.root}>
                    <InputBase
                        className={classes.input}
                        placeholder="Stock:"
                        inputProps={{ 'aria-label': 'stock' }}
                        type="number"
                        value={obj.stock}
                        disabled
                    />

                    <Divider className={classes.divider} orientation="vertical" />

                    <InputBase
                        className={classes.input}
                        placeholder="Max:"
                        inputProps={{ 'aria-label': 'enter max' }}
                        type="number"
                        value={obj.max}
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
)(RentalOptions);