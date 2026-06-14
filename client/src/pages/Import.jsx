import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { uploadCSV } from '../api/import';
import { useToast } from '../components/Toast';
import FileUpload from '../components/FileUpload';
import { FileDown, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import './Import.css';

const Import = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const { addToast } = useToast();

  const handleFileUpload = async (file) => {
    setUploading(true);
    setReport(null);
    try {
      const result = await uploadCSV(id, file);
      setReport(result);
      addToast('CSV processed successfully', 'success');
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to process CSV', 'error');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'auto_resolved': return <CheckCircle className="status-icon success" size={18} />;
      case 'pending': return <AlertTriangle className="status-icon warning" size={18} />;
      case 'blocked': return <AlertTriangle className="status-icon danger" size={18} />;
      default: return <Info className="status-icon info" size={18} />;
    }
  };

  const toggleRow = (idx) => {
    setExpandedRow(expandedRow === idx ? null : idx);
  };

  return (
    <div className="import-container">
      <div className="page-header">
        <h1 className="page-title gradient-text">Import Expenses</h1>
        <p className="page-subtitle">Upload a CSV from Splitwise, Tricount, or your bank</p>
      </div>

      {!report ? (
        <div className="upload-section">
          <FileUpload onFileSelect={handleFileUpload} />
          {uploading && <div className="upload-loading">Processing your file... this might take a moment.</div>}
          
          <div className="import-guidelines glass-panel mt-6">
            <h3><FileDown size={18} /> CSV Format Guidelines</h3>
            <p>Your CSV should contain the following columns (headers are required, order doesn't matter):</p>
            <ul>
              <li><code>date</code> - Format: YYYY-MM-DD or DD-MM-YYYY</li>
              <li><code>description</code> - What was the expense for?</li>
              <li><code>amount</code> - The total amount paid</li>
              <li><code>currency</code> - (Optional) e.g., INR, USD</li>
              <li><code>paid_by</code> - Name of the person who paid</li>
              <li><code>split_type</code> - (Optional) equal, percentage, shares, unequal</li>
              <li><code>split_details</code> - (Optional) Detailed breakdown e.g. "Aisha 30%; Rohan 30%"</li>
              <li><code>notes</code> - (Optional) Any extra info</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="report-section">
          <div className="report-header">
            <h2>Import Report: {report.filename}</h2>
            <button className="btn-secondary sm" onClick={() => setReport(null)}>Upload Another</button>
          </div>

          <div className="summary-cards">
            <div className="summary-card glass-panel">
              <span className="summary-val">{report.summary.imported}</span>
              <span className="summary-label">Imported Clean</span>
            </div>
            <div className="summary-card glass-panel">
              <span className="summary-val success">{report.summary.auto_corrected}</span>
              <span className="summary-label">Auto-Corrected</span>
            </div>
            <div className="summary-card glass-panel">
              <span className="summary-val warning">{report.summary.pending}</span>
              <span className="summary-label">Pending Review</span>
            </div>
            <div className="summary-card glass-panel">
              <span className="summary-val danger">{report.summary.blocked}</span>
              <span className="summary-label">Blocked</span>
            </div>
            <div className="summary-card glass-panel">
              <span className="summary-val info">{report.summary.reclassified}</span>
              <span className="summary-label">Reclassified</span>
            </div>
            <div className="summary-card glass-panel">
              <span className="summary-val text-muted">{report.summary.voided}</span>
              <span className="summary-label">Voided</span>
            </div>
          </div>

          {report.anomalies.length > 0 && (
            <div className="anomalies-section">
              <h3>Anomaly Log</h3>
              <p className="text-muted mb-4">The following rows require your attention or were automatically adjusted.</p>
              
              <div className="anomaly-list">
                {report.anomalies.map((anomaly, idx) => (
                  <div key={idx} className={`anomaly-card glass-panel status-${anomaly.status}`}>
                    <div className="anomaly-summary" onClick={() => toggleRow(idx)}>
                      {getStatusIcon(anomaly.status)}
                      <div className="anomaly-info">
                        <span className="anomaly-row">Row {anomaly.row}</span>
                        <span className="anomaly-type">{anomaly.type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="anomaly-action">{anomaly.action}</div>
                      <button className="expand-btn">
                        {expandedRow === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                    
                    {expandedRow === idx && (
                      <div className="anomaly-details">
                        <p className="anomaly-desc">{anomaly.description}</p>
                        <div className="anomaly-actions">
                          {anomaly.status === 'pending' && (
                            <button className="btn-secondary sm" onClick={(e) => { e.stopPropagation(); addToast('Manual resolution coming in v2', 'info'); }}>
                              Resolve Manually
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="report-footer text-center mt-6">
            <Link to={`/group/${id}`} className="btn-primary">
              Return to Group
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Import;
