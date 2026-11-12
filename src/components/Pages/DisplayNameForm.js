import React, { useEffect, useRef, useState } from 'react';
import { getPlayerDisplayNames, savePlayerDisplayName } from '../constants/playerDisplayNames';
import './DisplayNameForm.css';

export default function DisplayNameForm({ firebase, playerId }) {
  const [savedName, setSavedName] = useState(null);
  const [draft, setDraft] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const saveRequest = useRef(null);

  useEffect(() => {
    if (!playerId) return undefined;
    const controller = new AbortController();
    getPlayerDisplayNames([playerId], { signal: controller.signal }).then((names) => {
      if (controller.signal.aborted) return;
      const name = names[playerId] ?? '';
      setSavedName(name);
      setDraft(name);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError(true);
    });
    return () => controller.abort();
  }, [loadAttempt, playerId]);

  useEffect(() => () => saveRequest.current?.abort(), []);

  async function save(name) {
    if (saving || savedName === null) return;
    setSaving(true);
    setFeedback(null);
    const controller = new AbortController();
    saveRequest.current = controller;
    try {
      const { displayName } = await savePlayerDisplayName(firebase, name, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setSavedName(displayName ?? '');
      setDraft(displayName ?? '');
      setFeedback({
        message: displayName ? 'Display name saved.' : 'Your profile and leaderboards now use your default name.',
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setFeedback({ error: true, message: error.message || 'Could not save your display name. Try again.' });
      }
    } finally {
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    const name = draft.trim();
    if (name && name !== savedName) save(name);
  }

  const loading = savedName === null && !loadError;
  return (
    <form className="settings-display-name" onSubmit={submit} aria-busy={saving || loading}>
      <label htmlFor="settings-display-name">Public display name</label>
      <p id="settings-display-name-help">Appears on your profile and the leaderboards. Use 2–24 characters.</p>
      {loadError ? (
        <div className="settings-display-name__actions">
          <p role="alert">Could not load your display name.</p>
          <button type="button" className="btn btn-outline-light" onClick={() => {
            setLoadError(false);
            setLoadAttempt(value => value + 1);
          }}>Try again</button>
        </div>
      ) : (
        <>
          <input
            id="settings-display-name"
            className="form-control"
            aria-describedby="settings-display-name-help"
            placeholder={loading ? 'Loading…' : 'Choose a display name'}
            value={draft}
            minLength={2}
            maxLength={48}
            required
            disabled={saving || loading}
            onChange={(event) => {
              setDraft(event.target.value);
              setFeedback(null);
            }}
          />
          <div className="settings-display-name__actions">
            <button type="submit" className="btn btn-danger" disabled={saving || loading || !draft.trim() || draft.trim() === savedName}>
              {saving ? 'Saving…' : 'Save display name'}
            </button>
            {savedName && (
              <button type="button" className="btn btn-outline-light" disabled={saving} onClick={() => save(null)}>
                Use default name
              </button>
            )}
          </div>
        </>
      )}
      {feedback && <p className="settings-display-name__feedback" role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
    </form>
  );
}
