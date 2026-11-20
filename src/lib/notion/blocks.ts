import type { BlockObjectResponse, RichTextItemResponse } from '@notionhq/client';
import type { FileRef } from './assets';
import type { ImageRef } from './images';
import type { NotionLike } from './query';
import { collectPaginatedAPI, isFullBlock } from './sdk';
import { escapeHtml as esc, safeHref, slugify } from './util';

export type BlockNode = BlockObjectResponse & { children?: BlockNode[] };

export interface RenderCtx {
	/** Convierte un archivo de Notion en una URL pública (descargándolo si hace falta). */
	resolveFile(file: FileRef): Promise<string>;
	/** Si está, las imágenes del texto se optimizan (WebP + srcset + ancho/alto). */
	resolveImage?(file: FileRef, alt: string): Promise<ImageRef>;
	warn?(message: string): void;
}

const MAX_DEPTH = 5;
const NO_CHILDREN = new Set(['child_page', 'child_database']);

/** Descarga el cuerpo de una página de Notion como árbol de bloques (con hijos). */
export async function fetchBlockTree(client: NotionLike, blockId: string, depth = 0): Promise<BlockNode[]> {
	const raw = await collectPaginatedAPI(client.blocks.children.list, { block_id: blockId });
	const nodes: BlockNode[] = [];
	for (const block of raw) {
		if (!isFullBlock(block)) continue;
		const node: BlockNode = { ...block };
		if (block.has_children && !NO_CHILDREN.has(block.type) && depth < MAX_DEPTH) {
			node.children = await fetchBlockTree(client, block.id, depth + 1);
		}
		nodes.push(node);
	}
	return nodes;
}

// ---------- Texto enriquecido ----------

function richText(items: RichTextItemResponse[]): string {
	return items
		.map((item) => {
			let html = esc(item.plain_text).replace(/\n/g, '<br>');
			const a = item.annotations;
			if (a.code) html = `<code>${html}</code>`;
			if (a.bold) html = `<strong>${html}</strong>`;
			if (a.italic) html = `<em>${html}</em>`;
			if (a.strikethrough) html = `<s>${html}</s>`;
			if (a.underline) html = `<u>${html}</u>`;
			if (a.color !== 'default') html = `<span class="nt-${a.color.replace(/[^a-z_]/g, '')}">${html}</span>`;
			const href = safeHref(item.href);
			if (href) html = `<a href="${esc(href)}" rel="noopener noreferrer">${html}</a>`;
			return html;
		})
		.join('');
}

const plainText = (items: RichTextItemResponse[]): string => items.map((i) => i.plain_text).join('');

// ---------- Bloques ----------

export async function renderBlocks(nodes: BlockNode[], ctx: RenderCtx): Promise<string> {
	let html = '';
	let i = 0;
	while (i < nodes.length) {
		const node = nodes[i]!;
		if (node.type === 'bulleted_list_item' || node.type === 'numbered_list_item' || node.type === 'to_do') {
			const type = node.type;
			let items = '';
			while (i < nodes.length && nodes[i]!.type === type) {
				items += await renderListItem(nodes[i]!, ctx);
				i++;
			}
			const tag = type === 'numbered_list_item' ? 'ol' : 'ul';
			html += `<${tag}${type === 'to_do' ? ' class="todo"' : ''}>${items}</${tag}>`;
			continue;
		}
		html += await renderBlock(node, ctx);
		i++;
	}
	return html;
}

async function children(node: BlockNode, ctx: RenderCtx): Promise<string> {
	return node.children?.length ? renderBlocks(node.children, ctx) : '';
}

async function renderListItem(node: BlockNode, ctx: RenderCtx): Promise<string> {
	const kids = await children(node, ctx);
	if (node.type === 'to_do') {
		const checked = node.to_do.checked ? ' checked' : '';
		return `<li><input type="checkbox" disabled${checked}> ${richText(node.to_do.rich_text)}${kids}</li>`;
	}
	if (node.type === 'bulleted_list_item') return `<li>${richText(node.bulleted_list_item.rich_text)}${kids}</li>`;
	if (node.type === 'numbered_list_item') return `<li>${richText(node.numbered_list_item.rich_text)}${kids}</li>`;
	return '';
}

function heading(level: 2 | 3 | 4, items: RichTextItemResponse[]): string {
	const id = slugify(plainText(items), 60);
	return `<h${level}${id ? ` id="${id}"` : ''}>${richText(items)}</h${level}>`;
}

