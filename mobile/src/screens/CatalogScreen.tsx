import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '../components/Button';
import { ConfirmAction } from '../components/ConfirmAction';
import { ContentCard } from '../components/ContentCard';
import { EmptyState } from '../components/EmptyState';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { Message } from '../components/Message';
import { StatusBadge } from '../components/StatusBadge';
import { TextField } from '../components/TextField';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { homeRoute } from '../navigation/routes';
import { theme } from '../theme/theme';

export function CatalogScreen() {
  const navigation = useAppNavigation();
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Heading>Componentes</Heading>
      <HelperText>Catálogo interno. No consulta la partida.</HelperText>
      <ContentCard>
        <StatusBadge label="Neutral" />
        <StatusBadge label="Listo" tone="success" />
        <StatusBadge label="Aviso" tone="warning" />
        <StatusBadge label="Error" tone="danger" />
      </ContentCard>
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Escribe un nombre"
        error={name.length > 12 ? 'Máximo 12 caracteres.' : undefined}
      />
      <TextField
        label="Campo deshabilitado"
        value="No editable"
        onChangeText={() => undefined}
        disabled
      />
      <Button label="Primario" onPress={() => undefined} />
      <Button
        label="Secundario"
        variant="secondary"
        onPress={() => undefined}
      />
      <Button label="Deshabilitado" disabled onPress={() => undefined} />
      <Button label="Cargando" loading onPress={() => undefined} />
      <LoadingIndicator />
      <Message tone="error">No se pudo completar la acción.</Message>
      <Message tone="warning">Revisa el dato antes de seguir.</Message>
      <EmptyState
        title="Sin elementos"
        message="Todavía no hay nada que mostrar."
      />
      <Button label="Pedir confirmación" onPress={() => setConfirming(true)} />
      {confirmed ? <HelperText>Acción confirmada.</HelperText> : null}
      <View>
        <Button
          label="Inicio"
          variant="secondary"
          accessibilityLabel="Volver al inicio"
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
          }
        />
      </View>
      <ConfirmAction
        visible={confirming}
        title="Confirmar acción"
        message="Esta demostración no cambia la partida."
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          setConfirming(false);
          setConfirmed(true);
        }}
        onCancel={() => setConfirming(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
  },
});
