import { Token, TokenType, JavaLexer } from './JavaLexer';
import * as AST from './JavaAST';

export class JavaParser {
  private tokens: Token[];
  private current = 0;

  constructor(source: string) {
    const lexer = new JavaLexer(source);
    this.tokens = lexer.tokenize();
  }

  parse(): AST.Program {
    const classes: AST.ClassDeclaration[] = [];
    
    while (!this.isAtEnd()) {
      const classDecl = this.parseClass();
      if (classDecl) {
        classes.push(classDecl);
      }
    }

    return {
      type: 'Program',
      classes,
      line: 1,
      column: 1
    };
  }

  private parseClass(): AST.ClassDeclaration | null {
    const annotations = this.parseAnnotations();
    
    if (!this.match(TokenType.PUBLIC)) {
      this.advance(); // consume any other modifier
    }
    
    if (!this.match(TokenType.CLASS)) {
      return null;
    }

    const nameToken = this.consume(TokenType.IDENTIFIER, "Expected class name");
    const className = nameToken.value;

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after class name");

    const fields: AST.FieldDeclaration[] = [];
    const methods: AST.MethodDeclaration[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const memberAnnotations = this.parseAnnotations();
      const modifiers = this.parseModifiers();
      
      if (this.checkType()) {
        const type = this.advance().value;
        const name = this.consume(TokenType.IDENTIFIER, "Expected identifier").value;
        
        if (this.match(TokenType.LEFT_PAREN)) {
          // Method
          const parameters = this.parseParameters();
          this.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters");
          this.consume(TokenType.LEFT_BRACE, "Expected '{' before method body");
          const body = this.parseBlockStatements();
          this.consume(TokenType.RIGHT_BRACE, "Expected '}' after method body");
          
          methods.push({
            type: 'MethodDeclaration',
            name,
            returnType: type,
            parameters,
            body,
            modifiers,
            annotations: memberAnnotations,
            line: nameToken.line,
            column: nameToken.column
          });
        } else {
          // Field
          let initializer: AST.Expression | undefined;
          if (this.match(TokenType.ASSIGN)) {
            initializer = this.parseExpression();
          }
          this.consume(TokenType.SEMICOLON, "Expected ';' after field declaration");
          
          fields.push({
            type: 'FieldDeclaration',
            name,
            dataType: type,
            initializer,
            modifiers,
            line: nameToken.line,
            column: nameToken.column
          });
        }
      } else {
        this.advance(); // skip unknown tokens
      }
    }

    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after class body");

    return {
      type: 'ClassDeclaration',
      name: className,
      methods,
      fields,
      annotations,
      line: nameToken.line,
      column: nameToken.column
    };
  }

  private parseAnnotations(): AST.Annotation[] {
    const annotations: AST.Annotation[] = [];
    
    while (this.match(TokenType.ANNOTATION)) {
      const nameToken = this.consume(TokenType.IDENTIFIER, "Expected annotation name");
      const parameters: { [key: string]: any } = {};
      
      if (this.match(TokenType.LEFT_PAREN)) {
        // Parse annotation parameters
        if (!this.check(TokenType.RIGHT_PAREN)) {
          do {
            const paramName = this.consume(TokenType.IDENTIFIER, "Expected parameter name").value;
            this.consume(TokenType.ASSIGN, "Expected '=' after parameter name");
            const value = this.parseAnnotationValue();
            parameters[paramName] = value;
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RIGHT_PAREN, "Expected ')' after annotation parameters");
      }
      
      annotations.push({
        type: 'Annotation',
        name: nameToken.value,
        parameters,
        line: nameToken.line,
        column: nameToken.column
      });
    }
    
    return annotations;
  }

  private parseAnnotationValue(): any {
    if (this.match(TokenType.NUMBER)) {
      return parseFloat(this.previous().value);
    }
    if (this.match(TokenType.STRING)) {
      return this.previous().value;
    }
    if (this.match(TokenType.BOOLEAN)) {
      return this.previous().value === 'true';
    }
    throw new Error("Expected annotation value");
  }

  private parseModifiers(): string[] {
    const modifiers: string[] = [];
    
    while (this.match(TokenType.PUBLIC, TokenType.PRIVATE, TokenType.STATIC)) {
      modifiers.push(this.previous().value);
    }
    
    return modifiers;
  }

  private parseParameters(): AST.Parameter[] {
    const parameters: AST.Parameter[] = [];
    
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        const type = this.consume(TokenType.IDENTIFIER, "Expected parameter type").value;
        const name = this.consume(TokenType.IDENTIFIER, "Expected parameter name").value;
        
        parameters.push({
          type: 'Parameter',
          name,
          dataType: type,
          line: this.previous().line,
          column: this.previous().column
        });
      } while (this.match(TokenType.COMMA));
    }
    
