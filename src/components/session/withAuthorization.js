import React from 'react';
import { withRouter } from '../constants/withRouter';


import { withFirebase } from '../Firebase';
import { walkOnAfterLogin } from '../constants/groupRentalLink';
import AuthUserContext from './context';


const withAuthorization = (condition, { verifyOnMount = false } = {}) => Component => {
    class WithAuthorization extends React.Component {
        state = { verifiedUid: null };

        componentDidMount() {
            const deny = (signedOut = false) => {
                if (verifyOnMount) this.setState({ verifiedUid: null });
                const { pathname, search } = this.props.router.location;
                const handoff = signedOut && /^\/(admin|dashboard)\/rentalform\/?$/.test(pathname) && walkOnAfterLogin(search, true);
                this.props.router.navigate(handoff ? '/login?' + handoff.split('?')[1] : '/login');
            };
            this.listener = this.props.firebase.onAuthUserListener((authUser) => {
                if (!condition(authUser)) {
                    deny();
                } else if (verifyOnMount) {
                    this.setState({ verifiedUid: authUser.uid });
                }
            }, () => deny(true));
        }

        componentWillUnmount() {
            this.listener();
        }

        render() {
            return (
                <AuthUserContext.Consumer>
                    {authUser =>
                        condition(authUser) && (!verifyOnMount ||
                            (this.state.verifiedUid && this.state.verifiedUid === authUser.uid))
                            ? <Component {...this.props} /> : null
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
