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
                "/dashboard", "/dashboard/signup", "/dashboard/renewal", "/dashboard/waiverform", "/dashboard/waiverlookup", 
                "/dashboard/rentalform", "/dashboard/scanwaiver", "/signout", "/login",
            ],
            staticlocations: [
                "/dashboard/waiverform", "/signout", "/login"
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
        let { user, waiverlocations, staticlocations } = this.state
        if (user && !!user.roles[ROLES.WAIVER]) {
            if (!!user.roles[ROLES.STATIC] && !staticlocations.includes(this.props.location.pathname))
                this.props.history.push("/dashboard/waiverform")
            else if (!waiverlocations.includes(this.props.location.pathname))
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