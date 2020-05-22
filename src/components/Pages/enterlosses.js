import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import * as ROLES from '../constants/roles';
 
class EnterLosses extends Component {
  constructor(props) {
    super(props);
 
    this.state = {
      };
    }
   
    render() {
        return (
          <div className="pagePlaceholder">
            <h1>Admin - Enter Losses</h1>
          </div>
        );
      }
    }
     
const condition = authUser =>
authUser && !!authUser.roles[ROLES.ADMIN];
 
export default compose(
    withAuthorization(condition),
    withFirebase,
    )(EnterLosses);