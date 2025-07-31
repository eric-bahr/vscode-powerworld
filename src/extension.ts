import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('PowerWorld Language Support is now active!');

    // Create diagnostic collection for field validation errors
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('powerworld-aux');

    // Simple document symbol provider to show SCRIPT blocks in outline
    const symbolProvider = vscode.languages.registerDocumentSymbolProvider(
        { language: 'powerworld-aux', scheme: 'file' },
        new PowerWorldScriptSymbolProvider()
    );

    // Folding range provider to include headers in folding
    const foldingProvider = vscode.languages.registerFoldingRangeProvider(
        { language: 'powerworld-aux', scheme: 'file' },
        new PowerWorldFoldingRangeProvider()
    );

    // Hover provider for data field information
    const hoverProvider = vscode.languages.registerHoverProvider(
        { language: 'powerworld-aux', scheme: 'file' },
        new PowerWorldDataFieldHoverProvider()
    );

    // Completion provider for PowerWorld functions and special keywords
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        { language: 'powerworld-aux', scheme: 'file' },
        new PowerWorldCompletionProvider(),
        '@' // Trigger completion when @ is typed
    );

    // Validation provider for field count errors
    const validationProvider = new PowerWorldValidationProvider(diagnosticCollection);

    // Register event handlers for validation
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(doc => {
        if (doc.languageId === 'powerworld-aux') {
            validationProvider.validateDocument(doc);
        }
    });

    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'powerworld-aux') {
            validationProvider.validateDocument(event.document);
        }
    });

    // Validate already open documents
    vscode.workspace.textDocuments.forEach(doc => {
        if (doc.languageId === 'powerworld-aux') {
            validationProvider.validateDocument(doc);
        }
    });

    context.subscriptions.push(
        symbolProvider, 
        foldingProvider, 
        hoverProvider, 
        completionProvider,
        diagnosticCollection,
        onDidOpenTextDocument,
        onDidChangeTextDocument
    );
}

class PowerWorldScriptSymbolProvider implements vscode.DocumentSymbolProvider {
    provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
        const symbols: vscode.DocumentSymbol[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Find SCRIPT blocks (case insensitive)
            const scriptMatch = line.match(/^\s*script\s*(\w+)?\s*\{/i);
            if (scriptMatch) {
                const scriptName = scriptMatch[1] || 'Unnamed Script';
                const startPos = new vscode.Position(i, 0);
                const endPos = this.findClosingBrace(lines, i);
                
                const symbol = new vscode.DocumentSymbol(
                    scriptName,
                    'PowerWorld Script Block',
                    vscode.SymbolKind.Function,
                    new vscode.Range(startPos, endPos),
                    new vscode.Range(startPos, new vscode.Position(i, line.length))
                );
                symbols.push(symbol);
            }
        }

        return symbols;
    }

    private findClosingBrace(lines: string[], startLine: number): vscode.Position {
        let braceCount = 0;
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            for (const char of line) {
                if (char === '{') braceCount++;
                if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        return new vscode.Position(i, line.indexOf('}') + 1);
                    }
                }
            }
        }
        return new vscode.Position(startLine, 0); // fallback
    }
}

class PowerWorldFoldingRangeProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.FoldingRange[]> {
        const ranges: vscode.FoldingRange[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Find PowerWorld data blocks - handle multi-line declarations
            const dataBlockMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
            if (dataBlockMatch) {
                // Find the closing parenthesis - it might be on a later line
                let closingParenLine = i;
                let parenCount = 0;
                let foundClosingParen = false;
                
                for (let j = i; j < lines.length && !foundClosingParen; j++) {
                    const currentLine = lines[j];
                    for (const char of currentLine) {
                        if (char === '(') parenCount++;
                        if (char === ')') {
                            parenCount--;
                            if (parenCount === 0) {
                                closingParenLine = j;
                                foundClosingParen = true;
                                break;
                            }
                        }
                    }
                }
                
                if (!foundClosingParen) continue;
                
                // Look for the opening brace after the closing parenthesis
                let braceLineIndex = closingParenLine;
                let foundOpeningBrace = false;
                
                // Check if brace is on the same line as closing paren
                if (lines[closingParenLine].includes('{')) {
                    foundOpeningBrace = true;
                } else {
                    // Check subsequent lines for opening brace
                    for (let k = closingParenLine + 1; k < Math.min(closingParenLine + 3, lines.length); k++) {
                        if (lines[k].trim() === '{' || lines[k].includes('{')) {
                            braceLineIndex = k;
                            foundOpeningBrace = true;
                            break;
                        }
                    }
                }
                
                if (!foundOpeningBrace) continue;
                
                // Find the closing brace
                const endLine = this.findClosingBraceLine(lines, braceLineIndex);
                if (endLine > braceLineIndex) {
                    // Create folding range that includes the header line
                    ranges.push(new vscode.FoldingRange(i, endLine, vscode.FoldingRangeKind.Region));
                }
            }
            
            // Find SCRIPT blocks
            const scriptMatch = line.match(/^\s*script\s*(\w+)?\s*\{/i);
            if (scriptMatch) {
                const endLine = this.findClosingBraceLine(lines, i);
                if (endLine > i) {
                    ranges.push(new vscode.FoldingRange(i, endLine, vscode.FoldingRangeKind.Region));
                }
            }
        }

        return ranges;
    }

    private findClosingBraceLine(lines: string[], startLine: number): number {
        let braceCount = 0;
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            for (const char of line) {
                if (char === '{') braceCount++;
                if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        return i;
                    }
                }
            }
        }
        return lines.length - 1;
    }
}

class PowerWorldDataFieldHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const line = document.lineAt(position.line);
        const lineText = line.text.trim();
        
        // Skip comment lines and empty lines
        if (lineText.startsWith('//') || lineText === '') {
            return undefined;
        }

        // Skip function definition lines (lines with parentheses)
        if (lineText.match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/)) {
            return undefined;
        }

        // Skip braces
        if (lineText === '{' || lineText === '}') {
            return undefined;
        }

        // Skip SUBDATA opening and closing tags
        if (lineText.match(/^\s*<SUBDATA\s+[^>]*>/i) || lineText.match(/^\s*<\/SUBDATA>/i)) {
            return undefined;
        }

        // Skip lines inside SUBDATA blocks
        if (this.isInsideSubdataBlock(document, position.line)) {
            return undefined;
        }

        // Find the current data block by looking backwards for the header
        const dataBlockInfo = this.findDataBlockHeader(document, position.line);
        if (!dataBlockInfo) {
            return undefined;
        }

        // Parse the data fields from the current line
        const dataFields = this.parseDataLine(lineText);
        if (dataFields.length === 0) {
            return undefined;
        }

        // Find which field the cursor is hovering over
        const fieldIndex = this.findFieldAtPosition(line.text, position.character);
        if (fieldIndex === -1 || fieldIndex >= dataBlockInfo.parameters.length) {
            return undefined;
        }

        const fieldName = dataBlockInfo.parameters[fieldIndex];
        const fieldValue = dataFields[fieldIndex];
        
        const hoverText = new vscode.MarkdownString();
        hoverText.appendCodeblock(`${fieldValue}`, 'powerworld-aux');
        hoverText.appendMarkdown(`**Field:** ${fieldName}  \n`);
        hoverText.appendMarkdown(`**Data Block:** ${dataBlockInfo.blockName}  \n`);
        hoverText.appendMarkdown(`**Position:** ${fieldIndex + 1} of ${dataBlockInfo.parameters.length}`);

        return new vscode.Hover(hoverText);
    }

    private findDataBlockHeader(document: vscode.TextDocument, currentLine: number): { blockName: string, parameters: string[] } | undefined {
        // Look backwards from current line to find the data block header
        for (let i = currentLine; i >= 0; i--) {
            const line = document.lineAt(i).text;
            
            // Check for DATA() format like "DATA (CONTINGENCY, [CTGLabel, Category], AUXDEF, YES)"
            const dataMatch = line.match(/^\s*DATA\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*\[([^\]]+)\]/i);
            if (dataMatch) {
                const blockName = dataMatch[1];
                const paramText = dataMatch[2];
                const parameters = this.parseParameters(paramText);
                if (parameters.length > 0) {
                    return { blockName, parameters };
                }
            }
            
            // Check for standard data block pattern like "ModelConditionCondition (param1,param2,...)"
            const standardMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
            if (standardMatch) {
                const blockName = standardMatch[1];
                
                // Skip DATA function calls - we handle those above
                if (blockName.toLowerCase() === 'data') {
                    continue;
                }
                
                // Extract parameters from the parentheses (may span multiple lines)
                const parameters = this.extractParameters(document, i);
                if (parameters.length > 0) {
                    return { blockName, parameters };
                }
            }
            
            // Stop if we hit another data block or script block
            if (line.trim() === '}' || line.match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/) || line.match(/^\s*DATA\s*\(/i)) {
                break;
            }
        }
        return undefined;
    }

    private extractParameters(document: vscode.TextDocument, startLine: number): string[] {
        let paramText = '';
        let parenCount = 0;
        let foundStart = false;
        
        // Collect parameter text across multiple lines
        for (let i = startLine; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            
            for (const char of line) {
                if (char === '(') {
                    parenCount++;
                    foundStart = true;
                } else if (char === ')') {
                    parenCount--;
                    if (parenCount === 0 && foundStart) {
                        // Found complete parameter list
                        return this.parseParameters(paramText);
                    }
                } else if (foundStart && parenCount > 0) {
                    paramText += char;
                }
            }
            
            if (foundStart && parenCount > 0) {
                paramText += ' '; // Add space between lines
            }
        }
        
        return [];
    }

    private parseParameters(paramText: string): string[] {
        // Split by commas and clean up whitespace
        return paramText.split(',').map(param => param.trim()).filter(param => param.length > 0);
    }

    private parseDataLine(lineText: string): string[] {
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < lineText.length) {
            const char = lineText[i];
            
            if (char === '"' && (i === 0 || lineText[i-1] !== '\\')) {
                inQuotes = !inQuotes;
                current += char;
            } else if (char === ' ' && !inQuotes) {
                if (current.trim().length > 0) {
                    fields.push(current.trim());
                    current = '';
                }
            } else {
                current += char;
            }
            i++;
        }
        
        if (current.trim().length > 0) {
            fields.push(current.trim());
        }
        
        return fields;
    }

    private findFieldAtPosition(lineText: string, position: number): number {
        const fields = this.parseDataLine(lineText);
        let currentPos = 0;
        
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            const fieldStart = lineText.indexOf(field, currentPos);
            const fieldEnd = fieldStart + field.length;
            
            if (position >= fieldStart && position <= fieldEnd) {
                return i;
            }
            
            currentPos = fieldEnd;
        }
        
        return -1;
    }

    private isInsideSubdataBlock(document: vscode.TextDocument, currentLine: number): boolean {
        // Look backwards to find if we're inside a SUBDATA block
        let insideSubdata = false;
        
        for (let i = currentLine; i >= 0; i--) {
            const line = document.lineAt(i).text.trim();
            
            // If we hit a closing SUBDATA tag, we're not inside
            if (line.match(/^\s*<\/SUBDATA>/i)) {
                return false;
            }
            
            // If we hit an opening SUBDATA tag, we're inside
            if (line.match(/^\s*<SUBDATA\s+[^>]*>/i)) {
                return true;
            }
            
            // If we hit a data block start or end, stop searching
            if (line === '{' || line === '}' || 
                line.match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/) || 
                line.match(/^\s*DATA\s*\(/i)) {
                break;
            }
        }
        
        return false;
    }
}

