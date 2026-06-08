import React, { Component } from 'react';
import '../../App.css';

import map from '../../assets/MapHigherRes.png';
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
            <div className="background-static-all map-page">
                <Helmet>
                    <title>US Airsoft Field: Map</title>
                </Helmet>
                <Container className="map-page-shell">
                    <Row className="justify-content-center mt-4">
                        <Col xl={10}>
                            <div className="map-intro-card">
                                <div className="map-intro-copy">
                                    <p className="map-eyebrow">Field Map</p>
                                    <h1 className="map-title">View the layout before you arrive.</h1>
                                    <p className="map-lead">
                                        Use the interactive map to look over the arena, identify key areas,
                                        and get familiar with the field before game day.
                                    </p>
                                </div>
                            </div>
                            <div className="map-viewer-card">
                                <div className="map-viewer-header">
                                    <div>
                                        <h2 className="map-card-title">Interactive Map</h2>
                                        <p className="map-card-copy">Tap or hover to zoom in and explore the field in more detail.</p>
                                    </div>
                                </div>
                                <div className="map-magnifier-shell">
                                    <SideBySideMagnifier
                                        imageSrc={map}
                                        className="img-map"
                                        imageAlt="Field Map"
                                        largeImageSrc={map}
                                        alwaysInPlace={false}
                                        fillAvailableSpace={false}
                                        inPlaceMinBreakpoint={1200}
                                        overlayOpacity={0.18}
                                        overlayBoxOpacity={0.2}
                                        zoomContainerBorder="1px solid rgba(255,255,255,0.08)"
                                        zoomContainerBoxShadow="0 18px 44px rgba(0,0,0,0.32)"
                                        touchActivation={TOUCH_ACTIVATION.TAP}
                                    />
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }
}


export default Map;
