import * as React from "react";
import { Component } from "react";

import PinInput from 'react-pin-input'

class PinCode extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: ""
        }
    };

    onChange = value => {
        this.setState({ value });
      };

    render() {
        return (
            <PinInput 
            length={4} 
            initialValue=""
            secret 
            onChange={(value, index) => {this.onChange(value)}} 
            type="numeric" 
            inputMode="numeric"
            style={{padding: '10px'}}  
            inputStyle={{borderColor: 'white'}}
            inputFocusStyle={{borderColor: 'blue'}}
            onComplete={(value, index) => {this.props.completePin(value)}}
            autoSelect={true}
            regexCriteria={/^[ A-Za-z0-9_@./#&+-]*$/}
            />
        );
    }
}

export default PinCode;