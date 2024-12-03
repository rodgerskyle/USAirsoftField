import React, {Component} from 'react';
import { withRouter } from './withRouter';
import { withFirebase } from '../Firebase';
import { Helmet } from 'react-helmet-async';

class Logout extends Component {
  constructor(props){
    super(props);

    this.state={};
  }

  componentDidMount() {
    this.props.firebase.doSignOut()
    this.props.history.push('/login')
  }

  render() {
    return(
    <div><Helmet><title>US Airsoft Field: Logout</title></Helmet></div>
    );
  }
}
  export default withRouter(withFirebase(Logout));

  // export default composeHooks(
  //     withRouter,
  //     withFirebase,
  // )(Logout);