import { Token, TokenType } from './JavaLexer';

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  type: 'error' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SyntaxValidator {
  private tokens: Token[];
  private errors: SyntaxError[] = [];
  private processedLines = new Set<number>(); // Track processed lines to avoid duplicates

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  validate(): SyntaxError[] {
    this.errors = [];
    this.processedLines.clear();
    
    this.validateDeadlineAnnotations();
    this.validateSemicolons();
    this.validateDivisionByZero();
    this.validateUnsafeOperations();
    this.validateBraceMatching();
    
    return this.errors;
  }

  private validateDeadlineAnnotations(): void {
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      
      if (token.type === TokenType.DEADLINE) {
        // Check for proper @Deadline syntax: @Deadline(ms=value)
        if (i + 1 < this.tokens.length && this.tokens[i + 1].type === TokenType.LEFT_PAREN) {
          const params = this.parseAnnotationParameters(i + 1);
          
          if (!params.ms) {
            this.addError(token.line, token.column, 
              'Invalid @Deadline syntax. Use @Deadline(ms=value)', 'error', 'high');
          } else {
            const msValue = parseInt(params.ms);
            if (isNaN(msValue) || msValue <= 0) {
              this.addError(token.line, token.column, 
                'Deadline must be positive', 'error', 'high');
            } else if (msValue > 1000) {
              this.addError(token.line, token.column, 
                'Deadline > 1000ms may not be real-time', 'warning', 'medium');
            }
          }
        } else {
          this.addError(token.line, token.column, 
            'Invalid @Deadline syntax. Use @Deadline(ms=value)', 'error', 'high');
        }
      }
    }
  }

  private validateSemicolons(): void {
    const checkedLines = new Set<number>();
    
    for (let i = 0; i < this.tokens.length - 1; i++) {
      const token = this.tokens[i];
      const nextToken = this.tokens[i + 1];
      
      // Skip if we already checked this line
      if (checkedLines.has(token.line)) {
        continue;
      }
      
      // Check for missing semicolons after statements
      if (this.isStatementEnd(token) && 
          nextToken.type !== TokenType.SEMICOLON && 
          nextToken.type !== TokenType.RIGHT_BRACE &&
          nextToken.type !== TokenType.EOF &&
          nextToken.line !== token.line && // Different lines
          !this.isControlStructure(token)) {
        
        // Skip if it's a comment, annotation, or method declaration
        if (token.type !== TokenType.COMMENT && 
            !token.value.startsWith('@') &&
            !token.value.startsWith('//') &&
            !this.isMethodDeclaration(i)) {
          
          this.addError(token.line, token.column, 
            'Missing semicolon', 'warning', 'low');
          checkedLines.add(token.line);
        }
      }
    }
  }

  private validateDivisionByZero(): void {
    for (let i = 0; i < this.tokens.length - 2; i++) {
      const token = this.tokens[i];
      const divToken = this.tokens[i + 1];
      const zeroToken = this.tokens[i + 2];
      
      if (divToken.type === TokenType.DIVIDE && 
          zeroToken.type === TokenType.NUMBER && 
          zeroToken.value === '0') {
        this.addError(divToken.line, divToken.column, 
          'Division by zero detected', 'error', 'critical');
      }
    }
  }

  private validateUnsafeOperations(): void {
    const checkedLines = new Set<number>();
    
    for (const token of this.tokens) {
      if (token.type === TokenType.IDENTIFIER && !checkedLines.has(token.line)) {
        if (token.value === 'System.exit' || 
            token.value.includes('Runtime.getRuntime') ||
            token.value.includes('ProcessBuilder') ||
            token.value.includes('Class.forName')) {
          this.addError(token.line, token.column, 
            'Unsafe operation not allowed in IoT environment', 'error', 'critical');
          checkedLines.add(token.line);
        }
      }
    }
  }

  private validateBraceMatching(): void {
    const stack: { type: TokenType; line: number; column: number }[] = [];
    
    for (const token of this.tokens) {
      if (token.type === TokenType.LEFT_BRACE || 
          token.type === TokenType.LEFT_PAREN || 
          token.type === TokenType.LEFT_BRACKET) {
        stack.push({ type: token.type, line: token.line, column: token.column });
      } else if (token.type === TokenType.RIGHT_BRACE || 
                 token.type === TokenType.RIGHT_PAREN || 
                 token.type === TokenType.RIGHT_BRACKET) {
        
        if (stack.length === 0) {
          this.addError(token.line, token.column, 
            'Unmatched closing brace/bracket/parenthesis', 'error', 'high');
        } else {
          const last = stack.pop()!;
          if (!this.isMatchingPair(last.type, token.type)) {
            this.addError(token.line, token.column, 
              'Mismatched brace/bracket/parenthesis', 'error', 'high');
          }
        }
      }
    }
    
    // Check for unclosed braces
    for (const unclosed of stack) {
      this.addError(unclosed.line, unclosed.column, 
        'Unclosed brace/bracket/parenthesis', 'error', 'high');
    }
  }

  private parseAnnotationParameters(startIndex: number): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    let i = startIndex + 1; // Skip opening paren
    
    while (i < this.tokens.length && this.tokens[i].type !== TokenType.RIGHT_PAREN) {
      const token = this.tokens[i];
      
      if (token.type === TokenType.IDENTIFIER && 
          i + 2 < this.tokens.length && 
          this.tokens[i + 1].type === TokenType.ASSIGN) {
        
        const key = token.value;
        const value = this.tokens[i + 2].value;
        params[key] = value;
        i += 3;
      } else {
        i++;
      }
    }
    
    return params;
  }

  private isStatementEnd(token: Token): boolean {
    return token.type === TokenType.IDENTIFIER || 
           token.type === TokenType.NUMBER || 
           token.type === TokenType.STRING || 
           token.type === TokenType.RIGHT_PAREN;
  }

  private isControlStructure(token: Token): boolean {
    return token.type === TokenType.IF || 
           token.type === TokenType.WHILE || 
           token.type === TokenType.FOR || 
           token.type === TokenType.ELSE;
  }

  private isMatchingPair(open: TokenType, close: TokenType): boolean {
    return (open === TokenType.LEFT_BRACE && close === TokenType.RIGHT_BRACE) ||
           (open === TokenType.LEFT_PAREN && close === TokenType.RIGHT_PAREN) ||
           (open === TokenType.LEFT_BRACKET && close === TokenType.RIGHT_BRACKET);
  }

  private isMethodDeclaration(index: number): boolean {
    // Check if this is part of a method declaration
    let i = index;
    
    // Look backwards for method keywords
    while (i >= 0 && this.tokens[i].line === this.tokens[index].line) {
      if (this.tokens[i].type === TokenType.PUBLIC || 
          this.tokens[i].type === TokenType.PRIVATE ||
          this.tokens[i].type === TokenType.VOID) {
        return true;
      }
      i--;
    }
    
    // Look forwards for opening parenthesis
    i = index;
    while (i < this.tokens.length && this.tokens[i].line === this.tokens[index].line) {
      if (this.tokens[i].type === TokenType.LEFT_PAREN) {
        return true;
      }
      i++;
    }
    
    return false;
  }

  private addError(line: number, column: number, message: string, type: 'error' | 'warning', severity: 'low' | 'medium' | 'high' | 'critical'): void {
    // Avoid duplicate errors on the same line with the same message
    const existingError = this.errors.find(e => 
      e.line === line && e.message === message
    );
    
    if (!existingError) {
      this.errors.push({ line, column, message, type, severity });
    }
  }
}