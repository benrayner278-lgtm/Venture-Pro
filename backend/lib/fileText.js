// Works out what kind of file the owner attached, and gets its text when Claude cannot read the file directly.
// Photos and PDFs are passed to Claude as they are. Word, Excel, PowerPoint and plain text files are turned into text.
const mammoth = require('mammoth');
const JSZip = require('jszip');
const XLSX = require('xlsx');

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const TEXT_LIMIT = 40000;
const SHEET_EXTENSIONS = new Set(['xlsx', 'xlsm', 'xls', 'ods']);

const extensionOf = (name) => (String(name).split('.').pop() || '').toLowerCase();

const decodeXml = (value) =>
  value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// Returns the file as { kind, text } or { kind: 'image' | 'pdf' } for files Claude reads directly.
// Throws an error with a message the owner can read when the file cannot be read.
const readFile = async (file) => {
  const ext = extensionOf(file.name);
  const buffer = Buffer.from(file.data, 'base64');
  if (IMAGE_TYPES.has(file.type)) return { kind: 'image' };
  if (file.type === 'application/pdf' || ext === 'pdf') return { kind: 'pdf' };

  if (ext === 'docx') {
    const { value } = await mammoth.extractRawText({ buffer });
    return { kind: 'text', text: value };
  }
  if (ext === 'pptx') {
    const zip = await JSZip.loadAsync(buffer);
    const slides = Object.keys(zip.files)
      .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    const parts = [];
    for (const path of slides) {
      const xml = await zip.file(path).async('string');
      const lines = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((match) => decodeXml(match[1]));
      parts.push(`Slide ${parts.length + 1}:\n${lines.join('\n')}`);
    }
    return { kind: 'text', text: parts.join('\n\n') };
  }
  if (SHEET_EXTENSIONS.has(ext)) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const parts = workbook.SheetNames.map((sheet) => `Sheet "${sheet}":\n${XLSX.utils.sheet_to_csv(workbook.Sheets[sheet])}`);
    return { kind: 'text', text: parts.join('\n\n') };
  }
  // Old binary Office files (.doc, .ppt) and other binary formats cannot be read here.
  if (['doc', 'ppt'].includes(ext)) {
    throw Object.assign(new Error(`${file.name}: save it as .docx or .pptx and attach it again`), { expose: true, status: 400 });
  }
  // Anything else is read as text when it looks like text.
  const sample = buffer.subarray(0, 8000);
  if (sample.includes(0)) {
    throw Object.assign(new Error(`${file.name} is a file type the assistant cannot read. Try a photo, PDF, Word, Excel, PowerPoint or text file`), { expose: true, status: 400 });
  }
  return { kind: 'text', text: buffer.toString('utf8') };
};

// Like readFile, but a file that fails to parse gets a message that names it.
const prepareFile = async (file) => {
  try {
    const result = await readFile(file);
    return result.text === undefined ? result : { ...result, text: result.text.slice(0, TEXT_LIMIT) };
  } catch (error) {
    if (error.expose) throw error;
    throw Object.assign(new Error(`Could not read ${file.name}. Check the file opens normally and attach it again`), { expose: true, status: 400 });
  }
};

module.exports = { prepareFile, TEXT_LIMIT };
