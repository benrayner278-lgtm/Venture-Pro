const { Resvg } = require('@resvg/resvg-js');
const { buildLogoSvg, buildMarkSvg, fontFiles, LOGO_WIDTH } = require('./logoDraw');
const { cleanLogo } = require('./logoSpec');

let files;

// Draws the logo as a PNG with only the bundled fonts, so the result does not depend on the server's installed fonts.
const renderLogoPng = (settings) => {
  files = files || fontFiles();
  const svg = buildLogoSvg(settings);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: LOGO_WIDTH },
    font: { fontFiles: files, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  });
  return resvg.render().asPng();
};

// A small, tight PNG of the logo for the site header. It uses the same bundled fonts as the builder.
const headerCache = new Map();
const renderLogoHeaderPng = (settings) => {
  const key = JSON.stringify(settings);
  if (headerCache.has(key)) return headerCache.get(key);
  files = files || fontFiles();
  const svg = buildLogoSvg(settings, { header: true });
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 480 },
    font: { fontFiles: files, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  })
    .render()
    .asPng();
  if (headerCache.size > 300) headerCache.clear();
  headerCache.set(key, png);
  return png;
};

// The browser tab icon for a site: the logo's mark as a small PNG, in a <link> tag. Returns '' when there is no mark.
const faviconCache = new Map();
const faviconLink = (logo) => {
  if (!logo || typeof logo !== 'object') return '';
  try {
    const spec = cleanLogo(logo);
    const key = JSON.stringify(spec);
    if (!faviconCache.has(key)) {
      const svg = buildMarkSvg(spec);
      const png = svg ? new Resvg(svg, { fitTo: { mode: 'width', value: 64 } }).render().asPng().toString('base64') : null;
      if (faviconCache.size > 300) faviconCache.clear();
      faviconCache.set(key, png);
    }
    const png = faviconCache.get(key);
    return png ? `<link rel="icon" type="image/png" href="data:image/png;base64,${png}">` : '';
  } catch (error) {
    console.error('Tab icon error:', error);
    return '';
  }
};

module.exports = { renderLogoPng, renderLogoHeaderPng, faviconLink };
