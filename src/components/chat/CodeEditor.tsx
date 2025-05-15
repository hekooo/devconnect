import { useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { useTheme } from '../../contexts/ThemeContext';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  height?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  language, 
  height = '200px' 
}) => {
  const { theme } = useTheme();
  
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  return (
    <div className="border-t border-b border-gray-200 dark:border-dark-300">
      <Editor
        height={height}
        language={language}
        value={value}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          wordWrap: 'on',
          fontSize: 14,
          tabSize: 2,
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;