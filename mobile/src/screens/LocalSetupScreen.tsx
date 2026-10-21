import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { DashedButton } from '../components/DashedButton';
import { Message } from '../components/Message';
import { PlayerRosterRow } from '../components/PlayerRosterRow';
import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import {
  addPlayerLabel,
  continueSetupLabel,
  playersLimitsHelper,
} from '../features/local/match/setupPresentation';
import { readLocalMatch } from '../features/local/match/viewing';
import {
  buildSetupFromSlotNames,
  canRemoveLocalPlayer,
  createRosterSlots,
  localRosterMutable,
  maxLocalPlayers,
  minLocalPlayers,
  startedLocalRosterMessage,
  type LocalPlayer,
} from '../features/local/match/setup';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { theme } from '../theme/theme';

function rosterHeldIsLocked(): boolean {
  const held = readLocalMatch();
  return held !== null && !localRosterMutable(held);
}

function initialSlots(): LocalPlayer[] {
  const held = readLocalMatch();
  if (held?.phase === 'setup') {
    return createRosterSlots(
      held.players.map((player) => ({ id: player.id, name: player.name })),
    );
  }
  return createRosterSlots();
}

export function LocalSetupScreen() {
  const navigation = useAppNavigation();
  const [slots, setSlots] = useState(initialSlots);
  const [continueError, setContinueError] = useState<string | undefined>();
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const busy = pending || removingId !== null;
  const locked = rosterHeldIsLocked();
  const canEditRoster = !locked;
  const removable = canRemoveLocalPlayer(slots.length);

  function updateSlotName(id: string, name: string) {
    setSlots((current) =>
      current.map((slot) => (slot.id === id ? { ...slot, name } : slot)),
    );
    setContinueError(undefined);
  }

  function addSlot() {
    if (slots.length >= maxLocalPlayers || busy || locked) {
      return;
    }
    const highest = slots.reduce((max, slot) => {
      const value = Number(slot.id);
      return Number.isInteger(value) && value > max ? value : max;
    }, 0);
    setSlots((current) => [
      ...current,
      { id: String(highest + 1), name: '' },
    ]);
    setContinueError(undefined);
  }

  function removeSlot(id: string) {
    if (!removable || busy || locked) {
      return;
    }
    setRemovingId(id);
    setSlots((current) => {
      if (!canRemoveLocalPlayer(current.length)) {
        return current;
      }
      return current.filter((slot) => slot.id !== id);
    });
    setRemovingId(null);
    setContinueError(undefined);
  }

  function goToMatchConfig() {
    if (saving.current || busy) {
      return;
    }
    if (rosterHeldIsLocked()) {
      setContinueError(startedLocalRosterMessage);
      return;
    }
    const built = buildSetupFromSlotNames(slots.map((slot) => slot.name));
    if (!built.ok) {
      setContinueError(built.message);
      return;
    }
    saving.current = true;
    setPending(true);
    void commitLocalMatch(built.match).then((saved) => {
      saving.current = false;
      setPending(false);
      if (!saved.ok) {
        setContinueError(localMatchSaveError);
        return;
      }
      setContinueError(undefined);
      navigation.navigate('LocalMatchConfig');
    });
  }

  const canContinue =
    canEditRoster &&
    !busy &&
    slots.length >= minLocalPlayers &&
    slots.every((slot) => slot.name.trim().length > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {locked ? (
            <Message tone="warning">{startedLocalRosterMessage}</Message>
          ) : null}

          {slots.map((slot, index) => (
            <PlayerRosterRow
              key={slot.id}
              index={index + 1}
              name={slot.name}
              editable={canEditRoster}
              removable={removable}
              disabled={busy}
              removing={removingId === slot.id}
              onChangeName={(name) => updateSlotName(slot.id, name)}
              onRemove={() => removeSlot(slot.id)}
            />
          ))}

          {canEditRoster ? (
            <>
              <DashedButton
                label={addPlayerLabel}
                onPress={addSlot}
                disabled={busy || slots.length >= maxLocalPlayers}
              />
              {continueError ? (
                <Message tone="error">{continueError}</Message>
              ) : null}
              <View style={styles.footer}>
                <Button
                  label={continueSetupLabel}
                  variant="mint"
                  onPress={goToMatchConfig}
                  disabled={!canContinue}
                  loading={pending}
                />
                <Text style={styles.limits}>{playersLimitsHelper}</Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.background,
  },
  footer: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  limits: {
    ...theme.typography.helper,
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
