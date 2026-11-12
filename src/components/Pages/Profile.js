import React, { useEffect, useState } from 'react';

import { withFirebase } from '../Firebase';
import { withAuthorization } from '../session';
import PlayerProfileView, { ProfileState } from './PlayerProfileView';

function Profile({ firebase }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = firebase.onAuthUserListener(
      (authUser) => { if (active) setUser(authUser); },
      () => { if (active) setUser(null); },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [firebase]);

  return user
    ? <PlayerProfileView key={user.uid} firebase={firebase} user={user} playerId={user.uid} account />
    : <ProfileState loading />;
}

const condition = authUser => !!authUser;

export default withFirebase(withAuthorization(condition)(Profile));
