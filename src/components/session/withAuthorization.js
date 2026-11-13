import React from 'react';
import { withRouter } from '../constants/withRouter';


import { withFirebase } from '../Firebase';
import AuthUserContext from './context';


const withAuthorization = (condition, { verifyOnMount = false } = {}) => Component => {
    class WithAuthorization extends React.Component {
        state = { verifiedUid: null };

        componentDidMount() {
            const deny = () => {
                if (verifyOnMount) this.setState({ verifiedUid: null });
                this.props.router.navigate("/login");
            };
            this.listener = this.props.firebase.onAuthUserListener((authUser) => {
                if (!condition(authUser)) {
                    deny();
                } else if (verifyOnMount) {
                    this.setState({ verifiedUid: authUser.uid });
                }
            }, deny);
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
