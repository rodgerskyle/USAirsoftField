import React, { Component } from "react";
import { withRouter } from './withRouter';

class ScrollToTop extends Component {
	componentDidUpdate(prevProps) {
		if (this.props.location !== prevProps.location) {
			window.scrollTo(0, 0);
		}
	}

	render() {
		return <React.Fragment />
	}
}

export default withRouter(ScrollToTop)