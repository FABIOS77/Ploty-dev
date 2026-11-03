import {
  err,
  filter,
  filterList,
  flatMapResult,
  groupBy,
  isErr,
  isOk,
  map,
  mapList,
  mapResult,
  ok,
  pipe,
  reduce,
  reduceList,
  unwrapOr,
} from './fp-utils';

describe('Functional Programming Utilities (fp-utils)', () => {
  describe('Result / Either Pattern', () => {
    it('should create an Ok result and identify it correctly', () => {
      const res = ok(42);
      expect(isOk(res)).toBe(true);
      expect(isErr(res)).toBe(false);
      if (isOk(res)) {
        expect(res.value).toBe(42);
      }
    });

    it('should create an Err result and identify it correctly', () => {
      const res = err('Not found');
      expect(isOk(res)).toBe(false);
      expect(isErr(res)).toBe(true);
      if (isErr(res)) {
        expect(res.error).toBe('Not found');
      }
    });

    it('should map Ok values without modifying Err values', () => {
      const success = ok(10);
      const mappedSuccess = mapResult(success, (n) => n * 2);
      expect(unwrapOr(mappedSuccess, 0)).toBe(20);

      const failure = err('Failed');
      const mappedFailure = mapResult(failure, (n: number) => n * 2);
      expect(isErr(mappedFailure)).toBe(true);
      expect(unwrapOr(mappedFailure, 99)).toBe(99);
    });

    it('should flatMap Ok values sequentially', () => {
      const doubleIfEven = (n: number) =>
        n % 2 === 0 ? ok(n * 2) : err('Must be even');

      const evenRes = flatMapResult(ok(4), doubleIfEven);
      expect(isOk(evenRes)).toBe(true);
      expect(unwrapOr(evenRes, 0)).toBe(8);

      const oddRes = flatMapResult(ok(3), doubleIfEven);
      expect(isErr(oddRes)).toBe(true);
    });
  });

  describe('pipe composition', () => {
    it('should compose unary functions from left to right', () => {
      const add5 = (n: number) => n + 5;
      const multiply2 = (n: number) => n * 2;
      const toString = (n: number) => `Result: ${n}`;

      const res = pipe(10, add5, multiply2, toString);
      expect(res).toBe('Result: 30');
    });

    it('should return the initial value if no functions are provided', () => {
      expect(pipe(100)).toBe(100);
    });
  });

  describe('Immutable collection utilities', () => {
    const numbers = Object.freeze([1, 2, 3, 4, 5]);

    it('should map elements immutably', () => {
      const doubled = map((n: number) => n * 2)(numbers);
      expect(doubled).toEqual([2, 4, 6, 8, 10]);
      expect(Object.isFrozen(doubled)).toBe(true);
    });

    it('should map uncurried with mapList', () => {
      const doubled = mapList(numbers, (n) => n * 2);
      expect(doubled).toEqual([2, 4, 6, 8, 10]);
    });

    it('should filter elements immutably', () => {
      const evens = filter((n: number) => n % 2 === 0)(numbers);
      expect(evens).toEqual([2, 4]);
      expect(Object.isFrozen(evens)).toBe(true);
    });

    it('should filter uncurried with filterList', () => {
      const odds = filterList(numbers, (n) => n % 2 !== 0);
      expect(odds).toEqual([1, 3, 5]);
    });

    it('should reduce elements immutably', () => {
      const sum = reduce((acc: number, curr: number) => acc + curr, 0)(numbers);
      expect(sum).toBe(15);
    });

    it('should reduce uncurried with reduceList', () => {
      const sum = reduceList(numbers, (acc, curr) => acc + curr, 10);
      expect(sum).toBe(25);
    });

    it('should groupBy elements and freeze the result', () => {
      const items = [
        { id: 1, type: 'A' },
        { id: 2, type: 'B' },
        { id: 3, type: 'A' },
      ];
      const grouped = groupBy((item: (typeof items)[0]) => item.type)(items);
      expect(grouped['A']).toHaveLength(2);
      expect(grouped['B']).toHaveLength(1);
      expect(Object.isFrozen(grouped)).toBe(true);
      expect(Object.isFrozen(grouped['A'])).toBe(true);
    });
  });
});
