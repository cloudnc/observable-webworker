import { existsSync, readFileSync, writeFileSync } from 'fs';
import { extname } from 'path';

/**
 * This simple script looks for code fences in source file for a syntax that looks like a file reference, optionally with a line number
 * reference. If a file exists at this location it is inserted into the code fence.
 *
 * Example:
 *
 * ```path/to/some/file.ts
 * ```
 *
 * will look for path/to/some/file.ts and if present, read it and insert
 *
 * ```ts
 * // file content will appear hear
 * ```
 *
 * ```path/to/some/file.ts#L10-50
 * ```
 *
 * ```ts
 * // file content (only lines 10 - 50) will appear hear
 * ```
 *
 *
 */

const [proc, thisFile, source, outputFile] = process.argv;

const sourceText = readFileSync(source, 'utf-8');

const output = sourceText.replace(/```([\S]*)$\n([\s\S]*?)\n?```/gm, (substr: string, codeExtension: string) => {
  const matches = codeExtension.match(/\s?(\S+?)((#L(\d+)-L(\d+))|$)/m);

  if (!matches) {
    return substr;
  }

  const [_, filename, __, lineNumbering, startLine, endLine] = matches;

  if (!existsSync(filename)) {
    return substr;
  }

  const extension = extname(filename).slice(1);
  const file = readFileSync(filename, 'utf8');

  let outputCode = file;

  if (lineNumbering) {
    const lines = file.split('\n');

    outputCode = lines.slice(+startLine - 1, +endLine).join('\n');
  }

  return `
\`\`\`${extension}
${outputCode}
\`\`\`
  `;
});

console.log(output);
writeFileSync(outputFile, output);
