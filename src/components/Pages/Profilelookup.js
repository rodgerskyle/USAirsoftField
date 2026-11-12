import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { onValue } from 'firebase/database';

import { withFirebase } from '../Firebase';
import PlayerProfileView, { ProfileState } from './PlayerProfileView';

function ProfileLookup({ firebase }) {
  const { id } = useParams();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const unavailable = () => setResult({ id, status: 'unavailable' });

    if (!id || id.includes('/')) {
      unavailable();
      return undefined;
    }

    try {
      return onValue(
        firebase.user(id),
        (snapshot) => {
          const user = snapshot.val();
          setResult(user
            ? { id, status: 'ready', user }
            : { id, status: 'missing' });
        },
        unavailable,
      );
    } catch {
      unavailable();
      return undefined;
    }
  }, [firebase, id]);

  if (result?.id === id && result?.status === 'ready') {
    return <PlayerProfileView key={id} firebase={firebase} user={result.user} playerId={id} />;
  }

  return (
    <>
      <Helmet><title>US Airsoft Field: Player Profile</title></Helmet>
      <ProfileState loading={result?.id !== id} missing={result?.status === 'missing'} />
    </>
  );
}

export default withFirebase(ProfileLookup);
