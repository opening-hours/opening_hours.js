/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'yargs' {
  const yargs: any;
  export = yargs;
}

declare module 'yargs/yargs' {
  const yargs: any;
  export = yargs;
}

declare module 'yargs/helpers' {
  export function hideBin(argv: readonly string[]): string[];
}