class PowerWorldCompletionProvider implements vscode.CompletionItemProvider {
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const completionItems: vscode.CompletionItem[] = [];

        // Add special @ keywords
        const specialKeywords = [
            { name: '@BUILDDATE', description: 'Simulator patch build date' },
            { name: '@CASEFILENAME', description: 'File name of the presently open case. This is only the file name without the path.' },
            { name: '@CASEFILEPATH', description: 'Directory path of the presently open case' },
            { name: '@CASENAME', description: 'Name of the presently open case including the path and file name' },
            { name: '@DATE', description: 'Present date' },
            { name: '@DATETIME', description: 'Actual date and time in the format yyyymmdd_hhmmss-hhmm with the UTC offset included on the end of the time' },
            { name: '@TIME', description: 'Present time' },
            { name: '@VERSION', description: 'Simulator version number' },
            { name: '@MODELFIELD', description: 'Can be used in combination with an object type and variable name so that any field of any object can be included in the text.' }
        ];

        specialKeywords.forEach(keyword => {
            const item = new vscode.CompletionItem(keyword.name, vscode.CompletionItemKind.Keyword);
            item.detail = 'PowerWorld Special Keyword';
            item.documentation = new vscode.MarkdownString(keyword.description);
            item.insertText = keyword.name.substring(1); // Remove the @ since it's already typed
            completionItems.push(item);
        });

        return completionItems;
    }
}

class PowerWorldValidationProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor(diagnosticCollection: vscode.DiagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;
    }

    validateDocument(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];
        const lines = document.getText().split('\n');
        let insideDataBlock = false;
        let insideScriptBlock = false;
        let currentDataBlockInfo: { blockName: string, parameters: string[] } | undefined;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineText = line.trim();
            
            // Skip comment lines and empty lines
            if (lineText.startsWith('//') || lineText === '') {
                continue;
            }

            // Check for SCRIPT keyword
            if (lineText.toLowerCase() === 'script') {
                insideScriptBlock = true;
                insideDataBlock = false;
                currentDataBlockInfo = undefined;
                continue;
            }

            // Check for opening brace
            if (lineText === '{') {
                if (insideScriptBlock) {
                    // We're entering a SCRIPT block
                    continue;
                } else {
                    // We're entering a data block
                    insideDataBlock = true;
                    insideScriptBlock = false;
                }
                continue;
            }

            // Check for closing brace
            if (lineText === '}') {
                insideDataBlock = false;
                insideScriptBlock = false;
                currentDataBlockInfo = undefined;
                continue;
            }

            // Check for function definition lines (start of new data block) - this should come before SCRIPT validation
            if (lineText.match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/) || lineText.match(/^\s*DATA\s*\(/i)) {
                insideDataBlock = false;
                insideScriptBlock = false;
                currentDataBlockInfo = this.findDataBlockHeader(document, i);
                continue;
            }

            // Validate function calls in SCRIPT blocks
            if (insideScriptBlock) {
                this.validateScriptLine(line, i, diagnostics);
                continue;
            }

            // Only validate lines inside data blocks
            if (!insideDataBlock || !currentDataBlockInfo) {
                continue;
            }

            // Skip validation for lines inside SUBDATA blocks
            if (this.isInsideSubdataBlock(document, i)) {
                continue;
            }

            // Skip SUBDATA opening and closing tags
            if (lineText.match(/^\s*<SUBDATA\s+[^>]*>/i) || lineText.match(/^\s*<\/SUBDATA>/i)) {
                continue;
            }

            // Remove end-of-line comments before parsing fields
            const lineWithoutComments = this.removeEndOfLineComment(lineText);
            if (lineWithoutComments.trim() === '') {
                continue;
            }

            // Parse the data fields from the current line (without comments)
            const dataFields = this.parseDataLine(lineWithoutComments);
            if (dataFields.length === 0) {
                continue;
            }

            // Check for too many fields
            if (dataFields.length > currentDataBlockInfo.parameters.length) {
                const extraFieldsCount = dataFields.length - currentDataBlockInfo.parameters.length;
                
                // Find the position of the first extra field
                const extraFieldStartPos = this.findExtraFieldPosition(lineWithoutComments, currentDataBlockInfo.parameters.length);
                if (extraFieldStartPos !== -1) {
                    const startPos = new vscode.Position(i, extraFieldStartPos);
                    // Don't include the comment in the error highlight
                    const lineEndPos = lineWithoutComments.length;
                    const endPos = new vscode.Position(i, lineEndPos);
                    
                    const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(startPos, endPos),
                        `Too many fields: expected ${currentDataBlockInfo.parameters.length}, found ${dataFields.length}. Extra field(s): ${extraFieldsCount}`,
                        vscode.DiagnosticSeverity.Error
                    );
                    diagnostic.source = 'PowerWorld Language Support';
                    diagnostics.push(diagnostic);
                }
            }

            // Check for too few fields (warning, not error)
            if (dataFields.length < currentDataBlockInfo.parameters.length) {
                const missingFieldsCount = currentDataBlockInfo.parameters.length - dataFields.length;
                const startPos = new vscode.Position(i, 0);
                const lineEndPos = lineWithoutComments.length;
                const endPos = new vscode.Position(i, lineEndPos);
                
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(startPos, endPos),
                    `Missing fields: expected ${currentDataBlockInfo.parameters.length}, found ${dataFields.length}. Missing field(s): ${missingFieldsCount}`,
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.source = 'PowerWorld Language Support';
                diagnostics.push(diagnostic);
            }
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private removeEndOfLineComment(lineText: string): string {
        let inQuotes = false;
        let i = 0;
        
        while (i < lineText.length) {
            const char = lineText[i];
            
            if (char === '"' && (i === 0 || lineText[i-1] !== '\\')) {
                inQuotes = !inQuotes;
            } else if (char === '/' && i + 1 < lineText.length && lineText[i + 1] === '/' && !inQuotes) {
                // Found comment outside quotes
                return lineText.substring(0, i).trim();
            }
            i++;
        }
        
        return lineText;
    }

    private validateScriptLine(line: string, lineNumber: number, diagnostics: vscode.Diagnostic[]): void {
        const lineText = line.trim();
        
        // Skip empty lines and braces
        if (lineText === '' || lineText === '{' || lineText === '}') {
            return;
        }

        // Remove end-of-line comments before checking for semicolon
        const lineWithoutComments = this.removeEndOfLineComment(lineText);
        
        // Check if this looks like a function call (contains parentheses and arguments)
        const functionCallPattern = /^[A-Za-z_][A-Za-z0-9_]*\s*\(/;
        if (functionCallPattern.test(lineWithoutComments)) {
            // Check if the line ends with a semicolon
            if (!lineWithoutComments.endsWith(';')) {
                // Find the position where the semicolon should be
                const originalLineWithoutComments = line.substring(0, line.lastIndexOf('//') >= 0 ? line.lastIndexOf('//') : line.length).trimEnd();
                const semicolonPos = originalLineWithoutComments.length;
                
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(
                        new vscode.Position(lineNumber, semicolonPos),
                        new vscode.Position(lineNumber, semicolonPos)
                    ),
                    'Function call in SCRIPT block must end with a semicolon (;)',
                    vscode.DiagnosticSeverity.Error
                );
                diagnostic.source = 'PowerWorld Language Support';
                diagnostics.push(diagnostic);
            }
        }
    }

    private findExtraFieldPosition(lineText: string, expectedFieldCount: number): number {
        const fields = this.parseDataLine(lineText);
        if (fields.length <= expectedFieldCount) {
            return -1;
        }

        // Find the position where the extra fields start
        let currentPos = 0;
        for (let i = 0; i < expectedFieldCount; i++) {
            const field = fields[i];
            const fieldStart = lineText.indexOf(field, currentPos);
            currentPos = fieldStart + field.length;
        }

        // Find the start of the first extra field
        while (currentPos < lineText.length && lineText[currentPos] === ' ') {
            currentPos++;
        }

        return currentPos < lineText.length ? currentPos : -1;
    }

    private findDataBlockHeader(document: vscode.TextDocument, currentLine: number): { blockName: string, parameters: string[] } | undefined {
        // Look backwards from current line to find the data block header
        for (let i = currentLine; i >= 0; i--) {
            const line = document.lineAt(i).text;
            
            // Check for DATA() format like "DATA (CONTINGENCY, [CTGLabel, Category], AUXDEF, YES)"
            const dataMatch = line.match(/^\s*DATA\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*\[([^\]]+)\]/i);
            if (dataMatch) {
                const blockName = dataMatch[1];
                const paramText = dataMatch[2];
                const parameters = this.parseParameters(paramText);
                if (parameters.length > 0) {
                    return { blockName, parameters };
                }
            }
            
            // Check for standard data block pattern like "ModelConditionCondition (param1,param2,...)"
            const standardMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
            if (standardMatch) {
                const blockName = standardMatch[1];
                
                // Skip DATA function calls - we handle those above
                if (blockName.toLowerCase() === 'data') {
                    continue;
                }
                
                // Extract parameters from the parentheses (may span multiple lines)
                const parameters = this.extractParameters(document, i);
                if (parameters.length > 0) {
                    return { blockName, parameters };
                }
            }
            
            // Stop if we hit another data block or script block
            if (line.trim() === '}' || line.match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/) || line.match(/^\s*DATA\s*\(/i)) {
                break;
            }
        }
        return undefined;
    }

    private extractParameters(document: vscode.TextDocument, startLine: number): string[] {
        let paramText = '';
        let parenCount = 0;
        let foundStart = false;
        
        // Collect parameter text across multiple lines
        for (let i = startLine; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            
            for (const char of line) {
                if (char === '(') {
                    parenCount++;
                    foundStart = true;
                } else if (char === ')') {
                    parenCount--;
                    if (parenCount === 0 && foundStart) {
                        // Found complete parameter list
                        return this.parseParameters(paramText);
                    }
                } else if (foundStart && parenCount > 0) {
                    paramText += char;
                }
            }
            
            if (foundStart && parenCount > 0) {
                paramText += ' '; // Add space between lines
            }
        }
        
        return [];
    }

    private parseParameters(paramText: string): string[] {
        // Split by commas and clean up whitespace
        return paramText.split(',').map(param => param.trim()).filter(param => param.length > 0);
    }

    private parseDataLine(lineText: string): string[] {
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < lineText.length) {
            const char = lineText[i];
            
            if (char === '"' && (i === 0 || lineText[i-1] !== '\\')) {
                inQuotes = !inQuotes;
                current += char;
            } else if (char === ' ' && !inQuotes) {
                if (current.trim().length > 0) {
                    fields.push(current.trim());
                    current = '';
                }
            } else {
                current += char;
            }
            i++;
        }
        
        if (current.trim().length > 0) {
            fields.push(current.trim());
        }
        
        return fields;
    }

    private isInsideSubdataBlock(document: vscode.TextDocument, currentLine: number): boolean {
        // Look backwards to find if we're inside a SUBDATA block
        for (let i = currentLine; i >= 0; i--) {
            const line = document.lineAt(i).text.trim();
            
            // If we hit a closing SUBDATA tag, we're not inside
            if (line.match(/^\s*<\/SUBDATA>/i)) {
                return false;
            }
            
            // If we hit an opening SUBDATA tag, we're inside
            if (line.match(/^\s*<SUBDATA\s+[^>]*>/i)) {
                return true;
            }
            
            // If we hit a data block start or end, stop searching
            if (line === '{' || line === '}' || 
                line.match(/^\s*[A-Za-z_][A-Za-z0-9_]*\s*\(/) || 
                line.match(/^\s*DATA\s*\(/i)) {
                break;
            }
        }
        
        return false;
    }

}

export function deactivate() {}
