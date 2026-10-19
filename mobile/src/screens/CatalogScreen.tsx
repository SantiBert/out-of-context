import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '../components/BrandLogo';
import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/Button';
import { ConfirmAction } from '../components/ConfirmAction';
import { ContentCard } from '../components/ContentCard';
import { EmptyState } from '../components/EmptyState';
import { Heading } from '../components/Heading';
import { HelperText } from '../components/HelperText';
import { HomeButton } from '../components/HomeButton';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { Message } from '../components/Message';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { ScreenHeader } from '../components/ScreenHeader';
import { SelectableOption } from '../components/SelectableOption';
import { StatusBadge } from '../components/StatusBadge';
import { TextField } from '../components/TextField';
import { listMissingBrandAssets } from '../theme/brandAssets';
import { brand, theme } from '../theme/theme';

const brandSwatches: { name: string; value: string }[] = [
  { name: 'mint', value: brand.mint },
  { name: 'navy', value: brand.navy },
  { name: 'cream', value: brand.cream },
  { name: 'yellow', value: brand.yellow },
  { name: 'coral', value: brand.coral },
  { name: 'turquoise', value: brand.turquoise },
  { name: 'lilac', value: brand.lilac },
  { name: 'pink', value: brand.pink },
  { name: 'navyDark', value: brand.navyDark },
  { name: 'white', value: brand.white },
];

export function CatalogScreen() {
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmingDanger, setConfirmingDanger] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [selected, setSelected] = useState<'a' | 'b'>('a');

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        title="Design system"
        subtitle="Catálogo interno. No consulta la partida."
      />
      <Heading>Componentes</Heading>
      <HelperText>Banco de prueba visual OOC-020.2 / 020.3.</HelperText>

      <ContentCard>
        <Text style={styles.sectionLabel}>Marca (wordmark / mark)</Text>
        <HelperText>
          {`PNG de marca pendientes: ${listMissingBrandAssets().length}. Puente tipográfico Baloo.`}
        </HelperText>
        <BrandLogo size="md" variant="light" />
        <View style={styles.darkPreview}>
          <BrandLogo size="sm" variant="dark" />
        </View>
        <View style={styles.markRow}>
          <BrandMark size="sm" variant="light" />
          <BrandMark size="md" variant="light" />
          <BrandMark size="lg" variant="dark" />
        </View>
      </ContentCard>

      <ContentCard>
        <Text style={styles.sectionLabel}>Paleta de marca</Text>
        <View style={styles.swatchRow}>
          {brandSwatches.map((swatch) => (
            <View key={swatch.name} style={styles.swatchItem}>
              <View
                style={[styles.swatch, { backgroundColor: swatch.value }]}
              />
              <Text style={styles.swatchName}>{swatch.name}</Text>
            </View>
          ))}
        </View>
      </ContentCard>

      <ContentCard>
        <Text style={styles.sectionLabel}>Tipografía</Text>
        <Text style={styles.headingSample}>Baloo 2 — títulos</Text>
        <Text style={styles.bodySample}>
          Sistema — cuerpo, etiquetas y ayudas de interfaz.
        </Text>
      </ContentCard>

      <ContentCard>
        <StatusBadge label="Neutral" />
        <StatusBadge label="Listo" tone="success" />
        <StatusBadge label="Aviso" tone="warning" />
        <StatusBadge label="Error" tone="danger" />
      </ContentCard>

      <ProgressIndicator current={2} total={5} label="Progreso de demo" />

      <SelectableOption
        label="Opción A"
        description="Seleccionable"
        selected={selected === 'a'}
        onPress={() => setSelected('a')}
      />
      <SelectableOption
        label="Opción B"
        description="Alternativa"
        selected={selected === 'b'}
        onPress={() => setSelected('b')}
      />
      <SelectableOption
        label="Deshabilitada"
        selected={false}
        disabled
        onPress={() => undefined}
      />

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
      <Button
        label="Destructivo"
        variant="destructive"
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
      <Button
        label="Confirmación destructiva"
        variant="destructive"
        onPress={() => setConfirmingDanger(true)}
      />
      {confirmed ? <HelperText>Acción confirmada.</HelperText> : null}
      <View>
        <HomeButton />
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
      <ConfirmAction
        visible={confirmingDanger}
        title="Acción destructiva"
        message="Demo de confirmación con variante destructiva."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        onConfirm={() => setConfirmingDanger(false)}
        onCancel={() => setConfirmingDanger(false)}
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
  sectionLabel: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  darkPreview: {
    alignSelf: 'stretch',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.radii.card,
    backgroundColor: theme.brand.navyDark,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  swatchItem: {
    width: 72,
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.button,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  swatchName: {
    ...theme.typography.helper,
    fontSize: 11,
    lineHeight: 14,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  headingSample: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  bodySample: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
