import { Button } from './Button';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { homeRoute } from '../navigation/routes';

export const homeButtonLabel = 'Inicio';
export const homeButtonAccessibilityLabel = 'Volver al inicio';

type HomeButtonProps = {
  disabled?: boolean;
};

export function HomeButton({ disabled = false }: HomeButtonProps) {
  const navigation = useAppNavigation();

  return (
    <Button
      label={homeButtonLabel}
      variant="secondary"
      accessibilityLabel={homeButtonAccessibilityLabel}
      disabled={disabled}
      onPress={() =>
        navigation.reset({ index: 0, routes: [{ name: homeRoute }] })
      }
    />
  );
}
