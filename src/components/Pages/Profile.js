import React, { Component } from 'react' ;

import { Container, Row, Col } from 'react-bootstrap/';

import { AuthUserContext, withAuthorization } from '../session';

import { withFirebase } from '../Firebase';

import './Profile.css';

class Profile extends Component {
  constructor(props) {
    super(props);

    this.state = {
        generalicon: '',
        profileicon: '',
        authUser: JSON.parse(localStorage.getItem('authUser')),
    };
  }

    componentDidMount() {
        //Figure out rank logic here
        this.getImage('generalicon');
        this.getProfile(`${this.state.authUser.uid}/profilepic`);
    }


  //Get image function for profile image = uid
  getProfile (uid) {
    let { state } = this
    this.props.firebase.pictures(`${uid}.png`).getDownloadURL().then((url) => {
      state["profileicon"] = url
      this.setState(state)
    }).catch((error) => {
      // Handle any errors
    })
  }

  //Get image function for rank
  getImage (image) {
    let { state } = this
    this.props.firebase.storage(`${image}.png`).getDownloadURL().then((url) => {
      state[image] = url
      this.setState(state)
    }).catch((error) => {
      // Handle any errors
    })
  }


  render() {
    return (
  <AuthUserContext.Consumer>
    {authUser => (
            <div>
                <Container>
                    <div className="team-single">
                        <Row>
                            <div className="col-lg-4 col-md-5 xs-margin-30px-bottom">
                                <div className="team-single-img">
                                    <img className="profile-pic" src={this.state.profileicon} alt="" />
                                </div>
                                <div className="bg-light-gray padding-30px-all md-padding-25px-all sm-padding-20px-all text-center description">
                                    <h4 className="margin-10px-bottom font-size24 md-font-size22 sm-font-size20 font-weight-600">{authUser.username}</h4>
                                    <p className="sm-width-95 sm-margin-auto rank-title">Rank: General</p>
                                    <img className="margin-10px-bottom font-size24 md-font-size22 sm-font-size20 font-weight-600" src={this.state.generalicon} alt="Players rank"/>
                                </div>
                            </div>

                            <div className="col-lg-8 col-md-7 stats-desc">
                                <div className="team-single-text padding-50px-left sm-no-padding-left">
                                    <p className="no-margin-bottom">Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum voluptatem.</p>
                                    <div className="contact-info-section margin-40px-tb">
                                        <ul className="list-style9 no-margin">
                                            <li>
                                                <Row>
                                                    <Col>
                                                        <i className="fas fa-graduation-cap text-orange"></i>
                                                        <strong className="margin-10px-left text-orange">Name:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>{authUser.name}</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <Col>
                                                        <i className="far fa-gem text-yellow"></i>
                                                        <strong className="margin-10px-left text-yellow">Points:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>{authUser.points}</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <Col md={5}>
                                                        <i className="far fa-file text-lightred"></i>
                                                        <strong className="margin-10px-left text-lightred">Wins:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>{authUser.wins}</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <Col md={5}>
                                                        <i className="fas fa-map-marker-alt text-green"></i>
                                                        <strong className="margin-10px-left text-green">Losses:</strong>
                                                    </Col>
                                                    <Col md={7}>
                                                        <p>{authUser.losses}</p>
                                                    </Col>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <div className="col-md-5 col-5">
                                                        <i className="fas fa-mobile-alt text-purple"></i>
                                                        <strong className="margin-10px-left xs-margin-four-left text-purple">Free games:</strong>
                                                    </div>
                                                    <div className="col-md-7 col-7">
                                                        <p>{authUser.freegames}</p>
                                                    </div>
                                                </Row>

                                            </li>
                                            <li>

                                                <Row>
                                                    <div className="col-md-5 col-5">
                                                        <i className="fas fa-mobile-alt text-purple"></i>
                                                        <strong className="margin-10px-left xs-margin-four-left text-purple">Affiliated Team:</strong>
                                                    </div>
                                                    <div className="col-md-7 col-7">
                                                        <p>{authUser.team != "" ? authUser.team : "N/A"}</p>
                                                    </div>
                                                </Row>

                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </Row>
                    </div>
                </Container>
            </div>
    )}
  </AuthUserContext.Consumer>
    )
  }
}

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(Profile));