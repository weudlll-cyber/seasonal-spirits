// Seasonal Spirits — the price board in the band (V5, owner decision 2026-11-16): the four
// seasons in their order, each in its colour with what one of its coins is worth now, the
// season in season highlighted. The prices are not sent: they follow from the season the
// server sends and the game config, through the core's own priceOf.

import { DEFAULT_CONFIG, SEASONS, priceOf } from '@seasonal-spirits/game-core';
import { seasonColour, seasonName, value } from '@seasonal-spirits/render';
import { el } from './hud.js';

export class PriceBoard {
  private readonly root = el('prices');
  private readonly chips: HTMLElement[];
  private shown: number | null = null; // the season the chips show

  constructor() {
    this.chips = SEASONS.map((_, i) => {
      const chip = document.createElement('span');
      chip.className = 'price';
      chip.style.color = seasonColour(i);
      return chip;
    });
    this.root.append(...this.chips);
  }

  // Called every frame with the season in season (null before the first state).
  update(season: number | null): void {
    this.root.hidden = season === null;
    if (season === null || season === this.shown) return;
    this.shown = season;
    const current = SEASONS[season & 3] ?? 'spring';
    this.chips.forEach((chip, i) => {
      const coin = SEASONS[i] ?? 'spring';
      chip.textContent = `${seasonName(i)} ${value(priceOf(DEFAULT_CONFIG, coin, current))}`;
      chip.classList.toggle('now', i === season);
    });
  }
}
