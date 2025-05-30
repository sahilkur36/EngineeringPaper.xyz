import { test, expect } from '@playwright/test';

import { precision, loadPyodide, newSheet, parseLatexFloat } from './utility.mjs';

let page;

// loading pyodide takes a long time (especially in resource constrained CI environments)
// load page once and use for all tests in this file
test.beforeAll(async ({ browser }) => {page = await loadPyodide(browser, page);} );

// give each test a blank sheet to start with (this doesn't reload pyodide)
test.beforeEach(async () => {await newSheet(page)});


test('Test autosave checkpoints', async ({ browserName }) => {
  while (!page.url().includes('temp-checkpoint')) {
    await page.waitForTimeout(200);
  }

  // Change title
  await page.getByRole('heading', { name: 'New Sheet' }).click({ clickCount: 3 });
  await page.type('text=New Sheet', 'New Title');

  await page.setLatex(0, '1=');

  let previousUrl = page.url();

  // wait until checkpoint is saved
  while (page.url() === previousUrl) {
    await page.waitForTimeout(200);
  }
  previousUrl = page.url();

  await page.setLatex(0, '2=');


  // wait until checkpoint is saved
  while (page.url() === previousUrl) {
    await page.waitForTimeout(200);
  }
  previousUrl = page.url();


  await page.click('#add-documentation-cell');
  await page.type('div.editor div', `Checkpoint 3`);

  // wait until checkpoint is saved
  while (page.url() === previousUrl) {
    await page.waitForTimeout(200);
  }
  previousUrl = page.url();


  // will create a new sheet to clear contents
  // will first dismiss creating new sheet and make sure everything stays the same
  page.once('dialog', dialog => {
    dialog.dismiss();
  });
  await page.locator('#new-sheet').click();
  await page.locator('text=Checkpoint 3').waitFor();

  // will create a new sheet to clear contents
  // now accept new sheet and make sure everything is gone
  page.once('dialog', dialog => {
    dialog.accept();
  });
  await page.locator('#new-sheet').click();
  await page.locator('text=Checkpoint 3').waitFor({state: 'detached'});

  await page.waitForTimeout(500);
  await page.goBack();
  await page.locator('text=Checkpoint 3').waitFor();

  await page.waitForTimeout(500);
  await page.goBack(); // need to go back twice since cancelled new sheet adds additional page to history
  await page.locator('text=Checkpoint 3').waitFor();

  await page.waitForTimeout(500);
  await page.goBack(); // now we'll hit checkpoint 2
  await page.locator('text=Checkpoint 3').waitFor({state: 'detached'});
  await page.waitForSelector('.status-footer', { state: 'detached' });
  let content = await page.locator('#result-value-0').textContent();
  expect(parseLatexFloat(content)).toBeCloseTo(2, precision);

  await page.waitForTimeout(500);
  await page.goBack();
  await page.locator('text=New Title').waitFor();
  await page.waitForSelector('.status-footer', { state: 'detached' });
  content = await page.locator('#result-value-0').textContent();
  expect(parseLatexFloat(content)).toBeCloseTo(1, precision);

  await page.waitForTimeout(500);
  await page.goBack();
  await page.getByRole('heading', { name: 'New Sheet' }).waitFor();
  
});