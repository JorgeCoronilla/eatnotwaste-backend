import { Project, SyntaxKind, TryStatement, Block, Node } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const project = new Project();

// Add all files in controllers and routes
project.addSourceFilesAtPaths("src/controllers/**/*.ts");
project.addSourceFilesAtPaths("src/routes/**/*.ts");

const sourceFiles = project.getSourceFiles();
let totalRemovals = 0;

sourceFiles.forEach(sourceFile => {
  let fileChanged = false;

  // We look for any TryStatement in the file
  const tryStatements = sourceFile.getDescendantsOfKind(SyntaxKind.TryStatement);

  // We must process them from bottom to top to avoid invalidating AST nodes
  for (let i = tryStatements.length - 1; i >= 0; i--) {
    const tryStmt = tryStatements[i];
    if (!tryStmt) continue;
    
    // Safety check: Ensure this is the top-level try/catch of a route handler
    // We check if its parent is a Block, and that Block's parent is an ArrowFunction or FunctionExpression/Declaration
    const parent = tryStmt.getParent();
    if (!parent || !Node.isBlock(parent)) continue;

    const grandParent = parent.getParent();
    if (
      !grandParent || 
      !(Node.isArrowFunction(grandParent) || Node.isFunctionExpression(grandParent) || Node.isFunctionDeclaration(grandParent))
    ) {
      continue;
    }

    // Check if the try block is basically the ONLY thing in the function body
    const statementsInBlock = parent.getStatements();
    const tryIsOnlyStatement = statementsInBlock.length <= 2; // Sometimes there's a console.log or const reqAuth = req before the try.

    // Let's inspect the catch block. If it has complex logic, we skip it.
    const catchClause = tryStmt.getCatchClause();
    if (!catchClause) continue;

    const catchBlock = catchClause.getBlock();
    const catchStatements = catchBlock.getStatements();
    
    // If the catch block is returning a generic 500 error, we can safely remove it.
    let isGenericErrorHandling = false;
    catchStatements.forEach(stmt => {
      const text = stmt.getText();
      if (text.includes('res.status(500)') || text.includes('Error interno del servidor') || text.includes('console.error')) {
        isGenericErrorHandling = true;
      }
    });

    if (tryIsOnlyStatement && isGenericErrorHandling) {
      // Unwrap the try block
      const tryBlockStatements = tryStmt.getTryBlock().getStatements();
      
      // Get the code of each statement inside the try block
      const statementsText = tryBlockStatements.map(s => s.getText()).join('\n');
      
      // Replace the entire TryStatement with the contents of its try block
      tryStmt.replaceWithText(statementsText);
      fileChanged = true;
      totalRemovals++;
      console.log(`Unwrapped try/catch in ${sourceFile.getBaseName()}`);
    }
  }

  if (fileChanged) {
    sourceFile.saveSync();
  }
});

console.log(`\n✅ Refactor complete. Total try/catch blocks removed: ${totalRemovals}`);
