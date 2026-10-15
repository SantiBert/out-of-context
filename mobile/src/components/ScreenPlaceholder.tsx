import { View } from 'react-native';

import { useAppNavigation } from '../hooks/useAppNavigation';
import { homeRoute, type AppRoute } from '../navigation/routes';
import { Button } from './Button';
import { screenStyles } from './screenStyles';
import { Heading } from './Heading';
import { HelperText } from './HelperText';

type ScreenPlaceholderProps = {
  title: string;
  subtitle?: string;
  next?: AppRoute;
  extra?: { label: string; route: AppRoute };
};

export function ScreenPlaceholder({
  title,
  subtitle,
  next,
  extra,
}: ScreenPlaceholderProps) {
  const navigation = useAppNavigation();

  return (
    <View style={screenStyles.container}>
      <Heading>{title}</Heading>
      {subtitle ? <HelperText>{subtitle}</HelperText> : null}
      {next ? (
        <Button label="Continuar" onPress={() => navigation.navigate(next)} />
      ) : null}
      {extra ? (
        <Button
          label={extra.label}
          variant="secondary"
          onPress={() => navigation.navigate(extra.route)}
        />
      ) : null}
      {title === 'Inicio' ? null : (
        <Button
          label="Inicio"
          variant="secondary"
          accessibilityLabel="Volver al inicio"
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
          }
        />
      )}
    </View>
  );
}
