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

module.exports = { renderLogoPng };
