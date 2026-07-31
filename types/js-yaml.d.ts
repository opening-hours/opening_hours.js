/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'js-yaml' {
  const yaml: {
    load(content: string): any;
  };
  export default yaml;
}
