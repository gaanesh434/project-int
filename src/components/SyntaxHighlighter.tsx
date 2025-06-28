import React, { useRef, useEffect } from 'react';

interface SyntaxHighlighterProps {
  code: string;
  onChange: (code: string) => void;
  errors: Array<{ line: number; message: string; type: 'error' | 'warning' }>;
}

export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({ code, onChange, errors }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const highlightSyntax = (text: string): JSX.Element[] => {
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      const tokens: JSX.Element[] = [];
      let currentIndex = 0;
      
      // Java keywords
      const keywords = /\b(class|public|private|static|void|int|double|String|boolean|if|else|while|for|return|new|this|true|false|null)\b/g;
      // IoT-specific annotations
      const annotations = /(@Deadline|@Sensor|@SafetyCheck|@RealTime)/g;
      // String literals
      const strings = /"([^"\\]|\\.)*"/g;
      // Numbers
      const numbers = /\b\d+(\.\d+)?\b/g;
      // Comments
      const comments = /\/\/.*$/g;
      // Method calls
      const methods = /(\w+)\s*\(/g;
      // Operators
      const operators = /([+\-*/%=<>!&|]+)/g;

      // Collect all matches with their positions
      const matches: Array<{ start: number; end: number; type: string; match: string }> = [];
      
      let match;
      
      // Keywords
      while ((match = keywords.exec(line)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, type: 'keyword', match: match[0] });
      }
      
      // Annotations
      annotations.lastIndex = 0;
      while ((match = annotations.exec(line)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, type: 'annotation', match: match[0] });
      }
      
      // Strings
      strings.lastIndex = 0;
      while ((match = strings.exec(line)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, type: 'string', match: match[0] });
      }
      
      // Numbers
      numbers.lastIndex = 0;
      while ((match = numbers.exec(line)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, type: 'number', match: match[0] });
      }
      
      // Comments
      comments.lastIndex = 0;
      while ((match = comments.exec(line)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length, type: 'comment', match: match[0] });
      }
      
      // Method calls
      methods.lastIndex = 0;
      while ((match = methods.exec(line)) !== null) {
        matches.push({ start: match.index, end: match.index + match[1].length, type: 'method', match: match[1] });
      }
      
      // Sort matches by start position
      matches.sort((a, b) => a.start - b.start);
      
      // Remove overlapping matches (keep the first one)
      const filteredMatches = [];
      let lastEnd = 0;
      for (const match of matches) {
        if (match.start >= lastEnd) {
          filteredMatches.push(match);
          lastEnd = match.end;
        }
      }
      
      // Build the highlighted line
      let tokenIndex = 0;
      for (const match of filteredMatches) {
        // Add text before the match
        if (match.start > currentIndex) {
          const beforeText = line.substring(currentIndex, match.start);
          if (beforeText) {
            tokens.push(
              <span key={`${lineIndex}-${tokenIndex++}`} className="text-gray-100">
                {beforeText}
              </span>
            );
          }
        }
        
        // Add the highlighted match
        const className = getTokenClassName(match.type);
        tokens.push(
          <span key={`${lineIndex}-${tokenIndex++}`} className={className}>
            {match.match}
          </span>
        );
        
        currentIndex = match.end;
      }
      
      // Add remaining text
      if (currentIndex < line.length) {
        const remainingText = line.substring(currentIndex);
        tokens.push(
          <span key={`${lineIndex}-${tokenIndex++}`} className="text-gray-100">
            {remainingText}
          </span>
        );
      }
      
      // If no tokens, add the whole line
      if (tokens.length === 0) {
        tokens.push(
          <span key={`${lineIndex}-0`} className="text-gray-100">
            {line}
          </span>
        );
      }
      
      return (
        <div key={lineIndex} className="leading-6">
          {tokens}
        </div>
      );
    });
  };

  const getTokenClassName = (type: string): string => {
    switch (type) {
      case 'keyword':
        return 'text-blue-400 font-semibold';
      case 'annotation':
        return 'text-purple-400 font-semibold';
      case 'string':
        return 'text-green-400';
      case 'number':
        return 'text-yellow-400';
      case 'comment':
        return 'text-gray-500 italic';
      case 'method':
        return 'text-cyan-400';
      case 'operator':
        return 'text-red-400';
      default:
        return 'text-gray-100';
    }
  };

  const lines = code.split('\n');
  
  return (
    <div className="relative">
      {/* Line numbers */}
      <div className="absolute left-0 top-0 w-12 bg-gray-900 h-full border-r border-gray-600 flex flex-col text-xs text-gray-500 z-10">
        {lines.map((_, index) => {
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
        className="w-full h-96 bg-transparent text-transparent caret-white font-mono text-sm p-4 pl-16 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none relative z-20"
        spellCheck={false}
        style={{ caretColor: 'white' }}
      />
      
      {/* Syntax highlighted overlay */}
      <div 
        ref={highlightRef}
        className="absolute top-4 left-16 right-4 bottom-4 pointer-events-none font-mono text-sm leading-6 whitespace-pre-wrap overflow-hidden z-10"
      >
        {highlightSyntax(code)}
      </div>
      
      {/* Error indicators */}
      {errors.map((error, index) => (
        <div
          key={index}
          className={`absolute right-2 w-3 h-6 rounded ${error.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}
          style={{ top: `${(error.line - 1) * 24 + 16}px` }}
          title={error.message}
        />
      ))}
    </div>
  );
};