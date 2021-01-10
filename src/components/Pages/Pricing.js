import React, { Component } from 'react';
import '../../App.css';
import { Container, Row, Col, Card, Button, Fade } from 'react-bootstrap/';
import { Link } from 'react-router-dom';
import GradientButton from '../constants/gradientbutton';

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
                <h2 className="page-header">{this.state.title}</h2>
                <Container>
                    <Row className="justify-content-row">
                        <GradientButton color={this.state.showArray[0] ? "silver-black" : "black-silver"}
                        onClick={() => {
                            let showArray = this.state.showArray;
                            showArray.fill(false)
                            showArray[0] = true;
                            this.setState({showArray, title: "Membership Pricing"})
                        }}>Membership</GradientButton>
                        <GradientButton color={this.state.showArray[1] ? "silver-black" : "black-silver"}
                        onClick={() => {
                            let showArray = this.state.showArray;
                            showArray.fill(false)
                            showArray[1] = true;
                            this.setState({showArray, title: "Gameplay Pricing"})
                        }}>Gameplay</GradientButton>
                        <GradientButton color={this.state.showArray[2] ? "silver-black" : "black-silver"}
                        onClick={() => {
                            let showArray = this.state.showArray;
                            showArray.fill(false)
                            showArray[2] = true;
                            this.setState({showArray, title: "Rental Pricing"})
                        }}>Rental</GradientButton>
                        <GradientButton color={this.state.showArray[3] ? "silver-black" : "black-silver"}
                        onClick={() => {
                            let showArray = this.state.showArray;
                            showArray.fill(false)
                            showArray[3] = true;
                            this.setState({showArray, title: "Birthday Pricing"})
                        }}>Birthday</GradientButton>
                    </Row>
                    <Fade in={this.state.showArray[0]} unmountOnExit={true}>
                        <div>
                            <Row>
                                <Col sm={6} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center">New Membership</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$40.00</Card.Title>
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
                                                        Your own personal account at USAirsoft.com 
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Ability to create/join teams on USAirsoft.com 
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Free game for every 450 points earned
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        US Airsoft Velcro Patch
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        US Airsoft Lanyard
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        US Airsoft Rank Patch
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        US Airsoft Wrist Band
                                                    </dd>
                                                </dl>
                                                <p className="text-align-center">
                                                    *$30 annually after the initial $40.
                                                </p>
                                                <p className="text-align-center">
                                                    Please contact us to further inquire about signing up for a membership.
                                                </p>
                                            <Row className="justify-content-row">
                                                <Link to="/contact">
                                                    <Button variant="primary">Contact Us</Button>
                                                </Link>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={6} className="col-pricing">
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
                                </Col>
                            </Row>
                        </div>
                    </Fade>
                    <Fade in={this.state.showArray[1]} unmountOnExit={true}>
                        <div>
                            <Row>
                                <Col sm={6} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center">Member Gameplay</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$25.00</Card.Title>
                                                <dl>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Full day of Gameplay at US Airsoft
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        Equipment to play with
                                                    </dd>
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={6} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center">Non-Member Gameplay</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$30.00</Card.Title>
                                                <dl>
                                                    <dd>
                                                        <i className="fa fa-check fa-1x text-green dd-text-pricing"></i>
                                                        Full day of Gameplay at US Airsoft
                                                    </dd>
                                                    <dd>
                                                        <i className="fa fa-times fa-1x text-red dd-text-pricing"></i>
                                                        Equipment to play with
                                                    </dd>
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                            <Row>
                                <Col sm={6} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center">Member Combopack</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$55.00 - $65.00</Card.Title>
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
                                <Col sm={6} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center">Non-Member Combopack</Card.Header>
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
                            </Row>
                        </div>
                    </Fade>
                    <Fade in={this.state.showArray[2]} unmountOnExit={true}>
                        <div>
                            <Row>
                                <Col sm={6} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center">Member Rental</Card.Header>
                                        <Card.Body>
                                                <dl>
                                                    <dd>
                                                        $30.00 - Regular Rifle (w/ Mask)
                                                    </dd>
                                                    <dd>
                                                        $30.00 - Pistol (w/ Mask)
                                                    </dd>
                                                    <dd>
                                                        $40.00 - Premier Rifle (w/ Mask)
                                                    </dd>
                                                    <dd>
                                                        $50.00 - Regular Rifle and Pistol (w/ Mask)
                                                    </dd>
                                                </dl>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col sm={6} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center">Non-Member Rentals</Card.Header>
                                        <Card.Body>
                                                <dl>
                                                    <dd>
                                                        $35.00 - Regular Rifle (w/ Mask)
                                                    </dd>
                                                    <dd>
                                                        $35.00 - Pistol (w/ Mask)
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
                            </Row>
                            <Row className="justify-content-row">
                                <Col sm={12} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center">Other Rental Equipment</Card.Header>
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
                                            <p className="text-align-center">
                                                Please contact us to further inquire about rentals.
                                            </p>
                                            <Row className="justify-content-row">
                                                <Link to="/contact">
                                                    <Button variant="primary">Contact Us</Button>
                                                </Link>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    </Fade>
                    <Fade in={this.state.showArray[3]} unmountOnExit={true}>
                        <div>
                            <Row>
                                <Col sm={6} className="col-pricing">
                                    <Card className="card-pricing">
                                        <Card.Header className="text-align-center">Birthday Package Notice</Card.Header>
                                        <Card.Body>
                                            <p className="text-align-center">
                                                Please contact us for further questions about birthday parties, or to place a deposit down to schedule your birthday!
                                            </p>
                                            <Row className="justify-content-row">
                                                <Link to="/contact">
                                                    <Button variant="primary">Contact Us</Button>
                                                </Link>
                                            </Row>
                                        </Card.Body>
                                            <p className="text-align-center no-margin-bottom">Scroll through packages</p>
                                            <Row className="justify-content-row row-buttons-pricing">
                                                <Button variant="secondary" type="button" disabled={this.state.index===0}
                                                className="buttons-pricing" onClick={() => {
                                                    if (this.state.index!==0)
                                                    this.setState({index: this.state.index-1})
                                                }}>
                                                <i className="fa fa-angle-left fa-1x text-black"></i>
                                                </Button>
                                                <Button variant="secondary" type="button" disabled={this.state.index===3}
                                                className="buttons-pricing" onClick={() => {
                                                    if (this.state.index!==3)
                                                    this.setState({index: this.state.index+1})
                                                }}>
                                                <i className="fa fa-angle-right fa-1x text-black"></i>
                                                </Button>
                                            </Row>
                                    </Card>
                                </Col>
                                {this.state.index === 0 ?
                                <Col sm={6} className="col-pricing">
                                    <Card>
                                        <Card.Header className="text-align-center">Birthday Package #1</Card.Header>
                                        <Card.Body>
                                            <Card.Title className="text-align-center">$250.00</Card.Title>
                                            <dl>
                                                <dd>
                                                    6 Players
                                                </dd>
                                                <dd>
                                                    10 Rentals (w/ Masks)
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
                                        <Card.Header className="text-align-center">Birthday Package #2</Card.Header>
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
                                        <Card.Header className="text-align-center">Birthday Package #3</Card.Header>
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
                                        <Card.Header className="text-align-center">Birthday Package #4</Card.Header>
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
                                : null}
                            </Row>
                        </div>
                    </Fade>
                </Container>
            </div>
        );
    }
}


export default Pricing;