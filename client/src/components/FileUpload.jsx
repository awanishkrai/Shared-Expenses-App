import { useState, useCallback } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import './FileUpload.css';

const FileUpload = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    }
  };

  return (
    <div 
      className={`file-upload-zone ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileInput} 
        id="file-upload" 
        className="hidden-input" 
      />
      
      {!selectedFile ? (
        <label htmlFor="file-upload" className="upload-label">
          <div className="upload-icon-container">
            <UploadCloud size={48} className="upload-icon" />
          </div>
          <h3 className="upload-heading">Drag & drop your CSV file here</h3>
          <p className="upload-subtext">or click to browse from your computer</p>
        </label>
      ) : (
        <div className="selected-file">
          <FileText size={48} className="file-icon" />
          <div className="file-info">
            <span className="file-name">{selectedFile.name}</span>
            <span className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
          </div>
          <label htmlFor="file-upload" className="btn-secondary small-btn">
            Change File
          </label>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
