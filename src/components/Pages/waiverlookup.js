import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col, Breadcrumb } from 'react-bootstrap/';
import { LinkContainer } from 'react-router-bootstrap';

import * as ROLES from '../constants/roles';

class WaiverLookup extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: true,
            waivers: [],
            queriedlist: [],
            search: "",
            OpenWaiverState: this.openWaiver,
        };
    }

    componentWillUnmount() {
        //this.props.firebase.waiversList().off();
    }

    componentDidMount() {
        this.setState({ loading: true });

        this.props.firebase.waiversList().listAll().then((res) => {
            this.setState({waivers: res.items}, function() {
                this.setState({loading: false})
            })
            }).catch(function(error) {
              // Uh-oh, an error occurred!
              console.log(error)
            });
    }

    // Updates User's free game
    openWaiver = (ref) => {
        ref.getDownloadURL().then(url => {
            window.open(url)
        })
    }

    onChange = event => {
            this.setState({ search: event.target.value });
    };

    render() {
        return (
            <div className="background-static-all">
                    <Container>
                        <h2 className="admin-header">Admin - Waiver Lookup</h2>
                        <Breadcrumb className="admin-breadcrumb">
                            <LinkContainer to="/admin">
                                <Breadcrumb.Item>Admin</Breadcrumb.Item>
                            </LinkContainer>
                            <Breadcrumb.Item active>Waiver Lookup</Breadcrumb.Item>
                        </Breadcrumb>
                        <Row>
                            <Col>
                                <Card className="admin-cards">
                                    <Card.Header>
                                        <Form className="team-manage-text">
                                            <Form.Group controlId="input1">
                                                <Form.Label className="search-label-admin">Search by Name:</Form.Label>
                                                <Form.Control
                                                    type="name"
                                                    placeholder="ex: JohnDoe"
                                                    value={this.state.search}
                                                    onChange={(e) => {
                                                        this.onChange(e);
                                                    }}
                                                />
                                            </Form.Group>
                                        </Form>
                                    </Card.Header>
                                    <WaiverBox waivers={this.state.waivers} index={0}
                                        search={this.state.search} open={this.state.OpenWaiverState} />
                                </Card>
                            </Col>
                        </Row>
                    </Container>
            </div>
        );
    }
}

function convertDate(date) {
    // Making date variables in correct format
    date = date.split('-');
    let temp = date[2].split(':')
    date.splice(2, 1)
    date = date.concat(temp)

    // Now to changing them to date objects
    return new Date(date[2], date[0]-1, date[1], date[3], date[4], date[5], date[6])
}

function WaiverBox ({waivers, index, search, open, loading}) {
    var tempWaivers = [];
    for (let i=0; i<waivers.length; i++) {
        let waiver_obj = waivers[i].name
        tempWaivers.push(convertDate(waiver_obj.substr(waiver_obj.lastIndexOf('(') + 1).split(')')[0]))
    }
    return (
    <Card.Body className="status-card-body-fg-admin">
        {!loading ? 
        <Row className="card-header-wl">
            <Col>
                <Card.Text>
                    Name:
                </Card.Text>
            </Col>
            <Col>
                <Card.Text>
                    Date Created:
                </Card.Text>
            </Col>
        </Row>
        : null}
        {!loading ?
        tempWaivers.sort((a, b) => 
        (b - a))
        .map((waiver, i) => (
            search !== "" ? // Search query case
                waivers[i].name.toLowerCase().includes(search.toLowerCase()) ? 
                        index++ % 2 === 0 ? 
                        <Row className={index === 1 ? "row-1-wl" : "row-fg"} key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                    {"(" + index + ") " + waivers[i].name.substr(0, waivers[i].name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {waiver.toUTCString().slice(0, -4)}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waivers[i])}
                                        type="submit" id="update" variant="success">
                                            Open
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                            : 
                        <Row className="status-card-offrow-admin-fg" key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                    {"(" + index + ") " + waivers[i].name.substr(0, waivers[i].name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {waiver.toUTCString().slice(0, -4)}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waivers[i])}
                                        type="submit" id="update" variant="success">
                                            Open
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                : ""
            :
                        index++ % 2 === 0 ? 
                        <Row className={index === 1 ? "row-1-wl" : "row-fg"} key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                    {"(" + index + ") " + waivers[i].name.substr(0, waivers[i].name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {waiver.toUTCString().slice(0, -4)}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waivers[i])}
                                        type="submit" id="update" variant="success">
                                            Open 
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                            : 
                        <Row className="status-card-offrow-admin-fg" key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                    {"(" + index + ") " + waivers[i].name.substr(0, waivers[i].name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {waiver.toUTCString().slice(0, -4)}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waivers[i])}
                                        type="submit" id="update" variant="success">
                                            Open 
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
        ))
        : <h2 className="pagePlaceholder">Loading...</h2> }
    </Card.Body>
    )
};

const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];

export default compose(
    withAuthorization(condition),
    withFirebase,
)(WaiverLookup);