import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  Save, 
  Eye, 
  Edit, 
  FileSignature,
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Settings
} from 'lucide-react';
import { 
  Document, 
  DocumentComment, 
  DigitalSignature 
} from '../../types/document-management';
import { documentManagementService } from '../../services/documentManagementService';

interface CollaborativeEditorProps {
  document: Document;
  onDocumentUpdate?: (document: Document) => void;
  readOnly?: boolean;
}

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  cursor?: { line: number; column: number };
  selection?: { start: number; end: number };
  color: string;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  document,
  onDocumentUpdate,
  readOnly = false
}) => {
  const [content, setContent] = useState(document.content);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentPosition, setCommentPosition] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const userColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  useEffect(() => {
    loadComments();
    // Initialize collaborative features
    initializeCollaboration();
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [document.id]);

  useEffect(() => {
    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      if (content !== document.content && !readOnly) {
        autoSave();
      }
    }, 2000);
  }, [content]);

  const loadComments = async () => {
    try {
      const commentsData = await documentManagementService.getDocumentComments(document.id);
      setComments(commentsData);
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const initializeCollaboration = () => {
    // Simulate active users for demo
    const mockUsers: ActiveUser[] = [
      {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        color: userColors[0]
      },
      {
        id: 'user2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        color: userColors[1]
      }
    ];
    setActiveUsers(mockUsers);
  };

  const autoSave = async () => {
    try {
      setSaving(true);
      await documentManagementService.updateDocument(document.id, { content });
      setLastSaved(new Date());
      onDocumentUpdate?.({ ...document, content });
    } catch (err) {
      setError('Failed to auto-save document');
      console.error('Error auto-saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTextSelection = () => {
    if (editorRef.current) {
      const start = editorRef.current.selectionStart;
      const end = editorRef.current.selectionEnd;
      
      if (start !== end) {
        const selected = content.substring(start, end);
        setSelectedText(selected);
        setCommentPosition({ start, end });
      } else {
        setSelectedText('');
        setCommentPosition(null);
      }
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const comment = await documentManagementService.addComment(
        document.id,
        newComment,
        undefined,
        undefined,
        commentPosition
      );
      
      setComments(prev => [...prev, comment]);
      setNewComment('');
      setShowCommentModal(false);
      setSelectedText('');
      setCommentPosition(null);
    } catch (err) {
      setError('Failed to add comment');
      console.error('Error adding comment:', err);
    }
  };

  const resolveComment = async (commentId: string) => {
    try {
      const updatedComment = await documentManagementService.resolveComment(commentId);
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId ? updatedComment : comment
        )
      );
    } catch (err) {
      setError('Failed to resolve comment');
      console.error('Error resolving comment:', err);
    }
  };

  const handleSignDocument = async () => {
    try {
      // This would integrate with a digital signature service
      const signature = await documentManagementService.signDocument(
        document.id,
        document.version.toString(),
        'mock-signature-data',
        'mock-certificate-data'
      );
      
      setShowSignatureModal(false);
      // Handle signature success
    } catch (err) {
      setError('Failed to sign document');
      console.error('Error signing document:', err);
    }
  };

  const getCommentsByPosition = (position: number) => {
    return comments.filter(comment => 
      comment.position && 
      position >= comment.position.character && 
      position <= comment.position.character + 50 // Approximate range
    );
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col bg-white shadow-sm">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">{document.title}</h3>
            <div className="flex items-center space-x-2">
              {saving ? (
                <div className="flex items-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center text-sm text-gray-500">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  Saved {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Active Users */}
            <div className="flex items-center space-x-1">
              {activeUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.charAt(0)}
                </div>
              ))}
              <button
                onClick={() => setShowCollaboratorsModal(true)}
                className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 ml-4">
              {selectedText && (
                <button
                  onClick={() => setShowCommentModal(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Comment
                </button>
              )}
              
              <button
                onClick={() => setShowSignatureModal(true)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileSignature className="w-4 h-4 mr-1" />
                Sign
              </button>
              
              <button
                onClick={() => {/* Handle settings */}}
                className="p-1.5 text-gray-400 hover:text-gray-600"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 relative">
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onSelect={handleTextSelection}
            readOnly={readOnly}
            className="w-full h-full p-6 border-0 resize-none focus:ring-0 focus:outline-none font-mono text-sm leading-relaxed"
            placeholder="Start typing your document content..."
          />
          
          {/* Selection Highlight */}
          {selectedText && (
            <div className="absolute top-4 right-4 bg-blue-100 border border-blue-200 rounded-md p-2 text-sm">
              <div className="font-medium text-blue-900">Selected Text:</div>
              <div className="text-blue-700 max-w-xs truncate">"{selectedText}"</div>
            </div>
          )}
        </div>
      </div>

      {/* Comments Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">Comments</h4>
            <span className="text-xs text-gray-500">{comments.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs">Select text to add a comment</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`border rounded-lg p-3 ${
                  comment.isResolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      {comment.authorName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {comment.authorName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-2">{comment.content}</p>

                {comment.position && (
                  <div className="text-xs text-gray-500 mb-2 bg-gray-100 rounded p-1">
                    Referenced text in document
                  </div>
                )}

                <div className="flex items-center justify-between">
                  {comment.isResolved ? (
                    <span className="inline-flex items-center text-xs text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => resolveComment(comment.id)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Mark as resolved
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Comment
              </h3>
              
              {selectedText && (
                <div className="mb-4 p-3 bg-gray-50 rounded border">
                  <div className="text-xs font-medium text-gray-700 mb-1">Selected text:</div>
                  <div className="text-sm text-gray-600">"{selectedText}"</div>
                </div>
              )}
              
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your comment..."
              />

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setNewComment('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  Add Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Digital Signature
              </h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <FileSignature className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">
                        Sign Document
                      </h4>
                      <p className="mt-1 text-sm text-blue-700">
                        By signing this document, you acknowledge that you have reviewed and approve its contents.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signature Comment (Optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add a comment with your signature..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignDocument}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
                >
                  Sign Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collaborators Modal */}
      {showCollaboratorsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Manage Collaborators
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invite by Email
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                    <button className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                      Invite
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Current Collaborators</h4>
                  <div className="space-y-2">
                    {activeUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <select className="text-xs border border-gray-300 rounded px-2 py-1">
                          <option>Editor</option>
                          <option>Viewer</option>
                          <option>Commenter</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCollaboratorsModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-md p-4 shadow-lg z-50">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto pl-3"
            >
              <X className="h-4 w-4 text-red-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};