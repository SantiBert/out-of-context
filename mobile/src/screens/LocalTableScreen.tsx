import { useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '../components/Button';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { LocalAbandonControl } from '../components/LocalAbandonControl';
import { LocalRestartControl } from '../components/LocalRestartControl';
import { Message } from '../components/Message';
import {
  commitLocalMatch,
  localMatchSaveError,
} from '../features/local/match/autosave';
import { localTableInstruction } from '../features/local/match/copy';
import { readLocalMatch } from '../features/local/match/viewing';
import { openLocalRecording } from '../features/local/rules/vote';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { homeRoute } from '../navigation/routes';
import { theme } from '../theme/theme';

export function LocalTableScreen() {
  const navigation = useAppNavigation();
  const match = readLocalMatch();
  const [saveError, setSaveError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const canRecord = match?.phase === 'conversation';

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
    <ScrollView contentContainerStyle={styles.content}>
      <Heading>Mesa</Heading>
      <HelperText>{localTableInstruction}</HelperText>
      {canRecord && match ? (
        <Button
          label="Abrir carga"
          onPress={openRecord}
          disabled={saving}
          loading={saving}
        />
      ) : null}
      {saveError ? <Message tone="error">{saveError}</Message> : null}
      <LocalRestartControl />
      <LocalAbandonControl />
      <Button
        label="Inicio"
        variant="secondary"
        accessibilityLabel="Volver al inicio"
        onPress={() =>
          navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
});
