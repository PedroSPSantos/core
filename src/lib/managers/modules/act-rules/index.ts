/**
 *
 */
'use strict';

//import { DomElement } from 'htmlparser2';
import { ACTROptions, ACTRulesReport } from '@qualweb/act-rules';
import {  Html } from '@qualweb/get-dom-puppeteer';
const stew = new(require('stew-select')).Stew();
import { Page } from 'puppeteer';

import mapping from './rules/mapping.json';

import { rules, rulesToExecute } from './rules';

function configure(options: ACTROptions): void {
  if (options.principles) {
    options.principles = options.principles.map(p => (p.charAt(0).toUpperCase() + p.toLowerCase().slice(1)).trim());
  }
  if (options.levels) {
    options.levels = options.levels.map(l => l.toUpperCase().trim());
  }
  if (options.rules) {
    options.rules = options.rules.map(r => {
      return r.toLowerCase().startsWith('qw') ? r.toUpperCase().trim() : r.trim();
    });
  }

  for (const rule of Object.keys(rules) || []) {
    if (options.principles && options.principles.length !== 0) {
      if (options.levels && options.levels.length !== 0) {
        if (!rules[rule].hasPrincipleAndLevels(options.principles, options.levels)) {
          rulesToExecute[rule] = false;
        }
      } else if (!rules[rule].hasPrincipleAndLevels(options.principles, ['A', 'AA', 'AAA'])) {
        rulesToExecute[rule] = false;
      }
    } else if (options.levels && options.levels.length !== 0) {
      if (!rules[rule].hasPrincipleAndLevels(['Perceivable', 'Operable', 'Understandable', 'Robust'], options.levels)) {
        rulesToExecute[rule] = false;
      }
    }
    if (!options.principles && !options.levels) {
      if (options.rules && options.rules.length !== 0) {
        if (!options.rules.includes(rule) && !options.rules.includes(rules[rule].getRuleMapping())) {
          rulesToExecute[rule] = false;
        }
      }
    } else {
      if (options.rules && options.rules.length !== 0) {
        if (options.rules.includes(rule) || options.rules.includes(rules[rule].getRuleMapping())) {
          rulesToExecute[rule] = true;
        }
      }
    }
  }
}

function resetConfiguration(): void {
  for (const rule in rulesToExecute) {
    rulesToExecute[rule] = true;
  }
}

async function executeSourceHtmlMappedRules(report: ACTRulesReport, html: Html, selectors: string[], mappedRules: any): Promise<void> {
  for (const selector of selectors || []) {
    for (const rule of mappedRules[selector] || []) {
      if (rulesToExecute[rule]) {
        const elements = stew.select(html.html.parsed, selector);
        if (elements.length > 0) {
          for (const elem of elements || []) {
            await rules[rule].execute(elem, html);
          }
        } else {
          await rules[rule].execute(undefined, html);
        }
        report.rules[rule] = rules[rule].getFinalResults();
        report.metadata[report.rules[rule].metadata.outcome]++;
        rules[rule].reset();
      }
    }
  }
}

async function executeRule(rule: string, selector: string, page: Page, report: ACTRulesReport): Promise<void> {
  const elements = await page.$$(selector);
  if (elements.length > 0) {
    for (const elem of elements || []) {
      await rules[rule].execute(elem, page);
      await elem.dispose();
    }
  } else {
    await rules[rule].execute(undefined, page);
  }
  report.rules[rule] = rules[rule].getFinalResults();
  report.metadata[report.rules[rule].metadata.outcome]++;
  rules[rule].reset();
}

async function executePageMappedRules(report: ACTRulesReport, page: Page, selectors: string[], mappedRules: any): Promise<void> {
  const promises = new Array<any>();
  for (const selector of selectors || []) {
    for (const rule of mappedRules[selector] || []) {
      if (rulesToExecute[rule]) {
        promises.push(executeRule(rule, selector, page, report));
      }
    }
  }
  await Promise.all(promises);
}

async function executeNotMappedRules(report: ACTRulesReport, stylesheets: any[]): Promise<void> {
  if (rulesToExecute['QW-ACT-R7']) {
    await rules['QW-ACT-R7'].unmappedExecute(stylesheets);
    report.rules['QW-ACT-R7'] = rules['QW-ACT-R7'].getFinalResults();
    report.metadata[report.rules['QW-ACT-R7'].metadata.outcome]++;
    rules['QW-ACT-R7'].reset();
  }
}

async function executeACTR(sourceHtml: Html, page: Page, stylesheets: any[]): Promise<ACTRulesReport> {

  const report: ACTRulesReport = {
    type: 'act-rules',
    metadata: {
      passed: 0,
      warning: 0,
      failed: 0,
      inapplicable: 0
    },
    rules: {}
  };

  await executeSourceHtmlMappedRules(report, sourceHtml, Object.keys(mapping.pre), mapping.pre);
  await executePageMappedRules(report, page, Object.keys(mapping.post), mapping.post);

  await executeNotMappedRules(report, stylesheets);
  
  return report;
}

export {
  configure,
  executeACTR,
  resetConfiguration
};