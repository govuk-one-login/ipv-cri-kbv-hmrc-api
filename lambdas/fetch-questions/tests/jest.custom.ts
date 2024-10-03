declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(a: number, b: number): R;
    }
    interface Expect {
      toBeWithinRange(a: number, b: number): any;
    }

    interface InverseAsymmetricMatchers {
      toBeWithinRange(a: number, b: number): any;
    }
  }
}

export function toBeWithinRange(value: number, lower: number, top: number) {
  const pass: boolean = value >= lower && value <= top;
  if (pass) {
    return {
      message: () => `expected ${value} not within range ${lower} to ${top}`,
      pass: true,
    };
  } else {
    return {
      message: () => `expected ${value} not within range ${lower} to ${top}`,
      pass: false,
    };
  }
}

expect.extend({ toBeWithinRange });
