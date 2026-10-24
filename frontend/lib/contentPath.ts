// Where a piece of text sits in the site content, e.g. ['sections', 0, 'headline'].
export type ContentPath = (string | number)[];

export const getAt = (root: unknown, path: ContentPath): unknown =>
  path.reduce<unknown>((node, key) => (node == null ? undefined : (node as Record<string | number, unknown>)[key]), root);

// Returns a copy of the content with the value at the path replaced. The original is not changed.
export const setAt = <T>(root: T, path: ContentPath, value: unknown): T => {
  if (path.length === 0) return value as T;
  const [key, ...rest] = path;
  const copy = (Array.isArray(root) ? [...root] : { ...(root as object) }) as Record<string | number, unknown>;
  copy[key] = setAt(copy[key], rest, value);
  return copy as T;
};

const SECTION_NAMES: Record<string, string> = {
  hero: 'Hero',
  text: 'Text',
  cards: 'Cards',
  steps: 'Steps',
  gallery: 'Portfolio',
  pricing: 'Pricing',
  faq: 'FAQ',
  contact: 'Contact',
  cta: 'Call to action',
  custom: 'Text',
};

const GROUP_KEYS = ['items', 'paragraphs'];

// A short name for the field, shown above the editor, e.g. "Hero section 1, headline" or "Text section 2, paragraphs 2".
export const describePath = (content: unknown, path: ContentPath): string => {
  const [root, index, ...rest] = path;
  const fieldWords = (keys: ContentPath) => keys.filter((key) => typeof key === 'string' && !GROUP_KEYS.includes(key)).join(' ');
  const position = (keys: ContentPath) => {
    const number = keys.find((key) => typeof key === 'number') as number | undefined;
    return number === undefined ? '' : `${keys.includes('paragraphs') ? 'paragraph' : 'item'} ${number + 1}`;
  };

  if (root === 'sections' && typeof index === 'number') {
    const section = getAt(content, ['sections', index]) as { type?: string } | undefined;
    const name = `${SECTION_NAMES[section?.type ?? ''] ?? 'Section'} section ${index + 1}`;
    return [name, fieldWords(rest), position(rest)].filter(Boolean).join(', ');
  }
  if (root === 'portfolio') return ['Portfolio', position(path), fieldWords(path.slice(1))].filter(Boolean).join(', ');
  if (root === 'contact') return `Contact details, ${String(index)}`;
  if (root === 'footer') return 'Footer note';
  return 'Text';
};
