import React, { Component } from 'react';
import { Table } from 'react-bootstrap/';
import '../../App.css';

import { Container, Row, Col } from 'react-bootstrap/';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';

import rankimages from '../constants/smallrankimgs';
import Td from '../constants/td';

import { withFirebase } from '../Firebase';

class Rules extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    render() {
        return (
            <div className="pagePlaceholder">
                <h2>Rules</h2>
            </div>
        );
    }
}


export default Rules;