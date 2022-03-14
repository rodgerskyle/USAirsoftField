import React, { Component } from 'react';
import '../../App.css';
import { Container, Row, Col, Card, Button, Fade } from 'react-bootstrap/';
import { Link } from 'react-router-dom';
import GradientButton from '../constants/gradientbutton';
import { Helmet } from 'react-helmet-async';

class Pricing extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showArray: new Array(4).fill(false),
            index: 0,
            title: "Membership Pricing"
        };
    }

    componentDidMount() {
        let tempArray = this.state.showArray;
        tempArray[0] = true;
        this.setState({showArray: tempArray})
    }

    render() {
        return (
            <div className="background-static-all">
                <Helmet>
                    <title>US Airsoft Field: Pricing</title>
                </Helmet>
                <h2 className="page-header">{this.state.title}</h2>
                <Container>
                    <Row className="justify-content-row standard-navigation-buttons-row-pricing">
                        <GradientButton color={this.state.showArray[0] ? "silver-black" : "black-silver"}
                        onClick={() => {
                            let showArray = this.state.showArray;
                            showArray.fill(false)
                            this.setState({showArray}, () => {
                                showArray[0] = true;
                                setTimeout(() => { 
                                    this.setState({showArray, title: "Membership Pricing"})
                                }, 150)
                            })
                        }}>Membership</GradientButton>
                        <GradientButton color={this.state.showArray[1] ? "silver-black" : "black-silver"}
                        onClick={() => {
                            let showArray = this.state.showArray;
                            showArray.fill(false)
                            this.setState({showArray}, () => {
                                showArray[1] = true;
                                setTimeout(() => { 
                                    this.setState({showArray, title: "Admission Pricing"})
                                }, 150)
                            })
                        }}>Admission</GradientButton>
                        <GradientButton color={this.state.showArray[2] ? "silver-black" : "black-silver"}
                        onClick={() => {
                            let showArray = this.state.showArray;
                            showArray.fill(false)
                            this.setState({showArray}, () => {
                                showArray[2] = true;
                                setTimeout(() => { 
                                    this.setState({showArray, title: "Rental Pricing"})
                                }, 150)
                            })
                        }}>Rental</GradientButton>
                        <GradientButton color={this.state.showArray[3] ? "silver-black" : "black-silver"}
                        onClick={() => {
                            let showArray = this.state.showArray;
                            showArray.fill(false)
                            this.setState({showArray}, () => {
                                showArray[3] = true;
                                setTimeout(() => { 
                                    this.setState({showArray, title: "Birthday Pricing"})
                                }, 150)
                            })
                        }}>Birthday</GradientButton>
                    </Row>
                    <Fade in={this.state.showArray[0]} unmountOnExit={true}>
                        <div>
                            <Row className="justify-content-row">
                                <Col sm={6} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center standard-card-header-pricing">NEW MEMBERSHIP</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$40.00*</Card.Title>
                                                <dl>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Unique Identification Card 
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        $5.00 off rental equipment and gameplay 
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Saved waiver for easy check-in 
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Stat tracking to display performance and progress
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Your own personal account
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Ability to create/join teams online 
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Free game for every 450 points earned
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        US Airsoft Velcro Patch
                                                    </dd>
                                                    {/* <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        US Airsoft Lanyard
                                                    </dd> */}
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        US Airsoft Rank Patch
                                                    </dd>
                                                    {/* <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        US Airsoft Wrist Band
                                                    </dd> */}
                                                </dl>
                                                <p className="text-align-center">
                                                    *$30 annually after the initial $40.
                                                </p>
                                                <p className="text-align-center">
                                                    Please contact us to further inquire about signing up for a membership.
                                                </p>
                                        </Card.Body>
                                        <Card.Footer>
                                            <Row className="justify-content-row">
                                                <Link to="/contact">
                                                    <Button variant="primary">Contact Us</Button>
                                                </Link>
                                            </Row>
                                        </Card.Footer>
                                    </Card>
                                </Col>
                                {/* <Col sm={6} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center">Non-Member</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">Free</Card.Title>
                                                <dl>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        Unique Identification Card 
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        $5.00 off rental equipment and gameplay 
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        Saved waiver for easy check-in 
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        Stat tracking to display performance and progress
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        Your own personal account at USAirsoft.com 
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        Ability to create/join teams on USAirsoft.com
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        Free game for every 450 points earned
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        US Airsoft Velcro Patch
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        US Airsoft Lanyard
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        US Airsoft Rank Patch
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        US Airsoft Wrist Band
                                                    </dd>
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col> */}
                            </Row>
                        </div>
                    </Fade>
                    <Fade in={this.state.showArray[1]} unmountOnExit={true}>
                        <div>
                            <Row className="justify-content-row">
                                <Col sm={4} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center new-player-card-header">NEW PLAYER PACKAGE</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$55.00</Card.Title>
                                                <dl>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Full day of Gameplay at US Airsoft
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Equipment to play with (Mask & Gun)
                                                    </dd>
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                            <Row className="first-row-card-pricing">
                                <Col sm={4} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center member-card-header">MEMBER GAMEPASS</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$30.00</Card.Title>
                                                <dl>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Full day of Gameplay at US Airsoft
                                                    </dd>
                                                    {/* <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        Equipment to play with (Mask & Gun)
                                                    </dd> */}
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={4} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center non-member-card-header">NON-MEMBER GAMEPASS</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$35.00</Card.Title>
                                                <dl>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Full day of Gameplay at US Airsoft
                                                    </dd>
                                                    {/* <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        Equipment to play with (Mask & Gun)
                                                    </dd> */}
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                            <Row className="second-row-card-pricing">
                                <Col sm={4} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center member-card-header">MEMBER PACKAGE</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$65.00</Card.Title>
                                                <dl>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Full day of Gameplay at US Airsoft
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Equipment to play with (Mask & Gun)
                                                    </dd>
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={4} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center non-member-card-header">NON-MEMBER PACKAGE</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$75.00</Card.Title>
                                                <dl>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Full day of Gameplay at US Airsoft
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Equipment to play with (Mask & Gun)
                                                    </dd>
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    </Fade>
                    <Fade in={this.state.showArray[2]} unmountOnExit={true}>
                        <div>
                            <Row>
                                <Col sm={6} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center member-card-header">MEMBER RENTAL</Card.Header>
                                        <Card.Body>
                                                <dl>
                                                    <dd>
                                                        $35.00 - Regular Rifle (w/ Mask)
                                                    </dd>
                                                    <dd>
                                                        $30.00 - Pistol (w/ Mask)
                                                    </dd>
                                                    <dd>
                                                        $45.00 - Premier Rifle (w/ Mask)
                                                    </dd>
                                                    <dd>
                                                        $55.00 - Regular Rifle and Pistol (w/ Mask)
                                                    </dd>
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={6} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center non-member-card-header">NON-MEMBER RENTAL</Card.Header>
                                        <Card.Body>
                                                <dl>
                                                    <dd>
                                                        $40.00 - Regular Rifle (w/ Mask)
                                                    </dd>
                                                    <dd>
                                                        $35.00 - Pistol (w/ Mask)
                                                    </dd>
                                                    <dd>
                                                        $50.00 - Premier Rifle (w/ Mask)
                                                    </dd>
                                                    <dd>
                                                        $60.00 - Regular Rifle and Pistol (w/ Mask)
                                                    </dd>
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                            <Row className="justify-content-row">
                                <Col sm={12} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center standard-card-header-pricing">OTHER RENTAL EQUIPMENT</Card.Header>
                                        <Card.Body className="card-body-other-pricing">
                                            <dl>
                                                <dd>
                                                    $5.00 - Extra Magazine for M4
                                                </dd>
                                                <dd>
                                                    $5.00 - Sling Rental  
                                                </dd>
                                                <dd>
                                                    $5.00 - Regular Full Face Mask
                                                </dd>
                                                <dd>
                                                    $6.00 - Extra Magazine for 1911 (EF)
                                                </dd>
                                                <dd>
                                                    $10.00 - 9.6v Battery 1600mAh
                                                </dd>
                                                <dd>
                                                    $10.00 - Dye I4 Mask
                                                </dd>
                                                <dd>
                                                    $15.00 - Dye I5 Mask
                                                </dd>
                                                <dd>
                                                    $15.00 - Vest Rental (Comes with 2 Magazines)
                                                </dd>
                                            </dl>
                                            <p className="text-align-center" style={{marginBottom: 0}}>
                                                Please contact us to further inquire about rentals.
                                            </p>
                                        </Card.Body>
                                        <Card.Footer>
                                            <Row className="justify-content-row">
                                                <Link to="/contact">
                                                    <Button variant="primary">Contact Us</Button>
                                                </Link>
                                            </Row>
                                        </Card.Footer>
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    </Fade>
                    <Fade in={this.state.showArray[3]} unmountOnExit={true}>
                        <div>
                            <Row>
                                <Col sm={4} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center member-card-header">WEEKEND PACKAGE #1</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$300.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    6 Players
                                                </dd>
                                                <dd>
                                                    6 Rentals (w/ Masks)
                                                </dd>
                                                <dd>
                                                    1x Large Pizza
                                                </dd>
                                                <dd>
                                                    1x Soda (2 Liter)
                                                </dd>
                                                <dd>
                                                    1x US Airsoft Birthday Patch 
                                                </dd>
                                                <dd>
                                                    Additional players are $50 each
                                                </dd>
                                            </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={4} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center member-card-header">WEEKEND PACKAGE #2</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$400.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    10 Players
                                                </dd>
                                                <dd>
                                                    10 Rentals (w/ Masks)
                                                </dd>
                                                <dd>
                                                    2x Large Pizza
                                                </dd>
                                                <dd>
                                                    2x Soda (2 Liter)
                                                </dd>
                                                <dd>
                                                    1x US Airsoft Birthday Patch 
                                                </dd>
                                                <dd>
                                                    Additional players are $40 each
                                                </dd>
                                            </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={4} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center member-card-header">WEEKEND PACKAGE #3</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$760.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    20 Players
                                                </dd>
                                                <dd>
                                                    20 Rentals (w/ Masks)
                                                </dd>
                                                <dd>
                                                    4x Large Pizza
                                                </dd>
                                                <dd>
                                                    4x Soda (2 Liter)
                                                </dd>
                                                <dd>
                                                    1x US Airsoft Birthday Patch 
                                                </dd>
                                                <dd>
                                                    Additional players are $38 each
                                                </dd>
                                            </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                            <Row>
                                <Col sm={4} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center weekday-card-header-pricing">WEEKDAY PACKAGE #1</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$1000.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    30 Players
                                                </dd>
                                                <dd>
                                                    No Rental Equipment Distributed
                                                </dd>
                                                <dd>
                                                    Additional players are $40 each
                                                </dd>
                                                <dd>
                                                    Game Time: 4 Hours
                                                </dd>
                                            </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={4} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center weekday-card-header-pricing">WEEKDAY PACKAGE #2</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$1200.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    20 Players
                                                </dd>
                                                <dd>
                                                    Rental Equipment Distributed
                                                </dd>
                                                <dd>
                                                    Additional players are $60 each
                                                </dd>
                                                <dd>
                                                    Game Time: 4 Hours
                                                </dd>
                                            </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={4} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center weekday-card-header-pricing">WEEKDAY PACKAGE #3</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$2200.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    40 Players
                                                </dd>
                                                <dd>
                                                    Rental Equipment Distributed
                                                </dd>
                                                <dd>
                                                    Additional players are $55 each
                                                </dd>
                                                <dd>
                                                    Game Time: 4 Hours
                                                </dd>
                                            </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                            <Row>
                                <Col sm={12} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center standard-card-header-pricing">RESERVE YOUR PARTY!</Card.Header>
                                        <Card.Body className="card-body-birthday-pricing">
                                            <div className="text-align-center">
                                                Please contact us for further questions about birthday parties, or to place a deposit down to schedule your birthday!
                                            </div>
                                        </Card.Body>
                                        <Card.Footer>
                                            <Row className="justify-content-row">
                                                <Link to="/contact">
                                                    <Button variant="primary">Contact Us</Button>
                                                </Link>
                                            </Row>
                                        </Card.Footer>
                                    </Card>
                                </Col>
                                {/* {this.state.index === 0 ?
                                <Col sm={4} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center" style={{display: 'flex'}}>
                                            <Col className="col-left-nav-button-pricing">
                                                <Button variant="secondary" type="button" disabled={this.state.index===0}
                                                className="buttons-pricing" onClick={() => {
                                                    if (this.state.index!==0)
                                                    this.setState({index: this.state.index-1})
                                                }}>
                                                <i className="fa fa-angle-left fa-1x text-black"></i>
                                                </Button>
                                            </Col>
                                            <Col md="auto" className="col-center-middle">
                                                Birthday Package #1
                                            </Col>
                                            <Col className="col-right-nav-button-pricing">
                                                <Button variant="secondary" type="button" disabled={this.state.index===3}
                                                className="buttons-pricing" onClick={() => {
                                                    if (this.state.index!==3)
                                                    this.setState({index: this.state.index+1})
                                                }}>
                                                <i className="fa fa-angle-right fa-1x text-black"></i>
                                                </Button>
                                            </Col>
                                        </Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$250.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    6 Players
                                                </dd>
                                                <dd>
                                                    6 Rentals (w/ Masks)
                                                </dd>
                                                <dd>
                                                    1x Large Pepperoni/Cheese Pizza
                                                </dd>
                                                <dd>
                                                    1x Soda (2 Liter)
                                                </dd>
                                                <dd>
                                                    1x US Airsoft Birthday Patch 
                                                </dd>
                                            </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                : null}
                                {this.state.index === 1 ?
                                <Col sm={6} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center" style={{display: 'flex'}}>
                                            <Col className="col-left-nav-button-pricing">
                                                <Button variant="secondary" type="button" disabled={this.state.index===0}
                                                className="buttons-pricing" onClick={() => {
                                                    if (this.state.index!==0)
                                                    this.setState({index: this.state.index-1})
                                                }}>
                                                <i className="fa fa-angle-left fa-1x text-black"></i>
                                                </Button>
                                            </Col>
                                            <Col md="auto" className="col-center-middle">
                                                Birthday Package #2
                                            </Col>
                                            <Col className="col-right-nav-button-pricing">
                                                <Button variant="secondary" type="button" disabled={this.state.index===3}
                                                className="buttons-pricing" onClick={() => {
                                                    if (this.state.index!==3)
                                                    this.setState({index: this.state.index+1})
                                                }}>
                                                <i className="fa fa-angle-right fa-1x text-black"></i>
                                                </Button>
                                            </Col>
                                        </Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$350.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    10 Players
                                                </dd>
                                                <dd>
                                                    10 Rentals (w/ Masks)
                                                </dd>
                                                <dd>
                                                    2x Large Pepperoni/Cheese Pizza
                                                </dd>
                                                <dd>
                                                    2x Soda (2 Liter)
                                                </dd>
                                                <dd>
                                                    1x US Airsoft Birthday Patch 
                                                </dd>
                                            </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                : null}
                                {this.state.index === 2 ?
                                <Col sm={6} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center" style={{display: 'flex'}}>
                                            <Col className="col-left-nav-button-pricing">
                                                <Button variant="secondary" type="button" disabled={this.state.index===0}
                                                className="buttons-pricing" onClick={() => {
                                                    if (this.state.index!==0)
                                                    this.setState({index: this.state.index-1})
                                                }}>
                                                <i className="fa fa-angle-left fa-1x text-black"></i>
                                                </Button>
                                            </Col>
                                            <Col md="auto" className="col-center-middle">
                                                Birthday Package #3
                                            </Col>
                                            <Col className="col-right-nav-button-pricing">
                                                <Button variant="secondary" type="button" disabled={this.state.index===3}
                                                className="buttons-pricing" onClick={() => {
                                                    if (this.state.index!==3)
                                                    this.setState({index: this.state.index+1})
                                                }}>
                                                <i className="fa fa-angle-right fa-1x text-black"></i>
                                                </Button>
                                            </Col>
                                        </Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$500.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    15 Players
                                                </dd>
                                                <dd>
                                                    15 Rentals (w/ Masks)
                                                </dd>
                                                <dd>
                                                    3x Large Pepperoni/Cheese Pizza
                                                </dd>
                                                <dd>
                                                    3x Soda (2 Liter)
                                                </dd>
                                                <dd>
                                                    1x US Airsoft Birthday Patch 
                                                </dd>
                                            </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                : null}
                                {this.state.index === 3 ?
                                <Col sm={6} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center" style={{display: 'flex'}}>
                                            <Col className="col-left-nav-button-pricing">
                                                <Button variant="secondary" type="button" disabled={this.state.index===0}
                                                className="buttons-pricing" onClick={() => {
                                                    if (this.state.index!==0)
                                                    this.setState({index: this.state.index-1})
                                                }}>
                                                <i className="fa fa-angle-left fa-1x text-black"></i>
                                                </Button>
                                            </Col>
                                            <Col md="auto" className="col-center-middle">
                                                Birthday Package #4
                                            </Col>
                                            <Col className="col-right-nav-button-pricing">
                                                <Button variant="secondary" type="button" disabled={this.state.index===3}
                                                className="buttons-pricing" onClick={() => {
                                                    if (this.state.index!==3)
                                                    this.setState({index: this.state.index+1})
                                                }}>
                                                <i className="fa fa-angle-right fa-1x text-black"></i>
                                                </Button>
                                            </Col>
                                        </Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$650.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    20 Players
                                                </dd>
                                                <dd>
                                                    20 Rentals (w/ Masks)
                                                </dd>
                                                <dd>
                                                    4x Large Pepperoni/Cheese Pizza
                                                </dd>
                                                <dd>
                                                    4x Soda (2 Liter)
                                                </dd>
                                                <dd>
                                                    1x US Airsoft Birthday Patch 
                                                </dd>
                                            </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                : null} */}
                            </Row>
                            <Row></Row>
                        </div>
                    </Fade>
                </Container>
            </div>
        );
    }
}


export default Pricing;