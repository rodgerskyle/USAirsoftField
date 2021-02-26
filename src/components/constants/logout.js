import React, {Component} from 'react';
import { withRouter } from "react-router-dom";
import { withFirebase } from '../Firebase';
import { compose } from 'recompose';

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
    return(<div></div>);
  }
}

  export default compose(
      withRouter,
      withFirebase,
  )(Logout);