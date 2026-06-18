import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import React from 'react';

export function withRouter(Component) {
  function ComponentWithRouterProp(props) {
    let location = useLocation();
    let navigate = useNavigate();
    let params = useParams();
    const history = {
      push: (to, state) => navigate(to, { state }),
      replace: (to, state) => navigate(to, { replace: true, state }),
      goBack: () => navigate(-1),
      goForward: () => navigate(1),
    };

    return (
      <Component
        {...props}
        history={history}
        router={{ location, navigate, params }}
      />
    );
  }

  return ComponentWithRouterProp;
};
