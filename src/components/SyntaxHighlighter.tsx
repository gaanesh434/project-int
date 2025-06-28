import React from 'react';

interface SyntaxHighlighterProps {
  code: string;
  onChange: (code: string) => void;
  errors: Array<{ line: number; message: string; type: 'error' | 'warning' }>;
}

export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({ code, onChange, errors }) => {
  const highlightSyntax = (text: string): string => {
    // Java keywords
    text = text.replace(/\b(class|public|private|static|void|int|double|String|boolean|if|else|while|for|return|new|this|true|false|null)\b/g, 
      '<span class="text-blue-400 font-semibold">$1</span>');
    
    // IoT-specific annotations
    text = text.replace(/(@Deadline|@Sensor|@SafetyCheck|@RealTime)/g, 
      '<span class="text-purple-400 font-semibold">$1</span>');
    
    // String literals
    text = text.replace(/"([^"\\]|\\.)*"/g, 
      '<span class="text-green-400">$&</span>');
    
    // Numbers
    text = text.replace(/\b\d+(\.\d+)?\b/g, 
      '<span class="text-yellow-400">$&</span>');
    
    // Comments
    text = text.replace(/\/\/.*$/gm, 
      '<span class="text-gray-500 italic">$&</span>');
    text = text.replace(/\/\*[\s\S]*?\*\//g, 
      '<span class="text-gray-500 italic">$&</span>');
    
    // Method calls
    text = text.replace(/(\w+)\s*\(/g, 
      '<span class="text-cyan-400">$1</span>(');
    
    // Operators
    text = text.replace(/([+\-*/%=<>!&|]+)/g, 
      '<span class="text-red-400">$1</span>');
    
    return text;
  };

  const lines = code.split('\n');
  
  return (
    <div className="relative">
      <div className="absolute left-0 top-0 w-12 bg-gray-900 h-full border-r border-gray-600 flex flex-col text-xs text-gray-500">
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
      
      <textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-96 bg-transparent text-transparent caret-white font-mono text-sm p-4 pl-16 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none relative z-10"
        spellCheck={false}
        style={{ caretColor: 'white' }}
      />
      
      <div 
        className="absolute top-4 left-16 right-4 bottom-4 pointer-events-none font-mono text-sm leading-6 whitespace-pre-wrap overflow-hidden"
        dangerouslySetInnerHTML={{ __html: highlightSyntax(code) }}
      />
      
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