import React from 'react';
import { withRouter } from '../constants/withRouter';


import { withFirebase } from '../Firebase';
import AuthUserContext from './context';


const withAuthorization = condition => Component => {
    class WithAuthorization extends React.Component {
        componentDidMount() {
            this.listener = this.props.firebase.onAuthUserListener((authUser) => {
                if (!condition(authUser)) {
                    this.props.router.navigate("/login");
                }
            }, () => {
                this.props.router.navigate("/login");
            });
        }

        componentWillUnmount() {
            this.listener();
        }

        render() {
            return (
                <AuthUserContext.Consumer>
                    {authUser =>
                        condition(authUser) ? <Component {...this.props} /> : null
                    }
                </AuthUserContext.Consumer>
            );
        }
    }

    return withRouter(withFirebase(WithAuthorization));

    // return composeHooks(
    //     withRouter,
    //     withFirebase,
    // )(WithAuthorization);
};

export default withAuthorization;