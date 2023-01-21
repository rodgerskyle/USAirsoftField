import React, { Component } from 'react';
import { Row, Col } from 'react-bootstrap';
import '../../App.css';

class Preheader extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    render() {
        return (
            <div className="preheader-parent-div">
                <Row>
                    <Col>
                        <a className="preheader-link" href="https://www.usairsoft.com" target="_blank" rel="noopener noreferrer">
                            COME CHECK OUT THE ONLINE STORE!
                        </a>
                    </Col>
                </Row>
            </div>
        );
    }
}


export default Preheader;