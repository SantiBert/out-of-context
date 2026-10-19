import catalog from '../../../../../backend/cards.json';

export type CatalogSituation = {
  number: number;
  text: string;
};

export function localCatalogSituations(): CatalogSituation[] {
  return catalog.cards.map((card) => ({
    number: card.number,
    text: card.description,
  }));
}
