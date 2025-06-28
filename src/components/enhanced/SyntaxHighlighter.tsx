import React, { useRef, useEffect } from 'react';
import { JavaLexer, TokenType } from '../../interpreter/core/JavaLexer';
import { SyntaxValidator } from '../../interpreter/core/SyntaxValidator';

interface SyntaxHighlighterProps {
  code: string;
  onChange: (code: string) => void;
  errors: Array<{ line: number; message: string; type: 'error' | 'warning' }>;
  onErrorsChange?: (errors: Array<{ line: number; message: string; type: 'error' | 'warning' }>) => void;
}

export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({ 
  code, 
  onChange, 
  errors,
  onErrorsChange 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Real-time syntax validation
  useEffect(() => {
    const validateSyntax = () => {
      try {
        const lexer = new JavaLexer(code);
        const tokens = lexer.tokenize();
        const validator = new SyntaxValidator(tokens);
        const syntaxErrors = validator.validate();
        
        const formattedErrors = syntaxErrors.map(error => ({
          line: error.line,
          message: error.message,
          type: error.type
        }));
        
        if (onErrorsChange) {
          onErrorsChange(formattedErrors);
        }
      } catch (error) {
        console.warn('Syntax validation error:', error);
      }
    };

    const debounceTimer = setTimeout(validateSyntax, 300);
    return () => clearTimeout(debounceTimer);
  }, [code, onErrorsChange]);

  const highlightSyntax = (text: string): JSX.Element[] => {
    try {
      const lexer = new JavaLexer(text);
      const tokens = lexer.tokenize();
      const lines: JSX.Element[] = [];
      
      let currentLine = 1;
      let lineTokens: any[] = [];
      
      for (const token of tokens) {
        if (token.type === 'EOF') break;
        
        if (token.line !== currentLine) {
          // Process completed line
          if (lineTokens.length > 0) {
            lines.push(this.renderLine(lineTokens, currentLine));
          }
          
          // Handle empty lines
          while (currentLine < token.line - 1) {
            currentLine++;
            lines.push(
              <div key={currentLine} className="leading-6 min-h-[24px]">
                <span className="text-gray-100"> </span>
              </div>
            );
          }
          
          lineTokens = [];
          currentLine = token.line;
        }
        
        lineTokens.push(token);
      }
      
      // Process final line
      if (lineTokens.length > 0) {
        lines.push(this.renderLine(lineTokens, currentLine));
      }
      
      return lines;
    } catch (error) {
      // Fallback to plain text if tokenization fails
      return text.split('\n').map((line, index) => (
        <div key={index} className="leading-6 min-h-[24px]">
          <span className="text-gray-100">{line || ' '}</span>
        </div>
      ));
    }
  };

  const renderLine = (tokens: any[], lineNumber: number): JSX.Element => {
    const elements: JSX.Element[] = [];
    let lastEndIndex = 0;
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Add whitespace before token if needed
      if (token.startIndex > lastEndIndex) {
        const whitespace = code.substring(lastEndIndex, token.startIndex);
        if (whitespace) {
          elements.push(
            <span key={`ws-${i}`} className="text-gray-100">
              {whitespace}
            </span>
          );
        }
      }
      
      // Add highlighted token
      const className = this.getTokenClassName(token.type);
      elements.push(
        <span key={`token-${i}`} className={className}>
          {token.value}
        </span>
      );
      
      lastEndIndex = token.endIndex;
    }
    
    return (
      <div key={lineNumber} className="leading-6 min-h-[24px]">
        {elements.length > 0 ? elements : <span className="text-gray-100"> </span>}
      </div>
    );
  };

  const getTokenClassName = (tokenType: string): string => {
    switch (tokenType) {
      // Keywords
      case TokenType.CLASS:
      case TokenType.PUBLIC:
      case TokenType.PRIVATE:
      case TokenType.STATIC:
      case TokenType.VOID:
      case TokenType.INT:
      case TokenType.DOUBLE:
      case TokenType.BOOLEAN_TYPE:
      case TokenType.STRING_TYPE:
      case TokenType.IF:
      case TokenType.ELSE:
      case TokenType.WHILE:
      case TokenType.FOR:
      case TokenType.RETURN:
      case TokenType.NEW:
      case TokenType.THIS:
      case TokenType.TRUE:
      case TokenType.FALSE:
      case TokenType.NULL:
        return 'text-blue-400 font-semibold';
      
      // IoT Annotations
      case TokenType.DEADLINE:
      case TokenType.SENSOR:
      case TokenType.SAFETY_CHECK:
      case TokenType.REAL_TIME:
        return 'text-purple-400 font-semibold';
      
      // Strings
      case TokenType.STRING:
        return 'text-green-400';
      
      // Numbers
      case TokenType.NUMBER:
        return 'text-yellow-400';
      
      // Comments
      case TokenType.COMMENT:
        return 'text-gray-500 italic';
      
      // Operators
      case TokenType.PLUS:
      case TokenType.MINUS:
      case TokenType.MULTIPLY:
      case TokenType.DIVIDE:
      case TokenType.ASSIGN:
      case TokenType.EQUALS:
      case TokenType.NOT_EQUALS:
      case TokenType.LESS_THAN:
      case TokenType.GREATER_THAN:
        return 'text-red-400';
      
      // Method calls (identifiers followed by parentheses)
      case TokenType.IDENTIFIER:
        return 'text-cyan-400';
      
      default:
        return 'text-gray-100';
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="relative h-full">
      {/* Line numbers */}
      <div className="absolute left-0 top-0 w-12 bg-gray-900 h-full border-r border-gray-600 flex flex-col text-xs text-gray-500 z-30">
        {code.split('\n').map((_, index) => {
          const lineNumber = index + 1;
          const hasError = errors.some(error => error.line === lineNumber);
          return (
            <div 
              key={index} 
              className={`h-6 flex items-center justify-center ${hasError ? 'bg-red-900/30 text-red-400' : ''}`}
            >
              {lineNumber}
            </div>
          );
        })}
      </div>

      {/* Code input textarea */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="w-full h-full bg-transparent text-transparent caret-white font-mono text-sm p-4 pl-16 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none relative z-20"
        spellCheck={false}
        style={{ caretColor: 'white' }}
        placeholder="Enter your Java code with @Deadline annotations..."
      />
      
      {/* Syntax highlighted overlay */}
      <div 
        ref={highlightRef}
        className="absolute top-4 left-16 right-4 bottom-4 pointer-events-none font-mono text-sm leading-6 whitespace-pre-wrap overflow-hidden z-10"
      >
        {highlightSyntax(code)}
      </div>
      
      {/* Error indicators on the right side */}
      {errors.length > 0 && (
        <div className="absolute top-2 right-2 flex flex-col space-y-1 z-40">
          {errors.slice(0, 10).map((error, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${error.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}
              title={`Line ${error.line}: ${error.message}`}
            />
          ))}
          {errors.length > 10 && (
            <div className="text-xs text-gray-400 text-center">
              +{errors.length - 10} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};