async function renderBlock(node: BlockNode, ctx: RenderCtx): Promise<string> {
	switch (node.type) {
		case 'paragraph': {
			const text = richText(node.paragraph.rich_text);
			const kids = await children(node, ctx);
			return text || kids ? `${text ? `<p>${text}</p>` : ''}${kids}` : '';
		}
		// La página ya tiene su <h1> (el título): los encabezados de Notion bajan un nivel.
		case 'heading_1':
			return heading(2, node.heading_1.rich_text);
		case 'heading_2':
			return heading(3, node.heading_2.rich_text);
		case 'heading_3':
			return heading(4, node.heading_3.rich_text);
		case 'quote':
			return `<blockquote>${richText(node.quote.rich_text)}${await children(node, ctx)}</blockquote>`;
		case 'callout': {
			const icon = node.callout.icon?.type === 'emoji' ? node.callout.icon.emoji : '';
			const color = node.callout.color.replace(/[^a-z_]/g, '');
			return (
				`<aside class="callout nt-${color}">` +
				(icon ? `<span class="callout-icon">${esc(icon)}</span>` : '') +
				`<div class="callout-body">${richText(node.callout.rich_text)}${await children(node, ctx)}</div></aside>`
			);
		}
		case 'toggle':
			return `<details><summary>${richText(node.toggle.rich_text)}</summary>${await children(node, ctx)}</details>`;
		case 'divider':
			return '<hr>';
		case 'code': {
			const lang = node.code.language.replace(/[^a-z0-9+#-]/gi, '').toLowerCase();
			return `<pre><code class="language-${lang}">${esc(plainText(node.code.rich_text))}</code></pre>`;
		}
		case 'equation':
			return `<pre class="equation">${esc(node.equation.expression)}</pre>`;
		case 'image': {
			const img = node.image;
			const file: FileRef =
				img.type === 'file' ? { url: img.file.url, hosted: true } : { url: img.external.url, hosted: false };
			const caption = richText(img.caption);
			const altText = plainText(img.caption);
			// El pie de foto hace de texto alternativo: sin él, la imagen queda sin describir.
			if (!altText) ctx.warn?.('una imagen del texto no tiene pie de foto (se usa como texto alternativo).');
			const ref: ImageRef = ctx.resolveImage
				? await ctx.resolveImage(file, altText)
				: { src: await ctx.resolveFile(file), alt: altText, width: null, height: null, srcset: '' };
			const attrs =
				`src="${esc(ref.src)}" alt="${esc(altText)}"` +
				(ref.srcset ? ` srcset="${esc(ref.srcset)}" sizes="(min-width: 44rem) 42rem, 100vw"` : '') +
				(ref.width && ref.height ? ` width="${ref.width}" height="${ref.height}"` : '');
			return (
				`<figure><img ${attrs} loading="lazy" decoding="async">` +
				(caption ? `<figcaption>${caption}</figcaption>` : '') +
				'</figure>'
			);
		}
		case 'file':
		case 'pdf': {
			const f = node.type === 'file' ? node.file : node.pdf;
			const src = await ctx.resolveFile(
				f.type === 'file' ? { url: f.file.url, hosted: true } : { url: f.external.url, hosted: false },
			);
			const label = plainText(f.caption) || ('name' in f && typeof f.name === 'string' ? f.name : '') || 'Descargar archivo';
			return `<p class="file"><a href="${esc(src)}" rel="noopener noreferrer">${esc(label)}</a></p>`;
		}
		case 'video': {
			// Los videos subidos a Notion no se descargan (pesan mucho); solo se enlazan los externos.
			if (node.video.type !== 'external') return '';
			return link(node.video.external.url, plainText(node.video.caption) || 'Ver video');
		}
		case 'embed':
			return link(node.embed.url, plainText(node.embed.caption) || node.embed.url);
		case 'bookmark':
			return link(node.bookmark.url, plainText(node.bookmark.caption) || node.bookmark.url);
		case 'link_preview':
			return link(node.link_preview.url, node.link_preview.url);
		case 'table':
			return renderTable(node);
		case 'column_list':
			return `<div class="columns">${await children(node, ctx)}</div>`;
		case 'column':
			return `<div class="column">${await children(node, ctx)}</div>`;
		case 'synced_block':
			return children(node, ctx);
		default:
			// table_of_contents, breadcrumb, child_page, child_database, unsupported, etc.
			return '';
	}
}

function link(rawUrl: string, label: string): string {
	const href = safeHref(rawUrl);
	return href ? `<p class="link"><a href="${esc(href)}" rel="noopener noreferrer">${esc(label)}</a></p>` : '';
}

function renderTable(node: BlockNode): string {
	if (node.type !== 'table') return '';
	const rows = (node.children ?? []).filter((c) => c.type === 'table_row');
	const body = rows
		.map((row, rowIndex) => {
			if (row.type !== 'table_row') return '';
			const cells = row.table_row.cells
				.map((cell, colIndex) => {
					const isHeader =
						(node.table.has_column_header && rowIndex === 0) || (node.table.has_row_header && colIndex === 0);
					const tag = isHeader ? 'th' : 'td';
					return `<${tag}>${richText(cell)}</${tag}>`;
				})
				.join('');
			return `<tr>${cells}</tr>`;
		})
		.join('');
	return `<div class="table-wrap"><table>${body}</table></div>`;
}
