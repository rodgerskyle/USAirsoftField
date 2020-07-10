import React, { Component } from 'react';
import { Table } from 'react-bootstrap/';
import '../../App.css';

import rankimages from '../constants/smallrankimgs';
import Td from '../constants/td';

import { withFirebase } from '../Firebase';

class Leaderboards extends Component {
    constructor(props) {
        super(props);

        this.state = {
            images: rankimages,
            loading: false,
            users: [],
            getRankState: this.getRank,
        };
    }

    //Figuring out rank logic
    getRank(points) {
        var index = 1;
        if (points < 125) {
            index = 1;
        }
        else if (points < 225) {
            index = 2;
        }
        else if (points < 335) {
            index = 3;
        }
        else if (points < 450) {
            index = 4;
        }
        else if (points < 570) {
            index = 5;
        }
        else if (points < 690) {
            index = 6;
        }
        else if (points < 820) {
            index = 7;
        }
        else if (points < 960) {
            index = 8;
        }
        else if (points < 1110) {
            index = 9;
        }
        else if (points < 1270) {
            index = 10;
        }
        else if (points < 1440) {
            index = 11;
        }
        else if (points < 1640) {
            index = 12;
        }
        else if (points < 1840) {
            index = 13;
        }
        else if (points < 2090) {
            index = 14;
        }
        else if (points < 2340) {
            index = 15;
        }
        else if (points < 2615) {
            index = 16;
        }
        else if (points < 2890) {
            index = 17;
        }
        else if (points < 3190) {
            index = 18;
        }
        else if (points < 3490) {
            index = 19;
        }
        else if (points < 3790) {
            index = 20;
        }
        else if (points < 4115) {
            index = 21;
        }
        else if (points < 4500) {
            index = 22;
        }
        else {
            index = 23;
        }
        index--;
        return index;
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

    render() {
        const { users, loading, getRankState } = this.state;

        return (
            <div className="pagePlaceholder">
                <h1>Leaderboards</h1>

                {loading && <div>Loading ...</div>}

                <UserList users={users} images={this.state.images} getRank={getRankState}/>
            </div>
        );
    }
}


const UserList = ({ users, images, getRank}) => (
    <Table className="table table-striped table-dark">
        <thead>
            <tr>
                <th scope="col">#</th>
                <th scope="col">Rank</th>
                <th scope="col">Name</th>
                <th scope="col">Points</th>
            </tr>
        </thead>
        <tbody>
            {users.sort((a,b) => a.points < b.points ? 1 : -1).map((user, i) => (

                <tr key={user.uid}>
                    <th scope="row">{i+1}</th>
                        <Td><img src={images.length !== 0 ? images[getRank(user.points)] : null} 
                        alt="Player Rank" /></Td>
                        <Td to={'/profilelookup/'+user.uid}>{user.name}</Td>
                        <Td>{user.points}</Td>
                </tr>
            ))}
        </tbody>
    </Table>
);

export default withFirebase(Leaderboards);