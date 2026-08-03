const ts = require('typescript');
const fs = require('fs');

const fileName = 'app/(admin)/campaigns/[id]/page.tsx';
const content = fs.readFileSync(fileName, 'utf8');

const sourceFile = ts.createSourceFile(
  fileName,
  content,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

function traverse(node) {
  if (node.kind === ts.SyntaxKind.JsxElement || node.kind === ts.SyntaxKind.JsxSelfClosingElement) {
    // console.log(node.getText().substring(0, 20));
  }
  ts.forEachChild(node, traverse);
}

traverse(sourceFile);

const diagnostics = sourceFile.parseDiagnostics;
if (diagnostics && diagnostics.length > 0) {
  diagnostics.forEach(d => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start);
    console.log(`Error at ${line + 1}:${character + 1}: ${d.messageText}`);
  });
} else {
  console.log("No syntax errors found by TypeScript parser.");
}
