import React, { Component, useState } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Container, Row, Col, Form, Button, Breadcrumb, Card } from 'react-bootstrap/';

import { Link } from 'react-router-dom';

import * as ROLES from '../constants/roles';
 
class AdminPage extends Component {
  constructor(props) {
    super(props);
 
    this.state = {
        loading: false,
        emailBox: '',
        emailSubject: '',
        users: [],
        search: "",
        UpdateUserState: this.updateUser,
      };
    }

    componentDidMount() {
        this.setState({ loading: true });

        this.props.firebase.users().on('value', snapshot => {
            const usersObject = snapshot.val()

            const usersList = Object.keys(usersObject).map(key => ({
                ...usersObject[key],
                uid: key,
            }));

            this.setState({
                users: usersList,
                loading: false,
            });
        });
    }
   
    componentWillUnmount() {
        this.props.firebase.users().off();
    }

    // Updates User's privilege level
    updateUser = (user, choice) => {
      if (choice === "admin" || choice === "waiver" || choice === "clear" || choice === "check") {
        const upgrade = this.props.firebase.createPrivilegedUser();
        upgrade({uid: user, privilege: choice
        }).then((result) => {
            //If complete finish loading
            if (result) console.log(result.data.status)
        }).catch((error) =>{
            console.log("error: " + error)
        });
      }
    }

    changeEmailBox = event => {
        this.setState({ emailBox: event.target.value });
    };

    changeEmailSubject = event => {
        this.setState({ emailSubject: event.target.value });
    };

    emailAll = () => {
        // Add verification check before emailing
        // Grab users from users api call
        // Verify legal requirements when it comes to emailing
        // Add in opt out feature in backend
        var sendMail = this.props.firebase.sendMail();
        const {emailBox, emailSubject} = this.state;
        sendMail({email: "kyle77r@gmail.com", body: emailBox, subject: emailSubject, img: null}).then((result) => {
          if (result.data) console.log(result.data.status)
        }).catch((error) => {
          console.log(error)
        })
        // Add loading to show completion
    }

    onChange = event => {
            this.setState({ search: event.target.value });
    };

