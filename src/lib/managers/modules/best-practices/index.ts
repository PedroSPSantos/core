/**
 * 
 */
'use strict';

import { BestPracticesReport } from '@qualweb/best-practices';
import { Page } from 'puppeteer';

import mapping from './best-practices/mapping.json';

import { bestPractices } from './best-practices';

async function executeBP(bestPractice: string, selector: string, page: Page, report: BestPracticesReport): Promise<void> {
  const elements = await page.$$(selector);
      
  if (elements.length > 0) {
    for (const elem of elements || []) {
      await bestPractices[bestPractice].execute(elem, page);
      await elem.dispose();
    }
  } else {
    await bestPractices[bestPractice].execute(undefined, page);
  }
  report['best-practices'][bestPractice] = bestPractices[bestPractice].getFinalResults();
  report.metadata[report['best-practices'][bestPractice].metadata.outcome]++;
  bestPractices[bestPractice].reset();
}

async function executeBestPractices(page: Page): Promise<BestPracticesReport> {
  const report: BestPracticesReport = {
    type: 'best-practices',
    metadata: {
      passed: 0,
      warning: 0,
      failed: 0,
      inapplicable: 0
    },
    'best-practices': {}
  };

  const promises = new Array<any>();

  for (const selector of Object.keys(mapping) || []) {
    for (const bestPractice of mapping[selector] || []) {
      promises.push(executeBP(bestPractice, selector, page, report));
    }
  }

  await Promise.all(promises);

  return report;
}

export { executeBestPractices };