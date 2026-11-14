import React from 'react';
import { withRouter } from '../constants/withRouter';
import { withFirebase } from '../Firebase';
import AuthUserContext from './context';

const withAuthorization = condition => Component => {
    class WithAuthorization extends React.Component {
        state = { verifiedUid: null };

        componentDidMount() {
            const clearVerification = () => this.setState({ verifiedUid: null });
            const deny = () => {
                clearVerification();
                this.props.router.navigate("/login");
            };
            this.listener = this.props.firebase.onAuthUserListener((authUser) => {
                if (!authUser?.uid || !condition(authUser)) {
                    deny();
                } else {
                    this.setState({ verifiedUid: authUser.uid });
                }
            }, deny, { watchProfile: true, onPending: clearVerification });
        }

        componentWillUnmount() {
            this.listener();
        }

        render() {
            return (
                <AuthUserContext.Consumer>
                    {authUser =>
                        this.state.verifiedUid && this.state.verifiedUid === authUser?.uid && condition(authUser)
                            ? <Component key={authUser.uid} {...this.props} /> : null
                    }
                </AuthUserContext.Consumer>
            );
        }
    }

    return withRouter(withFirebase(WithAuthorization));
};

export default withAuthorization;
