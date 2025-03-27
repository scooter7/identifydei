// next.config.js
module.exports = {
  webpack: (config) => {
    config.externals.push({
      'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.entry',
    });

    return config;
  },
};
