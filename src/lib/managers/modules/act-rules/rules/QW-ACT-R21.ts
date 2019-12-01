'use strict';

import {ElementHandle, Page} from 'puppeteer';
import Rule from './Rule.object';
import {ACTRule, ACTRuleResult} from '@qualweb/act-rules';
import {trim} from 'lodash';
import {AccessibilityTreeUtils, DomUtils} from '../../../util/index';

const rule: ACTRule = {
  name: 'svg element with explicit role has accessible name',
  code: 'QW-ACT-R21',
  mapping: '7d6734',
  description: 'This rule checks that each SVG image element that is explicitly included in the accessibility tree has an accessible name.',
  metadata: {
    target: {
      element: '*'
    },
    'success-criteria': [
      {
        name: '1.1.1',
        level: 'A',
        principle: 'Perceivable ',
        url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html'
      }
    ],
    related: [],
    url: 'https://act-rules.github.io/rules/7d6734',
    passed: 0,
    warning: 0,
    inapplicable: 0,
    failed: 0,
    type: ['ACTRule', 'TestCase'],
    a11yReq: ['WCAG21:language'],
    outcome: '',
    description: ''
  },
  results: new Array<ACTRuleResult>()
};

class QW_ACT_R21 extends Rule {

  constructor() {
    super(rule);
  }

  async execute(element: ElementHandle | undefined,page:Page): Promise<void> {

    const roleList = ["img", "graphics-document", "graphics-symbol"];
    let evaluation: ACTRuleResult = {
      verdict: '',
      description: '',
      resultCode: ''
    };


    if (element === undefined) {
      evaluation.verdict = 'inapplicable';
      evaluation.description = "No svg elements";
      evaluation.resultCode = 'RC1';
      super.addEvaluationResult(evaluation);
    } else {
      let elementsToEvaluate = await element.$$("svg *");
      elementsToEvaluate.push(element);
      for (let elem of elementsToEvaluate) {
        let role = await DomUtils.getElementAttribute(elem, "role");
        let isHidden = await DomUtils.isElementHidden(elem);
        let AName =  await AccessibilityTreeUtils.getAccessibleNameSVG(element,page);

        if (!role || role && roleList.indexOf(role) < 0 || isHidden) {
          evaluation.verdict = 'inapplicable';
          evaluation.description = "No svg elements with this specifique roles in the accessibility tree";
          evaluation.resultCode = 'RC2';
        } else if (AName && trim(AName) !== "") {
          evaluation.verdict = 'passed';
          evaluation.description = "This element has an accessible name";
          evaluation.resultCode = 'RC3';
        } else {
          evaluation.verdict = 'failed';
          evaluation.description = "This element doesnt have an accessible name";
          evaluation.resultCode = 'RC4';
        }
        evaluation.htmlCode = await DomUtils.getElementHtmlCode(element);
        evaluation.pointer = await DomUtils.getElementSelector(element);
        super.addEvaluationResult(evaluation);

        evaluation.verdict = '';
        evaluation.description = "";
        evaluation.resultCode = '';
      }
    }


  }
}

export = QW_ACT_R21;