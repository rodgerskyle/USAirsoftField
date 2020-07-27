import React, { Component } from 'react';
import '../../App.css';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import { compose } from 'recompose';

import { Button } from 'react-bootstrap/';


import * as ROLES from '../constants/roles';
 
class AdminPage extends Component {
  constructor(props) {
    super(props);
 
    this.state = {
        loading: false,
        users: [],
      };
    }
   
    componentDidMount() {
      this.setState({ loading: true });
   
      this.props.firebase.users().on('value', snapshot => {
        const usersObject = snapshot.val();
   
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

    addTeam() {
      const leader = " ";
      var members = []; //add people here
      const teammates = members;
      /*this.props.firebase.team("ort3").set({
        leader,
        teammates,
      })*/
      this.props.firebase.team('outlaws').set({
        leader,
        teammates,
      });
      console.log("success")
    }

    render() {
        const { users, loading } = this.state;
     
        return (
          <div className="pagePlaceholder">
            <h1>Admin</h1>
            <Button type="submit" id="register" variant="primary" onClick={() => this.addTeam()}>
                                    Submit
                        </Button>
     
            {loading && <div>Loading ...</div>}
     
            <UserList users={users} />
          </div>
        );
      }
    }
     
    const UserList = ({ users }) => (
      <ul>
        {users.map(user => (
          <li key={user.uid}>
            <span>
              <strong>ID:</strong> {user.uid}
            </span>
            <span>
              <strong>E-Mail:</strong> {user.email}
            </span>
            <span>
              <strong>Username:</strong> {user.username}
            </span>
          </li>
        ))}
      </ul>
    );

const condition = authUser =>
authUser && !!authUser.roles[ROLES.ADMIN];
 
export default compose(
    withAuthorization(condition),
    withFirebase,
    )(AdminPage);