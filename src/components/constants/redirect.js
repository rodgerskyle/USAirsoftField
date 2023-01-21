import React, { Component } from "react";
import { withRouter } from './withRouter';
import { withFirebase } from '../Firebase';
import * as ROLES from "./roles";

class Redirect extends Component {

    constructor(props) {
        super(props);
        this.state = { 
            user: null,
            waiverlocations: [
                "/dashboard", "/dashboard/signup", "/dashboard/renewal", "/dashboard/waiverform", "/dashboard/waiverlookup", 
                "/dashboard/rentalform", "/dashboard/scanwaiver", "/signout", "/login", "/dashboard/freegames", "/dashboard/birthday"
            ],
            staticlocations: [
                "/dashboard/waiverform", "/signout", "/login"
            ]
         };

    }

    componentDidMount() {
        this.authSubscription = 
            this.props.firebase.onAuthUserListener((user) => {
                this.setState({user})
            }, () => {this.setState({user: null})});
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

export default withRouter(withFirebase(Redirect));