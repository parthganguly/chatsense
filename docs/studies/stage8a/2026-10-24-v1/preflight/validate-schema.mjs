/* global console */
// Blank/private-form structure only. Never read completed human records here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import Ajv from 'ajv'; // Existing repository dependency; no dependency added.
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'materials');
const schema = JSON.parse(fs.readFileSync(path.join(dir, 'response.schema.json'), 'utf8'));
const blank = JSON.parse(fs.readFileSync(path.join(dir, 'BLANK-RESPONSE.json'), 'utf8'));
assert.equal(blank.form_state, 'BLANK_TEMPLATE');
const validate = new Ajv({ allErrors: true }).compile(schema);
assert.ok(validate(blank), JSON.stringify(validate.errors));
for (const value of [0, 6, 3.5, true, '4']) {
  const bad = JSON.parse(JSON.stringify(blank));
  bad.cards[0].usefulness.value = value;
  assert.equal(validate(bad), false, `Invalid input accepted: ${value}`);
}
let bad = JSON.parse(JSON.stringify(blank));
bad.cards[4].card_id = 'A';
assert.equal(validate(bad), false, 'Duplicate A / missing E accepted');
bad = JSON.parse(JSON.stringify(blank));
bad.independent_reviews[0].cards.A.motive.label = 'PROMISE';
assert.equal(validate(bad), false, 'History label in motive domain accepted');
bad = JSON.parse(JSON.stringify(blank));
bad.independent_reviews[0].cards.A.history.label = 'NO_PROMISE';
assert.equal(validate(bad), false, 'Non-D history label accepted');
assert.deepEqual(blank.cards.map(c => c.card_id), ['A', 'B', 'C', 'D', 'E']);
assert.ok(blank.cards.every(c => c.tell.verbatim === null && c.reply_check.verbatim === null));
console.log('Draft-07 schema and blank form valid; five invalid ratings, duplicate card, wrong-domain code and non-D history controls rejected.');
