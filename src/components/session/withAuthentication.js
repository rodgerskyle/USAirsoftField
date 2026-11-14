import React from 'react';

import AuthUserContext from './context';
import { withFirebase } from '../Firebase';

const withAuthentication = Component => {
    class WithAuthentication extends React.Component {
        state = { authUser: null };

        componentDidMount() {
            try {
                localStorage.removeItem('authUser');
            } catch {
                // The auth context also works when browser storage is blocked.
            }
            const clearUser = () => this.setState({ authUser: null });
            this.listener = this.props.firebase.onAuthUserListener(
                authUser => this.setState({ authUser }),
                clearUser,
                { watchProfile: true, onPending: clearUser },
            );
        }

        componentWillUnmount() {
            this.listener();
        }

        render() {
            return (
                <AuthUserContext.Provider value={this.state.authUser}>
                    <Component {...this.props} />
                </AuthUserContext.Provider>
            );
        }
    }

    return withFirebase(WithAuthentication);
};

export default withAuthentication;
