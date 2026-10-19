import { useRef, useState } from 'react';

import { deviceRng } from '../features/local/catalog/rng';
import { localCatalogSituations } from '../features/local/catalog/situations';
import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import {
  localRestartCancelLabel,
  localRestartConfirmLabel,
  localRestartLabel,
  localRestartMessage,
  localRestartTitle,
} from '../features/local/match/copy';
import { restartLocalMatch } from '../features/local/match/restart';
import { readLocalMatch } from '../features/local/match/viewing';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { createSingleFlight } from '../services/api/singleFlight';
import { Button } from './Button';
import { ConfirmAction } from './ConfirmAction';
import { Message } from './Message';

export function LocalRestartControl() {
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
      const restarted = restartLocalMatch(
        held,
        localCatalogSituations(),
        deviceRng(),
      );
      if (!restarted.ok) {
        setPending(false);
        setAsking(false);
        setError(restarted.message);
        return;
      }
      const saved = await commitLocalMatch(restarted.match);
      setPending(false);
      setAsking(false);
      if (!saved.ok) {
        setError(localMatchSaveError);
        return;
      }
      setError(undefined);
      navigation.reset({ index: 0, routes: [{ name: 'LocalCard' }] });
    });
  }

  return (
    <>
      {error ? <Message tone="error">{error}</Message> : null}
      <Button
        label={localRestartLabel}
        variant="secondary"
        onPress={ask}
        disabled={pending}
        loading={pending}
      />
      <ConfirmAction
        visible={asking}
        title={localRestartTitle}
        message={localRestartMessage}
        confirmLabel={localRestartConfirmLabel}
        cancelLabel={localRestartCancelLabel}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </>
  );
}
