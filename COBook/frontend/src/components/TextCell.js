// TextCell.js (Fixed to preserve markdown syntax)
import React, { useState, useRef, useEffect } from 'react';
import { FileText, Trash2, Plus, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

const TextCell = ({
  cell,
  index,
  onUpdateContent,
  onDeleteCell,
  onAddCell,
  comments,
  onToggleComments,
  onAddComment
}) => {
  const [showOutput, setShowOutput] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [markdownText, setMarkdownText] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const editorRef = useRef(null);
  const lastContentRef = useRef(cell.content);
  
  // Store markdown separately to preserve original syntax
  const markdownStorageRef = useRef(new Map());

  // Convert markdown to HTML while preserving line breaks
  const convertMarkdownToHTML = (text) => {
    if (!text) return '';
    
    let html = text;
    
    // Handle headings
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-3 mb-2 text-gray-800">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2 text-gray-900">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3 text-gray-900">$1</h1>');

    // Handle bold text
    html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');

    // Handle italic text
    html = html.replace(/\*([^*\n]+?)\*/g, '<em class="italic text-gray-700">$1</em>');

    // Handle inline code
    html = html.replace(/`([^`\n]+?)`/g, '<code class="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono text-indigo-600">$1</code>');

    // Handle lists
    html = html.replace(/\n-\s(.*)/g, '\n<li class="ml-4 text-gray-700">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc ml-6 my-2 text-gray-700">$1</ul>');

    // Handle paragraphs - convert double line breaks to paragraphs
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      // Skip if it's already an HTML block
      if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<li')) {
        return p;
      }
      return `<p class="mb-2">${p}</p>`;
    }).join('\n');

    // Convert single line breaks to <br> within paragraphs
    html = html.replace(/(<p[^>]*>)(.*?)(<\/p>)/gs, (match, openTag, content, closeTag) => {
      content = content.replace(/\n/g, '<br>');
      return openTag + content + closeTag;
    });

    return html;
  };

  // Convert HTML back to markdown (reverses the conversion)
  const convertHTMLToMarkdown = (html) => {
    if (!html) return '';
    
    let text = html;
    
    // Convert headings back to markdown
    text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
    text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
    text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
    
    // Convert bold back to markdown
    text = text.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    
    // Convert italic back to markdown
    text = text.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    
    // Convert code back to markdown
    text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // Convert list items back to markdown
    text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    text = text.replace(/<\/?ul[^>]*>/gi, '');
    
    // Replace <br> tags with newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // Replace </p> tags with double newlines
    text = text.replace(/<\/p>/gi, '\n\n');
    
    // Remove remaining opening <p> tags
    text = text.replace(/<p[^>]*>/gi, '');
    
    // Remove any other remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up extra newlines but preserve intentional ones
    text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
    text = text.trim();
    
    return text;
  };

  // Handle entering edit mode
  const handleClick = () => {
    setIsEditing(true);
    
    // Check if we have stored markdown for this cell
    const storedMarkdown = markdownStorageRef.current.get(cell.id);
    
    if (storedMarkdown) {
      // Use the stored markdown (preserves original syntax)
      setMarkdownText(storedMarkdown);
    } else {
      // Convert HTML back to markdown
      const markdown = convertHTMLToMarkdown(htmlContent);
      setMarkdownText(markdown);
      markdownStorageRef.current.set(cell.id, markdown);
    }
    
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }, 0);
  };

  // Handle leaving edit mode
  const handleBlur = () => {
    if (isEditing) {
      setIsEditing(false);
      
      // Store the markdown for future edits
      markdownStorageRef.current.set(cell.id, markdownText);
      
      // Convert to HTML for display
      const newHtml = convertMarkdownToHTML(markdownText);
      setHtmlContent(newHtml);
      
      if (newHtml !== lastContentRef.current) {
        lastContentRef.current = newHtml;
        
        // Save both HTML (for display) and markdown (for editing) in a special format
        // We'll embed the markdown in a data attribute
        const contentWithMarkdown = `<div data-markdown="${encodeURIComponent(markdownText)}">${newHtml}</div>`;
        onUpdateContent(cell.id, contentWithMarkdown);
      }
    }
  };

  // Handle text input during editing
  const handleInputChange = (e) => {
    setMarkdownText(e.target.value);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 'b':
          e.preventDefault();
          const start = e.target.selectionStart;
          const end = e.target.selectionEnd;
          const selectedText = markdownText.substring(start, end);
          const newText = markdownText.substring(0, start) + '**' + selectedText + '**' + markdownText.substring(end);
          setMarkdownText(newText);
          setTimeout(() => {
            e.target.selectionStart = start + 2;
            e.target.selectionEnd = end + 2;
          }, 0);
          break;
        case 'i':
          e.preventDefault();
          const iStart = e.target.selectionStart;
          const iEnd = e.target.selectionEnd;
          const iSelectedText = markdownText.substring(iStart, iEnd);
          const iNewText = markdownText.substring(0, iStart) + '*' + iSelectedText + '*' + markdownText.substring(iEnd);
          setMarkdownText(iNewText);
          setTimeout(() => {
            e.target.selectionStart = iStart + 1;
            e.target.selectionEnd = iEnd + 1;
          }, 0);
          break;
        case '`':
          e.preventDefault();
          const cStart = e.target.selectionStart;
          const cEnd = e.target.selectionEnd;
          const cSelectedText = markdownText.substring(cStart, cEnd);
          const cNewText = markdownText.substring(0, cStart) + '`' + cSelectedText + '`' + markdownText.substring(cEnd);
          setMarkdownText(cNewText);
          setTimeout(() => {
            e.target.selectionStart = cStart + 1;
            e.target.selectionEnd = cEnd + 1;
          }, 0);
          break;
      }
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      handleBlur();
    }
  };

  // Initialize component and extract markdown if available
  useEffect(() => {
    let content = cell.content;
    let markdown = '';
    
    // Try to extract embedded markdown
    const markdownMatch = content.match(/data-markdown="([^"]+)"/);
    if (markdownMatch) {
      markdown = decodeURIComponent(markdownMatch[1]);
      markdownStorageRef.current.set(cell.id, markdown);
      
      // Extract the HTML content (remove the wrapper div)
      const htmlMatch = content.match(/<div[^>]*>(.*)<\/div>/s);
      if (htmlMatch) {
        content = htmlMatch[1];
      }
    } else {
      // No embedded markdown, convert HTML to markdown
      markdown = convertHTMLToMarkdown(content);
      markdownStorageRef.current.set(cell.id, markdown);
    }
    
    setHtmlContent(content);
    setMarkdownText(markdown);
    lastContentRef.current = content;
  }, [cell.content, cell.id]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-all group shadow-sm hover:shadow-md">
      {/* Cell Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="bg-green-100 p-1.5 rounded-md">
            <FileText className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-600 font-semibold">TEXT</span>
            <div className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              [{index + 1}]
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onToggleComments(cell.id)}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors relative"
            title="Comments"
          >
            <MessageSquare className="w-4 h-4" />
            {comments[cell.id]?.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {comments[cell.id].length}
              </span>
            )}
          </button>

          <button
            onClick={() => onAddCell('text', cell.id)}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
            title="Add cell below"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDeleteCell(cell.id)}
            className="p-2 hover:bg-red-50 rounded-md text-red-600 transition-colors"
            title="Delete cell"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cell Content */}
      <div className="p-4">
        {isEditing ? (
          <textarea
            ref={editorRef}
            value={markdownText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full min-h-[120px] text-gray-700 focus:outline-none resize-none"
            style={{
              lineHeight: '1.6',
              fontFamily: 'inherit'
            }}
            placeholder="Type your text here... (use **bold**, *italic*, `code`)"
          />
        ) : (
          <div
            onClick={handleClick}
            className="min-h-[120px] text-gray-700 prose max-w-none cursor-text"
            style={{ lineHeight: '1.6' }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}
      </div>

      {/* Comments Section */}
      {comments[cell.id] && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div
            className="px-4 py-2 flex items-center justify-between border-b border-gray-200 cursor-pointer"
            onClick={() => setShowOutput(!showOutput)}
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-3 h-3 text-gray-600" />
              <span className="text-xs font-mono text-gray-600 font-semibold">COMMENTS</span>
              <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                {comments[cell.id].length}
              </span>
            </div>
            {showOutput ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>

          {showOutput && (
            <div className="p-4">
              <div className="space-y-3 mb-3">
                {comments[cell.id].map(comment => (
                  <div key={comment.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-indigo-600">
                            {comment.user.charAt(0)}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{comment.user}</span>
                      </div>
                      <span className="text-xs text-gray-500">{comment.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      onAddComment(cell.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.target.previousElementSibling;
                    if (input.value.trim()) {
                      onAddComment(cell.id, input.value);
                      input.value = '';
                    }
                  }}
                  className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TextCell;
