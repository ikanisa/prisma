import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { summaryConfig } from '../config.js';

function normaliseBaseName(name) {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'performance';
}

export function createSummaryHandler(defaultName) {
  return (data) => {
    const { dir, baseName, format } = summaryConfig(defaultName);
    const safeName = normaliseBaseName(baseName);
    const outputs = {
      stdout: textSummary(data, { indent: ' ', enableColors: true }),
      [`${dir}/${safeName}.json`]: JSON.stringify(data, null, 2),
    };

    if (format !== 'json' && format !== 'ci') {
      outputs[`${dir}/${safeName}.html`] = htmlReport(data);
    }

    return outputs;
  };
}
