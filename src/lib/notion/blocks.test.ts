import { describe, expect, it, vi } from 'vitest';
import { fetchBlockTree, renderBlocks, type RenderCtx } from './blocks';
import { block, fakeClient, paragraph, rt } from './fixtures';

const ctx: RenderCtx = { resolveFile: async (f) => (f.hosted ? '/_notion/local.jpg' : f.url) };
const render = (...nodes: ReturnType<typeof block>[]) => renderBlocks(nodes, ctx);

describe('renderBlocks', () => {
	it('escapa HTML del contenido', async () => {
		const html = await render(paragraph('<script>alert("x")</script> & más'));
		expect(html).toBe('<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; más</p>');
	});

	it('omite párrafos vacíos', async () => {
		expect(await render(paragraph(''))).toBe('');
	});

	it('baja un nivel los encabezados y agrega ancla', async () => {
		const html = await render(
			block('heading_1', { rich_text: rt('Dinámica del evento') }),
			block('heading_2', { rich_text: rt('Cifras') }),
			block('heading_3', { rich_text: rt('Detalle') }),
		);
		expect(html).toBe('<h2 id="dinamica-del-evento">Dinámica del evento</h2><h3 id="cifras">Cifras</h3><h4 id="detalle">Detalle</h4>');
	});

	it('agrupa viñetas consecutivas y separa listas numeradas', async () => {
		const html = await render(
			block('bulleted_list_item', { rich_text: rt('uno') }),
			block('bulleted_list_item', { rich_text: rt('dos') }),
			block('numbered_list_item', { rich_text: rt('a') }),
		);
		expect(html).toBe('<ul><li>uno</li><li>dos</li></ul><ol><li>a</li></ol>');
	});

	it('anida hijos dentro del ítem de lista', async () => {
		const item = block('bulleted_list_item', { rich_text: rt('padre') }, {
			has_children: true,
			children: [block('bulleted_list_item', { rich_text: rt('hijo') })],
		});
		expect(await render(item)).toBe('<ul><li>padre<ul><li>hijo</li></ul></li></ul>');
	});

	it('aplica estilos y enlaces seguros; descarta javascript: y notion.so', async () => {
		const html = await render(
			block('paragraph', {
				rich_text: [
					...rt('negrita', { bold: true }),
					...rt(' sitio', {}, 'https://lead.pe'),
					...rt(' malo', {}, 'javascript:alert(1)'),
					...rt(' interno', {}, 'https://www.notion.so/privada'),
				],
			}),
		);
		expect(html).toBe(
			'<p><strong>negrita</strong><a href="https://lead.pe/" rel="noopener noreferrer"> sitio</a> malo interno</p>',
		);
	});

	it('descarga imágenes subidas a Notion y deja las externas', async () => {
		const spy = vi.fn(ctx.resolveFile);
		const html = await renderBlocks(
			[
				block('image', { type: 'file', file: { url: 'https://s3/x/foto.jpg?sig=1', expiry_time: 'x' }, caption: rt('Final del concurso') }),
				block('image', { type: 'external', external: { url: 'https://cdn.lead.pe/a.png' }, caption: [] }),
			],
			{ resolveFile: spy },
		);
		expect(spy).toHaveBeenCalledTimes(2);
		expect(html).toContain('<img src="/_notion/local.jpg" alt="Final del concurso"');
		expect(html).toContain('<figcaption>Final del concurso</figcaption>');
		expect(html).toContain('<img src="https://cdn.lead.pe/a.png" alt=""');
	});

	it('renderiza callout, cita, toggle, código y separador', async () => {
		const html = await render(
			block('callout', { rich_text: rt('Ojo'), icon: { type: 'emoji', emoji: '💡' }, color: 'yellow_background' }),
			block('quote', { rich_text: rt('Frase') }),
			block('toggle', { rich_text: rt('Más') }, { has_children: true, children: [paragraph('oculto')] }),
			block('code', { rich_text: rt('a < b'), language: 'typescript' }),
			block('divider', {}),
		);
		expect(html).toContain('<aside class="callout nt-yellow_background"><span class="callout-icon">💡</span>');
		expect(html).toContain('<blockquote>Frase</blockquote>');
		expect(html).toContain('<details><summary>Más</summary><p>oculto</p></details>');
		expect(html).toContain('<pre><code class="language-typescript">a &lt; b</code></pre>');
		expect(html).toContain('<hr>');
	});

	it('renderiza tablas con encabezado', async () => {
		const html = await render(
			block('table', { has_column_header: true, has_row_header: false }, {
				has_children: true,
				children: [
					block('table_row', { cells: [rt('Premio'), rt('Ganador')] }),
					block('table_row', { cells: [rt('1.º'), rt('Equipo A')] }),
				],
			}),
		);
		expect(html).toBe('<div class="table-wrap"><table><tr><th>Premio</th><th>Ganador</th></tr><tr><td>1.º</td><td>Equipo A</td></tr></table></div>');
	});

	it('ignora bloques no soportados', async () => {
		expect(await render(block('table_of_contents', {}), block('child_page', { title: 'x' }))).toBe('');
	});
});

describe('fetchBlockTree', () => {
	it('baja el árbol completo siguiendo has_children', async () => {
		const parent = { ...block('toggle', { rich_text: rt('t') }), id: 'p1', has_children: true };
		const child = { ...paragraph('hijo'), id: 'c1' };
		const client = fakeClient([], { page: [parent as never], p1: [child as never] });
		const tree = await fetchBlockTree(client, 'page');
		expect(tree).toHaveLength(1);
		expect(tree[0]?.children?.[0]?.id).toBe('c1');
	});
});
