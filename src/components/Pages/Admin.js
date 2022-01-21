import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Container, Row, Col, Form, Card, Spinner } from 'react-bootstrap/';

import { Link } from 'react-router-dom';

import * as ROLES from '../constants/roles';

import { Helmet } from 'react-helmet-async';
import AdminDrawer from '../constants/admindrawer';
import UserTable from '../constants/usertable';
 
class AdminPage extends Component {
  constructor(props) {
    super(props);
 
    this.state = {
        loading: false,
        emailBox: '',
        emailSubject: '',
        emailImg: null,
        users: [],
        usersSearchList: [],
        search: "",
        ul_status: null,
        ul_error: null,
        email_status: null,
        email_loading: null,
        rows: 8,
        email_ready: false,
      };
    }
    imgRef = React.createRef();

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
                usersSearchList: usersList,
                loading: false,
            });
        });
    }

    componentDidUpdate() {
    }
   
    componentWillUnmount() {
        this.props.firebase.users().off();
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
        // this.setState({email_loading: 0, email_status: null})
        // var sendMail = this.props.firebase.sendMail();
        // const {emailBox, emailSubject, emailImg} = this.state;
       /* for (let i=0; i<length; i++) {
          this.setState({email_loading: i/length})
        } */
        /*
        this.props.firebase.emails().once('value', (obj) => {
          //console.log(obj.val())
          //console.log(obj.val().key())
          const emailsObject = obj.val();

          let emails2 = Object.keys(emailsObject).map(key => ({
              ...emailsObject[key],
              email: key,
          }));
          let emails = []
          emails.push({secret: "working", email: "kyle77r@gmail%2Ecom"})
          console.log(emails)
          sendMail({emails, body: emailBox, subject: emailSubject, img: emailImg, migrate: false}).then((result) => {
            if (result.data) console.log(result.data.status)
          }).catch((error) => {
            console.log(error)
          })
        }) */
        //After for loop update status
        /*sendMail({emails, body: emailBox, subject: emailSubject, img: emailImg, secret: "empty", migrate: false}).then((result) => {
          if (result.data) console.log(result.data.status)
        }).catch((error) => {
          console.log(error)
        }) */
        // Add loading to show completion
        this.setState({
          email_loading: null, 
          email_status: "Completed email.",
          emailBox: "",
          emailSubject: "",
          emailImg: null,
          rows: 8,
        }, function() {
          setTimeout(() => {
            this.setState({email_status: ""});
          }, 5000)
        })
    }

    // Email members
    emailMembers = () => {
    }

    onChange = event => {
      this.setState({ search: event.target.value });
      const search = event.target.value
      let newUsersList = this.state.users
      let checker = (arr, target) => target.every(v => arr.includes(v));

      let newUsers = newUsersList.filter(user => 
        checker(user.name.toLowerCase().split(" "), search.toLowerCase().split(" ")) ||
        user.username.toLowerCase().includes(search.toLowerCase()) || 
        user.email.toLowerCase().includes(search.toLowerCase()) || 
        user.name.toLowerCase().includes(search.toLowerCase()))
      this.setState({usersSearchList: newUsers})
    };

    // Checks dimensions of uploaded image
    checkDimensions = () => {
        var height = this.imgRef.current.height;
        this.setState({rows: Math.ceil(height/17.6)})
    }

    handleUpload = e => {
        if (e.target.files[0]) {
            const image = e.target.files[0];
            const uploadTask = this.props.firebase.emailAttachment().put(image);
            uploadTask.on(
                "state_changed",
                snapshot => {
                    // progress function ...
                    const progress = Math.round(
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    );
                    this.setState({ progress });
                },
                error => {
                    // Error function ...
                    console.log(error);
                },
                () => {
                    // complete function ...
                    this.props.firebase
                        .emailAttachment()
                        .getDownloadURL()
                        .then(url => {
                            this.setState({ emailImg: url });
                        });
                }
            );
        }
    };

    render() {
        const { loading } = this.state;
     
        return (
          <div className="div-parent-admin">
            <Helmet>
              <title>US Airsoft Field: Administrator</title>
            </Helmet>
            {/* Pass a prop for a tab number so that we can choose which to render here and pass function to setState of that prop 
              Actually: Use words from url to decide which thing to display
            */}
            <AdminDrawer component={
              <div className="background-static-all background-static-admin">
                <Container>
                    {/* <h1 className="admin-header">Admin Dashboard</h1>
                    <Breadcrumb className="admin-breadcrumb">
                      <Breadcrumb.Item active>Admin</Breadcrumb.Item>
                    </Breadcrumb> */}
                    <Row>
                      <Col className="admin-col-cards">
                        <Link to={"/admin/enterwins"} className="admin-cards-link">
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
                        <Link to={"/admin/enterlosses"} className="admin-cards-link">
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
                        <Link to={"/admin/freegames"} className="admin-cards-link">
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
                      <Col className="admin-col-cards">
                        <Link to={"/admin/signup"} className="admin-cards-link">
                          <Card className="admin-cards">
                            <Card.Body className="admin-card-header-link">New Member</Card.Body>
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
                        <Link to={"/admin/renewal"} className="admin-cards-link">
                          <Card className="admin-cards">
                            <Card.Body className="admin-card-header-link">Renew Member</Card.Body>
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
                      <Col sm={12} className="admin-col-cards">
                        <Card className="admin-cards">
                          <Card.Header className="admin-card-header-link">
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
                                <Form className="team-manage-text" onSubmit={e => { e.preventDefault(); }}>
                                    <Form.Group controlId="user-search">
                                        <Form.Label className="search-label-admin">Search by Username:</Form.Label>
                                        <Form.Control
                                            type="name"
                                            placeholder="ex: JohnDoe"
                                            value={this.state.search}
                                            autoComplete="off"
                                            onChange={(e) => {
                                                this.onChange(e);
                                            }}
                                        />
                                    </Form.Group>
                                </Form>
                              </Col>
                            </Row>
                            {/* {this.state.ul_status ? <p className="status-ul-admin">{this.state.ul_status}</p> : ""}
                            {this.state.ul_error ? <p className="error-ul-admin">{this.state.ul_error}</p> : ""} */}
                            <Row className="justify-content-row">
                              {loading ? <Spinner animation="border" /> : 
                                <UserTable users={this.state.usersSearchList} index={0} length={this.state.usersSearchList.length}
                                search={this.state.search} />
                              }
                            </Row>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                    <Row className="admin-row-email">
                      <Col className="admin-col-cards">
                        <Link to={"/admin/birthday"} className="admin-cards-link">
                          <Card className="admin-cards">
                            <Card.Body className="admin-card-header-link">Calendar</Card.Body>
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
                        <Link to={"/admin/waiverform"} className="admin-cards-link">
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
                        <Link to={"/admin/scanwaiver"} className="admin-cards-link">
                          <Card className="admin-cards">
                            <Card.Body className="admin-card-header-link">Scan Waiver</Card.Body>
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
                        <Link to={"/admin/waiverlookup"} className="admin-cards-link">
                          <Card className="admin-cards">
                            <Card.Body className="admin-card-header-link">Search Waiver</Card.Body>
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
                        <Link to={"/admin/rentalform"} className="admin-cards-link">
                          <Card className="admin-cards">
                            <Card.Body className="admin-card-header-link">Rental Form</Card.Body>
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
                </Container>
              </div>
            }>
            </AdminDrawer>
          </div>
        );
      }
    }
    

