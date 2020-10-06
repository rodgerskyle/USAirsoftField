import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button, Form, Container, Card, Row, Col } from 'react-bootstrap/';

import * as ROLES from '../constants/roles';

class WaiverLookup extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: false,
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
            this.setState({waivers: res.items, loading: false})
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
                <h2 className="page-header">Admin - Waiver Lookup</h2>
                {!this.state.loading ?
                    <Container>
                        <Row>
                            <Col>
                                <Card>
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
                    : <h2 className="pagePlaceholder">Loading...</h2>}
            </div>
        );
    }
}


const WaiverBox = ({waivers, index, search, open}) => (
    <Card.Body className="status-card-body-admin">
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
        {waivers.sort((a, b) => 
        (a.name.substr(a.name.lastIndexOf('(') + 1).split(')')[0] < 
        b.name.substr(b.name.lastIndexOf('(') + 1).split(')')[0] ? 1 : -1))
        .map((waiver, i) => (
            search !== "" ? // Search query case
                waiver.name.toLowerCase().includes(search.toLowerCase()) ? 
                        index++ % 2 === 0 ? 
                        <Row className={index === 1 ? "row-1-wl" : "row-fg"} key={index}>
                            <Col className="col-name-fg">
                                <Card.Text>
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {waiver.name.substr(waiver.name.lastIndexOf('(') + 1).split(')')[0]}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waiver)}
                                        type="submit" id="update" variant="outline-success">
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
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {waiver.name.substr(waiver.name.lastIndexOf('(') + 1).split(')')[0]}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waiver)}
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
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {waiver.name.substr(waiver.name.lastIndexOf('(') + 1).split(')')[0]}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waiver)}
                                        type="submit" id="update" variant="outline-success">
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
                                    {"(" + index + ") " + waiver.name.substr(0, waiver.name.lastIndexOf('('))}
                                </Card.Text>
                            </Col>
                            <Col>
                                <Row>
                                    <Col className="col-name-fg">
                                        {waiver.name.substr(waiver.name.lastIndexOf('(') + 1).split(')')[0]}
                                    </Col>
                                    <Col>
                                        <Button className="button-submit-admin2" onClick={() => open(waiver)}
                                        type="submit" id="update" variant="success">
                                            Open 
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
        ))}
    </Card.Body>
);

const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];

export default compose(
    withAuthorization(condition),
    withFirebase,
)(WaiverLookup);