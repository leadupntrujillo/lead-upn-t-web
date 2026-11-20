import { describe, expect, it } from 'vitest';
import { anchoBase, anchosPara } from './images';

describe('anchos de imagen', () => {
	it('genera 480/960/1600 sin agrandar fotos pequeñas', () => {
		expect(anchosPara(4000)).toEqual([480, 960, 1600]);
		expect(anchosPara(1200)).toEqual([480, 960, 1200]);
		expect(anchosPara(300)).toEqual([300]);
	});

	it('el src por defecto es el de 960 o el mayor disponible por debajo', () => {
		expect(anchoBase([480, 960, 1600])).toBe(960);
		expect(anchoBase([480, 700])).toBe(700);
		expect(anchoBase([300])).toBe(300);
	});
});
