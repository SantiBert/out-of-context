import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '../components/Button';
import { HomeButton } from '../components/HomeButton';
import { LocalAbandonControl } from '../components/LocalAbandonControl';
import { LocalRestartControl } from '../components/LocalRestartControl';
import { Message } from '../components/Message';
import { PrivateDealFrame } from '../components/PrivateDealFrame';
import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import { localTableInstruction } from '../features/local/match/copy';
import {
  openRecordLabel,
  tablePresentation,
  tableScreenTitle,
} from '../features/local/match/tablePresentation';
import { readLocalMatch } from '../features/local/match/viewing';
import { openLocalRecording } from '../features/local/rules/vote';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useExitToHomeOnBack } from '../hooks/useExitToHomeOnBack';
import { theme } from '../theme/theme';

export function LocalTableScreen() {
  useExitToHomeOnBack();
  const navigation = useAppNavigation();
  const match = readLocalMatch();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const presentation = tablePresentation(match);

  function openRecord() {
    if (!match || savingLock.current) {
      return;
    }
    const opened = openLocalRecording(match);
    if (!opened.ok) {
      return;
    }
    savingLock.current = true;
    setSaving(true);
    void commitLocalMatch(opened.match).then((saved) => {
      if (!saved.ok) {
        savingLock.current = false;
        setSaving(false);
        setSaveError(localMatchSaveError);
        return;
      }
      navigation.reset({
        index: 0,
        routes: [{ name: 'LocalRecord' }],
      });
    });
  }

  return (
    <PrivateDealFrame>
      <Text accessibilityRole="header" style={styles.title}>
        {tableScreenTitle}
      </Text>
      <Text style={styles.roundLabel}>{presentation.roundHeading}</Text>
      <Text style={styles.phaseLabel}>{presentation.phaseLabel}</Text>
      <Text style={styles.helperOnNavy}>{localTableInstruction}</Text>
      {presentation.canOpenRecord && match ? (
        <Button
          label={openRecordLabel}
          variant="accent"
          onPress={openRecord}
          disabled={saving}
          loading={saving}
        />
      ) : null}
      {saveError ? <Message tone="error">{saveError}</Message> : null}
      <LocalRestartControl />
      <LocalAbandonControl />
      <HomeButton />
    </PrivateDealFrame>
  );
}

const styles = StyleSheet.create({
  title: {
    ...theme.typography.heading,
    color: theme.brand.cream,
    textAlign: 'center',
  },
  roundLabel: {
    ...theme.typography.label,
    color: theme.brand.mint,
    textAlign: 'center',
  },
  phaseLabel: {
    ...theme.typography.heading,
    fontSize: 22,
    lineHeight: 28,
    color: theme.brand.cream,
    textAlign: 'center',
  },
  helperOnNavy: {
    ...theme.typography.helper,
    color: theme.brand.cream,
    opacity: 0.9,
    textAlign: 'center',
  },
});
