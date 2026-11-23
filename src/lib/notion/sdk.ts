/**
 * @notionhq/client es un paquete CommonJS sin mapa de exports, y Astro/Vite no puede
 * importar sus valores con nombre. Se importa por defecto aquí, una sola vez; el resto del
 * código toma los valores de este módulo (los TIPOS se siguen importando de '@notionhq/client').
 */
import notion from '@notionhq/client';

export const { Client, collectPaginatedAPI, isFullPage, isFullBlock } = notion;
