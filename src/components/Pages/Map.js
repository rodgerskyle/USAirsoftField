import React, { Component } from 'react';
import '../../App.css';

import map from '../../assets/MapHigherRes.jpg';
import lowmap from '../../assets/MapLowerRes.jpg'

import { SideBySideMagnifier, TOUCH_ACTIVATION } from "@datobs/react-image-magnifiers";

import { Container, Row, Col } from 'react-bootstrap/';
import { Helmet } from 'react-helmet-async';

class Map extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    render() {
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Map</title>
                </Helmet>
                <div className="mapStyle">
                    <h2 className="page-header">Map</h2>
                    <Container>
                        <Row>
                            <Col>
                                <SideBySideMagnifier
                                    imageSrc={lowmap}
                                    className="img-map"
                                    imageAlt="Field Map"
                                    largeImageSrc={map}
                                    alwaysInPlace={true}
                                    fillAvailableSpace={true}
                                    touchActivation={TOUCH_ACTIVATION.TAP}
                                />
                            </Col>
                        </Row>
                    </Container>
                </div>
            </div>
        );
    }
}


export default Map;