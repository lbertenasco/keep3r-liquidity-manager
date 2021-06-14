import { Suite, SuiteFunction } from 'mocha';

const then = it;
const given = beforeEach;
const when: SuiteFunction = <SuiteFunction>function (title: string, fn: (this: Suite) => void) {
  context('when ' + title, fn);
};
when.only = (title: string, fn?: (this: Suite) => void) => context.only('when ' + title, fn!);
when.skip = (title: string, fn: (this: Suite) => void) => context.skip('when ' + title, fn);

export default {
  given,
  when,
  then,
};