    return parameters;
  }

  private parseBlockStatements(): AST.Statement[] {
    const statements: AST.Statement[] = [];
    
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }
    
    return statements;
  }

  private parseStatement(): AST.Statement | null {
    if (this.match(TokenType.IF)) {
      return this.parseIfStatement();
    }
    if (this.match(TokenType.WHILE)) {
      return this.parseWhileStatement();
    }
    if (this.match(TokenType.FOR)) {
      return this.parseForStatement();
    }
    if (this.match(TokenType.RETURN)) {
      return this.parseReturnStatement();
    }
    if (this.match(TokenType.LEFT_BRACE)) {
      const statements = this.parseBlockStatements();
      this.consume(TokenType.RIGHT_BRACE, "Expected '}' after block");
      return {
        type: 'BlockStatement',
        statements,
        line: this.previous().line,
        column: this.previous().column
      };
    }
    if (this.checkType()) {
      return this.parseVariableDeclaration();
    }
    
    return this.parseExpressionStatement();
  }

  private parseIfStatement(): AST.IfStatement {
    const token = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after if condition");
    
    const thenStatement = this.parseStatement()!;
    let elseStatement: AST.Statement | undefined;
    
    if (this.match(TokenType.ELSE)) {
      elseStatement = this.parseStatement()!;
    }
    
    return {
      type: 'IfStatement',
      condition,
      thenStatement,
      elseStatement,
      line: token.line,
      column: token.column
    };
  }

  private parseWhileStatement(): AST.WhileStatement {
    const token = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after while condition");
    const body = this.parseStatement()!;
    
    return {
      type: 'WhileStatement',
      condition,
      body,
      line: token.line,
      column: token.column
    };
  }

  private parseForStatement(): AST.ForStatement {
    const token = this.previous();
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'for'");
    
    let init: AST.Statement | undefined;
    if (!this.check(TokenType.SEMICOLON)) {
      init = this.parseStatement();
    } else {
      this.advance(); // consume semicolon
    }
    
    let condition: AST.Expression | undefined;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.parseExpression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after for condition");
    
    let update: AST.Expression | undefined;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      update = this.parseExpression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for clauses");
    
    const body = this.parseStatement()!;
    
    return {
      type: 'ForStatement',
      init,
      condition,
      update,
      body,
      line: token.line,
      column: token.column
    };
  }

  private parseReturnStatement(): AST.ReturnStatement {
    const token = this.previous();
    let value: AST.Expression | undefined;
    
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.parseExpression();
    }
    
    this.consume(TokenType.SEMICOLON, "Expected ';' after return value");
    
    return {
      type: 'ReturnStatement',
      value,
      line: token.line,
      column: token.column
    };
  }

  private parseVariableDeclaration(): AST.VariableDeclaration {
    const typeToken = this.advance();
    const nameToken = this.consume(TokenType.IDENTIFIER, "Expected variable name");
    
    let initializer: AST.Expression | undefined;
    if (this.match(TokenType.ASSIGN)) {
      initializer = this.parseExpression();
    }
    
    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration");
    
    return {
      type: 'VariableDeclaration',
      name: nameToken.value,
      dataType: typeToken.value,
      initializer,
      line: nameToken.line,
      column: nameToken.column
    };
  }

  private parseExpressionStatement(): AST.ExpressionStatement {
    const expr = this.parseExpression();
    this.consume(TokenType.SEMICOLON, "Expected ';' after expression");
    
    return {
      type: 'ExpressionStatement',
      expression: expr,
      line: expr.line,
      column: expr.column
    };
  }

  private parseExpression(): AST.Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): AST.Expression {
    const expr = this.parseLogicalOr();
    
    if (this.match(TokenType.ASSIGN)) {
      const right = this.parseAssignment();
      return {
        type: 'AssignmentExpression',
        left: expr,
        right,
        line: expr.line,
        column: expr.column
      };
    }
    
    return expr;
  }

  private parseLogicalOr(): AST.Expression {
    let expr = this.parseLogicalAnd();
    
    while (this.match(TokenType.OR)) {
      const operator = this.previous().value;
      const right = this.parseLogicalAnd();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
    }
    
    return expr;
  }

  private parseLogicalAnd(): AST.Expression {
    let expr = this.parseEquality();
    
    while (this.match(TokenType.AND)) {
      const operator = this.previous().value;
      const right = this.parseEquality();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
    }
    
    return expr;
  }

  private parseEquality(): AST.Expression {
    let expr = this.parseComparison();
    
    while (this.match(TokenType.EQUALS, TokenType.NOT_EQUALS)) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
    }
    
    return expr;
  }

  private parseComparison(): AST.Expression {
    let expr = this.parseTerm();
    
    while (this.match(TokenType.GREATER_THAN, TokenType.GREATER_EQUAL, TokenType.LESS_THAN, TokenType.LESS_EQUAL)) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
    }
    
    return expr;
  }

  private parseTerm(): AST.Expression {
    let expr = this.parseFactor();
    
    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous().value;
      const right = this.parseFactor();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
    }
    
    return expr;
  }

  private parseFactor(): AST.Expression {
    let expr = this.parseUnary();
    
    while (this.match(TokenType.DIVIDE, TokenType.MULTIPLY, TokenType.MODULO)) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
    }
    
    return expr;
  }

  private parseUnary(): AST.Expression {
    if (this.match(TokenType.NOT, TokenType.MINUS)) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator,
        operand: right,
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    return this.parseCall();
  }

  private parseCall(): AST.Expression {
    let expr = this.parsePrimary();
    
    while (true) {
      if (this.match(TokenType.LEFT_PAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'");
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: {
            type: 'Identifier',
            name: name.value,
            line: name.line,
            column: name.column
          },
          line: expr.line,
          column: expr.column
        };
      } else {
        break;
      }
    }
    
    return expr;
  }

  private finishCall(callee: AST.Expression): AST.CallExpression {
    const args: AST.Expression[] = [];
    
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments");
    
    return {
      type: 'CallExpression',
      callee,
      arguments: args,
      line: callee.line,
      column: callee.column
    };
  }

  private parsePrimary(): AST.Expression {
    if (this.match(TokenType.BOOLEAN)) {
      return {
        type: 'Literal',
        value: this.previous().value === 'true',
        dataType: 'boolean',
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    if (this.match(TokenType.NULL)) {
      return {
        type: 'Literal',
        value: null,
        dataType: 'null',
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    if (this.match(TokenType.NUMBER)) {
      const value = parseFloat(this.previous().value);
      return {
        type: 'Literal',
        value,
        dataType: Number.isInteger(value) ? 'int' : 'double',
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    if (this.match(TokenType.STRING)) {
      return {
        type: 'Literal',
        value: this.previous().value,
        dataType: 'String',
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    if (this.match(TokenType.IDENTIFIER)) {
      return {
        type: 'Identifier',
        name: this.previous().value,
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
      return expr;
    }
    
    if (this.match(TokenType.NEW)) {
      const className = this.consume(TokenType.IDENTIFIER, "Expected class name after 'new'").value;
      this.consume(TokenType.LEFT_PAREN, "Expected '(' after class name");
      
      const args: AST.Expression[] = [];
      if (!this.check(TokenType.RIGHT_PAREN)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after constructor arguments");
      
      return {
        type: 'NewExpression',
        className,
        arguments: args,
        line: this.previous().line,
        column: this.previous().column
      };
    }
    
    throw new Error(`Unexpected token: ${this.peek().value} at line ${this.peek().line}`);
  }

  private checkType(): boolean {
    return this.check(TokenType.INT) || 
           this.check(TokenType.DOUBLE) || 
           this.check(TokenType.BOOLEAN_TYPE) || 
           this.check(TokenType.STRING_TYPE) ||
           this.check(TokenType.VOID) ||
           this.check(TokenType.IDENTIFIER);
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message}. Got ${this.peek().type} at line ${this.peek().line}`);
  }
}