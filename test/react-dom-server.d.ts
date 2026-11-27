// The render test needs one function from react-dom, which ships no types of its own.
declare module 'react-dom/server' {
  export function renderToStaticMarkup(element: unknown): string
}
