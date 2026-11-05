const { Resvg } = require('@resvg/resvg-js');
const { buildLogoSvg, fontFiles, LOGO_WIDTH } = require('./logoDraw');

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

module.exports = { renderLogoPng, renderLogoHeaderPng };
