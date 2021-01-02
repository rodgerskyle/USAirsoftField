import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { withFirebase } from '../Firebase';
import { compose } from 'recompose';
import * as ROLES from "./roles";

class Redirect extends Component {

    constructor(props) {
        super(props);
        this.state = { 
            user: null,
            waiverlocations: [
                "/dashboard", "/signup", "/renewal", "/waiverform", "/waiverlookup", "/rentalform", "/signout", "/login"
            ]
         };

    }

    componentDidMount() {
        this.authSubscription = 
            this.props.firebase.onAuthUserListener((user) => {this.setState({user})});
    }
    componentWillUnmount() {
        this.authSubscription()
    }
	componentDidUpdate(prevProps) {
        let { user, waiverlocations } = this.state
        if (user && !!user.roles[ROLES.WAIVER]) {
            if (!waiverlocations.includes(this.props.location.pathname))
                this.props.history.push("/dashboard");
        }
	}

	render() {
		return <React.Fragment />
	}
}

    export default compose(
        withRouter,
        withFirebase,
    )(Redirect);