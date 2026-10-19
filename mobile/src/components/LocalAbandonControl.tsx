import { useRef, useState } from 'react';

import {
  abandonActiveLocalMatch,
  localMatchAbandonError,
} from '../features/local/match/autosave';
import {
  localAbandonCancelLabel,
  localAbandonConfirmLabel,
  localAbandonLabel,
  localAbandonMessage,
  localAbandonTitle,
} from '../features/local/match/copy';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { homeRoute } from '../navigation/routes';
import { createSingleFlight } from '../services/api/singleFlight';
import { Button } from './Button';
import { ConfirmAction } from './ConfirmAction';
import { Message } from './Message';

export const abandonConfirmVariant = 'destructive' as const;

export function LocalAbandonControl() {
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
    setPending(true);
    void lock.current(async () => {
      const abandoned = await abandonActiveLocalMatch();
      setPending(false);
      setAsking(false);
      if (!abandoned.ok) {
        setError(localMatchAbandonError);
        return;
      }
      setError(undefined);
      navigation.reset({ index: 0, routes: [{ name: homeRoute }] });
    });
  }

  return (
    <>
      {error ? <Message tone="error">{error}</Message> : null}
      <Button
        label={localAbandonLabel}
        variant="destructive"
        onPress={ask}
        disabled={pending}
        loading={pending}
      />
      <ConfirmAction
        visible={asking}
        title={localAbandonTitle}
        message={localAbandonMessage}
        confirmLabel={localAbandonConfirmLabel}
        cancelLabel={localAbandonCancelLabel}
        confirmVariant={abandonConfirmVariant}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </>
  );
}