// function UserBox({users, index, search, length}) {
//     const [ButtonArray, setButtonArray] = useState( new Array(length).fill(false));
//     let checker = (arr, target) => target.every(v => arr.includes(v));

//     return (
//         <Card.Body className="status-card-body-main-admin">
//             {users.map((user, i) => (
//                 search !== "" ? // Search query case
//                     checker(user.name.toLowerCase().split(" "), search.toLowerCase().split(" ")) ||
//                     user.username.toLowerCase().includes(search.toLowerCase()) || 
//                     user.email.toLowerCase().includes(search.toLowerCase()) || 
//                     user.name.toLowerCase().includes(search.toLowerCase()) ? 
//                         index++ % 2 === 0 ? 
//                             <div key={i}>
//                               <div id="options-buttons-admin" onClick={() => {
//                                 let tempArray = [...ButtonArray];
//                                 if (tempArray[i] !== true)
//                                   tempArray.fill(false)
//                                 tempArray[i] = !tempArray[i]
//                                 setButtonArray(tempArray)
//                               }}>
//                                   <Row className={ButtonArray[i] ? "row-users-card-active-admin" :
//                                     "row-users-card-admin"}>
//                                     <Col className="col-name-ul">
//                                             {"(" + index + ") " + user.name}
//                                     </Col>
//                                     <Col className="col-name-ul">
//                                         {user.email}
//                                     </Col>
//                                   </Row>
//                                 </div>
//                                   <Collapse in={ButtonArray[i]}>
//                                     <Row className="row-options-admin">
//                                       <Col md="auto" className="button-options-col-admin">
//                                           <Link to={"admin/useroptions/" + user.uid}>
//                                             <Button className="button-options-style-admin"
//                                             type="button" id="update" variant="info">
//                                               Options
//                                             </Button>
//                                           </Link>
//                                       </Col>
//                                       <Col>
//                                         <Button className="button-options-style-admin" onClick={() => {
//                                             let tempArray = [...ButtonArray];
//                                             tempArray[i] = false;
//                                             setButtonArray(tempArray)
//                                         }}
//                                         type="button" id="update" variant="danger">
//                                             <i className="fa fa-times fa-1x text-white"></i>
//                                         </Button>
//                                       </Col>
//                                     </Row>
//                                   </Collapse>
//                             </div>
//                                 : 
//                             <div key={i}>
//                               <div id="options-buttons-admin" onClick={() => {
//                                 let tempArray = [...ButtonArray];
//                                 if (tempArray[i] !== true)
//                                   tempArray.fill(false)
//                                 tempArray[i] = !tempArray[i]
//                                 setButtonArray(tempArray)
//                               }}>
//                                     <Row className={ButtonArray[i] ? 
//                                       "row-users-card-offrow-active-admin" : "row-users-card-offrow-admin"}>
//                                       <Col className="col-name-ul">
//                                               {"(" + index + ") " + user.name}
//                                       </Col>
//                                       <Col className="col-name-ul">
//                                           {user.email}
//                                       </Col>
//                                   </Row>
//                                 </div>
//                                   <Collapse in={ButtonArray[i]}>
//                                     <Row className="row-options-admin">
//                                       <Col md="auto" className="button-options-col-admin">
//                                           <Link to={"admin/useroptions/" + user.uid}>
//                                             <Button className="button-options-style-admin"
//                                             type="button" id="update" variant="info">
//                                               Options
//                                             </Button>
//                                           </Link>
//                                       </Col>
//                                       <Col>
//                                         <Button className="button-options-style-admin" onClick={() => {
//                                             let tempArray = [...ButtonArray];
//                                             tempArray[i] = false;
//                                             setButtonArray(tempArray)
//                                         }}
//                                         type="button" id="update" variant="danger">
//                                             <i className="fa fa-times fa-1x text-white"></i>
//                                         </Button>
//                                       </Col>
//                                     </Row>
//                                   </Collapse>
//                             </div>
//                     : ""
//                 :
//                         index++ % 2 === 0 ? 
//                             <div key={i}>
//                               <div id="options-buttons-admin" onClick={() => {
//                                 let tempArray = [...ButtonArray];
//                                 if (tempArray[i] !== true)
//                                   tempArray.fill(false)
//                                 tempArray[i] = !tempArray[i]
//                                 setButtonArray(tempArray)
//                               }}>
//                                   <Row className={ButtonArray[i] ? "row-users-card-active-admin" :
//                                     "row-users-card-admin"}>
//                                     <Col className="col-name-ul">
//                                             {"(" + index + ") " + user.name}
//                                     </Col>
//                                     <Col className="col-name-ul">
//                                         {user.email}
//                                     </Col>
//                                   </Row>
//                                 </div>
//                                   <Collapse in={ButtonArray[i]}>
//                                     <Row className="row-options-admin">
//                                       <Col md="auto" className="button-options-col-admin">
//                                           <Link to={"admin/useroptions/" + user.uid}>
//                                             <Button className="button-options-style-admin"
//                                             type="button" id="update" variant="info">
//                                               Options
//                                             </Button>
//                                           </Link>
//                                       </Col>
//                                       <Col>
//                                         <Button className="button-options-style-admin" onClick={() => {
//                                             let tempArray = [...ButtonArray];
//                                             tempArray[i] = false;
//                                             setButtonArray(tempArray)
//                                         }}
//                                         type="button" id="update" variant="danger">
//                                             <i className="fa fa-times fa-1x text-white"></i>
//                                         </Button>
//                                       </Col>
//                                     </Row>
//                                   </Collapse>
//                             </div>
//                             : 
//                             <div key={i}>
//                               <div id="options-buttons-admin" onClick={() => {
//                                 let tempArray = [...ButtonArray];
//                                 if (tempArray[i] !== true)
//                                   tempArray.fill(false)
//                                 tempArray[i] = !tempArray[i]
//                                 setButtonArray(tempArray)
//                               }}>
//                                     <Row className={ButtonArray[i] ? 
//                                       "row-users-card-offrow-active-admin" : "row-users-card-offrow-admin"}>
//                                       <Col className="col-name-ul">
//                                               {"(" + index + ") " + user.name}
//                                       </Col>
//                                       <Col className="col-name-ul">
//                                           {user.email}
//                                       </Col>
//                                   </Row>
//                                 </div>
//                                   <Collapse in={ButtonArray[i]}>
//                                     <Row className="row-options-admin">
//                                       <Col md="auto" className="button-options-col-admin">
//                                           <Link to={"admin/useroptions/" + user.uid}>
//                                             <Button className="button-options-style-admin"
//                                             type="button" id="update" variant="info">
//                                               Options
//                                             </Button>
//                                           </Link>
//                                       </Col>
//                                       <Col>
//                                         <Button className="button-options-style-admin" onClick={() => {
//                                             let tempArray = [...ButtonArray];
//                                             tempArray[i] = false;
//                                             setButtonArray(tempArray)
//                                         }}
//                                         type="button" id="update" variant="danger">
//                                             <i className="fa fa-times fa-1x text-white"></i>
//                                         </Button>
//                                       </Col>
//                                     </Row>
//                                   </Collapse>
//                             </div>
//             ))}
//         </Card.Body>
//     )
// };


const condition = authUser =>
    authUser && !!authUser.roles[ROLES.ADMIN];
 
export default compose(
    withAuthorization(condition),
    withFirebase,
    )(AdminPage);