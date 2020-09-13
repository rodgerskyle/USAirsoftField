import React, { Component } from 'react';
import { Table } from 'react-bootstrap/';
import '../../App.css';

import { Container, Row, Col } from 'react-bootstrap/';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';

import rankimages from '../constants/smallrankimgs';
import Td from '../constants/td';

import { withFirebase } from '../Firebase';

class Pictures extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }


    render() {
        return (
            <div className="background-static-all">
                <div className="pagePlaceholder">
                    <h2>Pictures</h2>
                </div>
            </div>
        );
    }
}


export default Pictures;