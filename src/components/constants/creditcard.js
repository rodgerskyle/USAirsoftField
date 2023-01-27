import { TextField } from '@mui/material';
import { Row, Col } from 'react-bootstrap/';
import React from 'react';
import Cards from './ccmodule';
import './cc-styles.scss';

import '../../App.css';

import { withStyles } from '@mui/styles';

const TextFieldCard = withStyles({
    root: {
        '& label.Mui-focused': {
            color: 'white',
        },
        '& .MuiInput-underline:after': {
            borderBottomColor: 'white',
        },
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: 'white',
            },
            '&:hover fieldset': {
                borderColor: 'white',
            },
            '&.Mui-focused fieldset': {
                borderColor: 'white',
            },
        },
        '& .MuiInputBase-input': {
            color: 'white',
            borderColor: 'white',
        },
        '&.MuiInputBase-root': {
            color: 'white',
        },
        '& .MuiFormLabel-root': {
            color: 'white',
        },
    },
})(TextField);

export default class PaymentForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            focus: '',
            cvcError: this.props.cvcError,
            numberError: this.props.numberError,
            zipcodeError: this.props.zipcodeError,
            nameError: this.props.nameError,
            expiryError: this.props.expiryError,
        };
    };

    handleInputFocus = (e) => {
        this.setState({ focus: e.target.name });
    }

    handleInputChange = (e) => {
        this.props.handleInputChange(e)
    }

    componentDidUpdate(prevProps) {
        if (this.props.cvcError !== prevProps.cvcError) {
            this.setState({ cvcError: this.props.cvcError })
        }
        if (this.props.numberError !== prevProps.numberError) {
            this.setState({ numberError: this.props.numberError })
        }
        if (this.props.zipcodeError !== prevProps.zipcodeError) {
            this.setState({ zipcodeError: this.props.zipcodeError })
        }
        if (this.props.nameError !== prevProps.nameError) {
            this.setState({ nameError: this.props.nameError })
        }
        if (this.props.expiryError !== prevProps.expiryError) {
            this.setState({ expiryError: this.props.expiryError })
        }
    }

    render() {
        const {
            cvcError, expiryError, nameError, numberError, zipcodeError
        } = this.state
        return (
            <div id="PaymentForm">
                <Row className="justify-content-row row-cc">
                    <Col md="auto" className="align-items-center-col">
                        <Cards
                            preview={true}
                            cvc={this.props.cvc}
                            expiry={this.props.expiry}
                            focused={this.state.focus}
                            name={this.props.name}
                            number={this.props.number.length >= 16 ? this.props.number.replace(/\s/g, '').replace(/\d(?=\d{4})/g, "*") : this.props.number}
                            zipcode={this.props.zipcode}
                            placeholders={{
                                name: 'YOUR NAME HERE',
                            }}
                        />
                    </Col>
                    <Col md="auto" className="align-items-center-col">
                        <div className="div-display-block">
                            <Row>
                                <Col className="col-cc">
                                    <TextFieldCard
                                        type="name"
                                        name="name"
                                        label="Name On Card"
                                        variant="outlined"
                                        required
                                        value={this.props.name}
                                        error={nameError !== null}
                                        helperText={nameError}
                                        onChange={this.props.handleInputChange}
                                        onFocus={this.handleInputFocus}
                                    />
                                </Col>
                                <Col className="col-cc">
                                    <TextFieldCard
                                        type={this.state.focus === "number" ? 'tel' : 'password'}
                                        name="number"
                                        label="Card Number"
                                        variant="outlined"
                                        required
                                        value={this.props.number}
                                        pattern="[\d| ]{16,22}"
                                        // value={this.props.number.length === 16 ? this.props.number.replace(/\d(?=\d{4})/g, "*") : this.props.number}
                                        error={numberError !== null}
                                        helperText={numberError}
                                        onChange={this.handleInputChange.bind(this)}
                                        onFocus={this.handleInputFocus}
                                    />
                                </Col>
                            </Row>
                            <Row>
                                <Col className="col-cc">
                                    <TextFieldCard
                                        type="tel"
                                        name="expiry"
                                        label="Valid Thru"
                                        variant="outlined"
                                        required
                                        value={this.props.expiry}
                                        pattern="\d\d/\d\d"
                                        error={expiryError !== null}
                                        helperText={expiryError}
                                        onChange={this.props.handleInputChange}
                                        onFocus={this.handleInputFocus}
                                    />
                                </Col>
                                <Col className="col-cc">
                                    <TextFieldCard
                                        type="password"
                                        name="cvc"
                                        label="CVC"
                                        variant="outlined"
                                        required
                                        value={this.props.cvc}
                                        pattern="\d{3,4}"
                                        error={cvcError !== null}
                                        helperText={cvcError}
                                        onChange={this.props.handleInputChange}
                                        onFocus={this.handleInputFocus}
                                    />
                                </Col>
                            </Row>
                            <Row>
                                <Col className="col-cc">
                                    <TextFieldCard
                                        type="tel"
                                        name="zipcode"
                                        label="Billing Zipcode"
                                        variant="outlined"
                                        className="textfield-zip-cc"
                                        required
                                        value={this.props.zipcode}
                                        error={zipcodeError !== null}
                                        helperText={zipcodeError}
                                        onChange={this.props.handleInputChange}
                                        onFocus={this.handleInputFocus}
                                    />
                                </Col>
                            </Row>
                        </div>
                    </Col>
                </Row>
            </div>
        );
    }
}