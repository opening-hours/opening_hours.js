declare module '*.yaml' {
  const resources: Record<string, Record<string, Record<string, string>>>;
  export default resources;
}