    render() {
        const { loading } = this.state;
     
        return (
          <div className="background-static-all">
            <Container>
                <h1 className="admin-header">Admin Dashboard</h1>
                <Breadcrumb className="admin-breadcrumb">
                  <Breadcrumb.Item active>Admin</Breadcrumb.Item>
                </Breadcrumb>
                <Row>
                  <Col className="admin-col-cards">
                    <Link to={"/enterwins"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Enter Wins</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                  <Col className="admin-col-cards">
                    <Link to={"/enterlosses"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Enter Losses</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                  <Col className="admin-col-cards">
                    <Link to={"/freegames"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Check Free Games</Card.Body>
                        <Card.Footer>
                          <Row>
                          <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                </Row>
                <Row className="admin-row-email">
                  <Col sm={8}>
                    <Card className="admin-cards">
                      <Card.Header>
                        <Row>
                          <Col xs="auto">
                            <Card.Text className="admin-card-icon2">
                                <i className="fa fa-address-card fa-1x text-white"></i>
                            </Card.Text>
                          </Col>
                          <Col>
                            Email Users
                          </Col>
                        </Row>
                      </Card.Header>
                      <Card.Body>
                        <Form>
                          <Form.Group controlId="exampleForm.ControlTextarea1">
                            <Form.Label>Add Subject Here:</Form.Label>
                                <Form.Control
                                    as="textarea" rows="1"
                                    placeholder="Email subject"
                                    value={this.state.emailSubject}
                                    onChange={(e) => {
                                        this.changeEmailSubject(e);
                                    }}
                                />
                            </Form.Group>
                          <Form.Group controlId="exampleForm.ControlTextarea1">
                            <Form.Label>Add Body Here:</Form.Label>
                                <Form.Control
                                    as="textarea" rows="8"
                                    placeholder="Email body"
                                    value={this.state.emailBox}
                                    onChange={(e) => {
                                        this.changeEmailBox(e);
                                    }}
                                />
                            </Form.Group>
                                <Button className="admin-button-email1" variant="info" type="button"
                                onClick={() => {
                                  this.emailAll();
                                }}
                                >
                                    Email All
                                </Button>
                                <Button className="admin-button-email2" variant="info" type="button"
                                >
                                    Email Members
                                </Button>
                                <Button className="admin-button-email3" variant="info" type="button"
                                >
                                    Email Non-Members
                                </Button>
                        </Form>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col sm={4}>
                    <Card className="admin-cards">
                      <Card.Header>
                        <Row>
                          <Col xs="auto">
                            <Card.Text className="admin-card-icon2">
                                <i className="fa fa-users fa-1x text-white"></i>
                            </Card.Text>
                          </Col>
                          <Col>
                            Users List
                          </Col>
                        </Row>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col>
                            <Form className="team-manage-text">
                                <Form.Group controlId="input1">
                                    <Form.Label className="search-label-admin">Search by Username:</Form.Label>
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
                          </Col>
                        </Row>
                        <Row>
                          {loading ? <p>Loading</p> : 
                            <UserBox users={this.state.users} index={0} length={this.state.users.length}
                            search={this.state.search} update={this.state.UpdateUserState} />
                          }
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                <Row className="admin-row-email">
                  <Col className="admin-col-cards">
                    <Link to={"/signup"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Membership Registration</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                  <Col className="admin-col-cards">
                    <Link to={"/waiverform"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Sign Waiver</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                  <Col className="admin-col-cards">
                    <Link to={"/waiverlookup"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Waiver Search</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                  <Col className="admin-col-cards">
                    <Link to={"/migration"} className="admin-cards-link">
                      <Card className="admin-cards">
                        <Card.Body className="admin-card-header-link">Migration Page</Card.Body>
                        <Card.Footer>
                          <Row>
                            <Col xs="auto">
                              <Card.Text className="admin-card-footer">View</Card.Text>
                            </Col>
                            <Col>
                              <Card.Text className="admin-card-icon">
                                <i className="fa fa-angle-double-right fa-1x text-white"></i>
                              </Card.Text>
                            </Col>
                          </Row>
                        </Card.Footer>
                      </Card>
                    </Link>
                  </Col>
                </Row>
        
                {loading && <div>Loading ...</div>}
            </Container>
          </div>
        );
      }
    }
    

function UserBox({users, index, search, update, length}) {
    const [ButtonArray, setButtonArray] = useState( new Array(length).fill(false));

    return (
        <Card.Body className="status-card-body-fg-admin">
            {users.map((user, i) => (
                search !== "" ? // Search query case
                    user.name.toLowerCase().includes(search.toLowerCase()) ? 
                        index++ % 2 === 0 ? 
                            <div key={i}>
                              <div className="row-fg" id="options-buttons-admin" onClick={() => {
                                let tempArray = [...ButtonArray];
                                if (tempArray[i] !== true)
                                  tempArray.fill(false)
                                tempArray[i] = !tempArray[i]
                                setButtonArray(tempArray)
                              }}>
                                  <Row>
                                    <Col className="col-name-ul">
                                            {"(" + index + ") " + user.name}
                                    </Col>
                                    <Col className="col-name-ul">
                                        {user.email}
                                    </Col>
                                  </Row>
                                </div>
                                  {ButtonArray[i] === true ? 
                                    <Row className="row-options-admin">
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin"
                                          type="button" id="update" variant="info" onClick={() => {
                                            update(user.uid, "admin")
                                          }}>
                                              Admin 
                                          </Button>
                                      </Col>
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin" onClick={() => {
                                            update(user.uid, "waiver")
                                          }}
                                          type="button" id="update" variant="info">
                                              Waiver 
                                          </Button>
                                      </Col>
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin" onClick={() => {
                                            update(user.uid, "clear")
                                          }}
                                          type="button" id="update" variant="danger">
                                              Clear
                                          </Button>
                                      </Col>
                                      <Col>
                                        <Button className="button-options-style-admin" onClick={() => {
                                            let tempArray = [...ButtonArray];
                                            tempArray[i] = false;
                                            setButtonArray(tempArray)
                                        }}
                                        type="button" id="update" variant="danger">
                                            Cancel <i className="fa fa-times fa-1x text-white"></i>
                                        </Button>
                                      </Col>
                                    </Row>
                                  : ""
                                  }
                            </div>
                                : 
                            <div key={i}>
                              <div className="user-card-offrow-admin-fg" id="options-buttons-admin" onClick={() => {
                                let tempArray = [...ButtonArray];
                                if (tempArray[i] !== true)
                                  tempArray.fill(false)
                                tempArray[i] = !tempArray[i]
                                setButtonArray(tempArray)
                              }}>
                                    <Row>
                                      <Col className="col-name-ul">
                                              {"(" + index + ") " + user.name}
                                      </Col>
                                    </Row>
                                    <Row>
                                      <Col className="col-name-ul">
                                          {user.email}
                                      </Col>
                                  </Row>
                                </div>
                                  {ButtonArray[i] === true ? 
                                    <Row className="row-options-admin">
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin"
                                          type="button" id="update" variant="info" onClick={() => {
                                            update(user.uid, "admin")
                                          }}>
                                              Admin 
                                          </Button>
                                      </Col>
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin" onClick={() => {
                                            update(user.uid, "waiver")
                                          }}
                                          type="button" id="update" variant="info">
                                              Waiver 
                                          </Button>
                                      </Col>
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin" onClick={() => {
                                            update(user.uid, "clear")
                                          }}
                                          type="button" id="update" variant="danger">
                                              Clear
                                          </Button>
                                      </Col>
                                      <Col>
                                        <Button className="button-options-style-admin" onClick={() => {
                                            let tempArray = [...ButtonArray];
                                            tempArray[i] = false;
                                            setButtonArray(tempArray)
                                        }}
                                        type="button" id="update" variant="danger">
                                            Cancel <i className="fa fa-times fa-1x text-white"></i>
                                        </Button>
                                      </Col>
                                    </Row>
                                  : ""
                                  }
                            </div>
                    : ""
                :
                        index++ % 2 === 0 ? 
                            <div key={i}>
                              <div className="row-fg" id="options-buttons-admin" onClick={() => {
                                let tempArray = [...ButtonArray];
                                if (tempArray[i] !== true)
                                  tempArray.fill(false)
                                tempArray[i] = !tempArray[i]
                                setButtonArray(tempArray)
                              }}>
                                  <Row>
                                    <Col className="col-name-ul">
                                            {"(" + index + ") " + user.name}
                                    </Col>
                                    <Col className="col-name-ul">
                                        {user.email}
                                    </Col>
                                  </Row>
                                </div>
                                  {ButtonArray[i] === true ? 
                                    <Row className="row-options-admin">
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin"
                                          type="button" id="update" variant="info" onClick={() => {
                                            update(user.uid, "admin")
                                          }}>
                                              Admin 
                                          </Button>
                                      </Col>
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin" onClick={() => {
                                            update(user.uid, "waiver")
                                          }}
                                          type="button" id="update" variant="info">
                                              Waiver 
                                          </Button>
                                      </Col>
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin" onClick={() => {
                                            update(user.uid, "clear")
                                          }}
                                          type="button" id="update" variant="danger">
                                              Clear
                                          </Button>
                                      </Col>
                                      <Col>
                                        <Button className="button-options-style-admin" onClick={() => {
                                            let tempArray = [...ButtonArray];
                                            tempArray[i] = false;
                                            setButtonArray(tempArray)
                                        }}
                                        type="button" id="update" variant="danger">
                                            Cancel <i className="fa fa-times fa-1x text-white"></i>
                                        </Button>
                                      </Col>
                                    </Row>
                                  : ""
                                  }
                            </div>
                            : 
                            <div key={i}>
                              <div className="user-card-offrow-admin-fg" id="options-buttons-admin" onClick={() => {
                                let tempArray = [...ButtonArray];
                                if (tempArray[i] !== true)
                                  tempArray.fill(false)
                                tempArray[i] = !tempArray[i]
                                setButtonArray(tempArray)
                              }}>
                                    <Row>
                                      <Col className="col-name-ul">
                                              {"(" + index + ") " + user.name}
                                      </Col>
                                    </Row>
                                    <Row>
                                      <Col className="col-name-ul">
                                          {user.email}
                                      </Col>
                                  </Row>
                                </div>
                                  {ButtonArray[i] === true ? 
                                    <Row className="row-options-admin">
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin"
                                          type="button" id="update" variant="info" onClick={() => {
                                            update(user.uid, "admin")
                                          }}>
                                              Admin 
                                          </Button>
                                      </Col>
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin" onClick={() => {
                                            update(user.uid, "waiver")
                                          }}
                                          type="button" id="update" variant="info">
                                              Waiver 
                                          </Button>
                                      </Col>
                                      <Col md="auto" className="button-options-col-admin">
                                          <Button className="button-options-style-admin" onClick={() => {
                                            update(user.uid, "clear")
                                          }}
                                          type="button" id="update" variant="danger">
                                              Clear
                                          </Button>
                                      </Col>
                                      <Col>
                                        <Button className="button-options-style-admin" onClick={() => {
                                            let tempArray = [...ButtonArray];
                                            tempArray[i] = false;
                                            setButtonArray(tempArray)
                                        }}
                                        type="button" id="update" variant="danger">
                                            Cancel <i className="fa fa-times fa-1x text-white"></i>
                                        </Button>
                                      </Col>
                                    </Row>
                                  : ""
                                  }
                            </div>
            ))}
        </Card.Body>
    )
};


const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];
 
export default compose(
    withAuthorization(condition),
    withFirebase,
    )(AdminPage);