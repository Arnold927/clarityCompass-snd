declare module 'html-to-docx' {
  interface HtmlToDocxOptions {
    table?: { row?: { cantSplit?: boolean } };
    header?: boolean;
    footer?: boolean;
  }

  function htmlToDocx(
    html: string,
    options?: any,
    docOptions?: HtmlToDocxOptions
  ): Promise<Buffer | Blob>;

  export default htmlToDocx;
}
