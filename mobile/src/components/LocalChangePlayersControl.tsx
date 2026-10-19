import { useRef, useState } from 'react';

import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import {
  localChangePlayersCancelLabel,
  localChangePlayersConfirmLabel,
  localChangePlayersLabel,
  localChangePlayersMessage,
  localChangePlayersTitle,
} from '../features/local/match/copy';
import { reopenLocalSetup } from '../features/local/match/setup';
import { readLocalMatch } from '../features/local/match/viewing';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { createSingleFlight } from '../services/api/singleFlight';
import { Button } from './Button';
import { ConfirmAction } from './ConfirmAction';
import { Message } from './Message';

export function LocalChangePlayersControl() {
  const navigation = useAppNavigation();
  const lock = useRef(createSingleFlight());
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function ask() {
    if (pending) {
      return;
    }
    setError(undefined);
    setAsking(true);
  }

  function cancel() {
    if (pending) {
      return;
    }
    setAsking(false);
  }

  function confirm() {
    if (pending) {
      return;
    }
    const held = readLocalMatch();
    if (held === null) {
      setAsking(false);
      return;
    }
    setPending(true);
    void lock.current(async () => {
      const reopened = reopenLocalSetup(held);
      if (!reopened.ok) {
        setPending(false);
        setAsking(false);
        setError(reopened.message);
        return;
      }
      const saved = await commitLocalMatch(reopened.match);
      setPending(false);
      setAsking(false);
      if (!saved.ok) {
        setError(localMatchSaveError);
        return;
      }
      setError(undefined);
      navigation.reset({ index: 0, routes: [{ name: 'LocalSetup' }] });
    });
  }

  return (
    <>
      {error ? <Message tone="error">{error}</Message> : null}
      <Button
        label={localChangePlayersLabel}
        variant="secondary"
        onPress={ask}
        disabled={pending}
        loading={pending}
      />
      <ConfirmAction
        visible={asking}
        title={localChangePlayersTitle}
        message={localChangePlayersMessage}
        confirmLabel={localChangePlayersConfirmLabel}
        cancelLabel={localChangePlayersCancelLabel}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </>
  );
}
