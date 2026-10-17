// The question chapters of «الفلك المشحون في علم الرمل المصون», gathered
// from their files and grouped by field for the two dropdowns.
// AGPL-3.0-or-later.

import { BookRule, RAML_FIELDS, RamlField } from './ramlKit';
import { RULES_1 } from './ramlRules1';
import { RULES_2 } from './ramlRules2';
import { RULES_3 } from './ramlRules3';
import { RULES_4 } from './ramlRules4';
import { RULES_5 } from './ramlRules5';

export const BOOK_RULES: BookRule[] = [
  ...RULES_1,
  ...RULES_2,
  ...RULES_3,
  ...RULES_4,
  ...RULES_5,
];

/** The fields that have at least one question, in the fixed order. */
export const BOOK_FIELDS: RamlField[] = RAML_FIELDS.filter(f =>
  BOOK_RULES.some(r => r.field === f),
);

export const rulesOf = (field: RamlField) =>
  BOOK_RULES.filter(r => r.field === field);
