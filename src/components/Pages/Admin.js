import React, { Component } from 'react';
import '../../App.css';
import '../constants/admin.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { onValue } from "firebase/database";

import { Container, Row, Col, Form, Card, Spinner } from 'react-bootstrap/';

import { Link } from 'react-router-dom';

import * as ROLES from '../constants/roles';

import { Helmet } from 'react-helmet-async';
import AdminDrawer from '../constants/admindrawer';
import UserTable from '../constants/usertable';
import { getDownloadURL, uploadBytes } from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faTimesCircle,
  faGift,
  faUserPlus,
  faUserGear,
  faUsers,
  faCalendar,
  faUserPen,
  faQrcode,
  faSearch,
  faClipboardList
} from '@fortawesome/free-solid-svg-icons';

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

    onValue(this.props.firebase.users(), snapshot => {
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
    // this.props.firebase.users().off();
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
    }, function () {
      setTimeout(() => {
        this.setState({ email_status: "" });
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
    this.setState({ usersSearchList: newUsers })
  };

  // Checks dimensions of uploaded image
  checkDimensions = () => {
    var height = this.imgRef.current.height;
    this.setState({ rows: Math.ceil(height / 17.6) })
  }

  handleUpload = e => {
    if (e.target.files[0]) {
      const image = e.target.files[0];
      const uploadTask = uploadBytes(this.props.firebase.emailAttachment(), image);
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
          getDownloadURL(this.props.firebase
            .emailAttachment())
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
      <div className="admin-container">
        <Helmet>
          <title>US Airsoft Field: Administrator</title>
        </Helmet>
        <AdminDrawer component={
          <div className="admin-content">
            <Container fluid className="p-0">
              {/* Quick Actions Grid */}
              <Row className="action-cards-grid">
                {[
                  { title: 'Enter Wins', path: '/admin/enterwins', icon: faTrophy },
                  { title: 'Enter Losses', path: '/admin/enterlosses', icon: faTimesCircle },
                  { title: 'Check Free Games', path: '/admin/freegames', icon: faGift },
                  { title: 'New Member', path: '/admin/signup', icon: faUserPlus },
                  { title: 'Renew Member', path: '/admin/renewal', icon: faUserGear }
                ].map((item, index) => (
                  <Col key={index} lg={2} md={4} sm={6} className="mb-4">
                    <Link to={item.path} className="card-link">
                      <Card className="modern-card">
                        <Card.Body>
                          <FontAwesomeIcon icon={item.icon} className="card-icon" />
                          <h3 className="card-title">{item.title}</h3>
                        </Card.Body>
                      </Card>
                    </Link>
                  </Col>
                ))}
              </Row>

              {/* Users List Section */}
              <Row className="mt-4 users-card-container">
                <Col lg={10} md={12}>
                  <Card className="modern-card users-card">
                    <Card.Header>
                      <FontAwesomeIcon icon={faUsers} className="me-2" />
                      Users List
                    </Card.Header>
                    <Card.Body>
                      <Form className="search-form mb-4">
                        <Form.Group>
                          <Form.Control
                            type="search"
                            placeholder="Search users..."
                            value={this.state.search}
                            onChange={this.onChange}
                          />
                        </Form.Group>
                      </Form>
                      {loading ? (
                        <div className="text-center">
                          <Spinner animation="border" variant="light" />
                        </div>
                      ) : (
                        <UserTable
                          users={this.state.usersSearchList}
                          index={0}
                          length={this.state.usersSearchList.length}
                          search={this.state.search}
                        />
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Additional Actions Grid */}
              <Row className="action-cards-grid mt-4">
                {[
                  { title: 'Calendar', path: '/admin/birthday', icon: faCalendar },
                  { title: 'Sign Waiver', path: '/admin/waiverform', icon: faUserPen },
                  { title: 'Scan Waiver', path: '/admin/scanwaiver', icon: faQrcode },
                  { title: 'Search Waiver', path: '/admin/waiverlookup', icon: faSearch },
                  { title: 'Rental Form', path: '/admin/rentalform', icon: faClipboardList }
                ].map((item, index) => (
                  <Col key={index} lg={2} md={4} sm={6} className="mb-4">
                    <Link to={item.path} className="card-link">
                      <Card className="modern-card">
                        <Card.Body>
                          <FontAwesomeIcon icon={item.icon} className="card-icon" />
                          <h3 className="card-title">{item.title}</h3>
                        </Card.Body>
                      </Card>
                    </Link>
                  </Col>
                ))}
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

// export default withAuthorization(condition)(AdminPage);
export default withAuthorization(condition)(withFirebase(AdminPage))

// export default composeHooks(
//     withAuthorization(condition),
//     withFirebase,
//     )(AdminPage);