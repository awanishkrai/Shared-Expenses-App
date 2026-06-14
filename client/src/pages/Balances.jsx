import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBalances } from '../api/balances';
import { createSettlement } from '../api/settlements';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { ArrowRight, DollarSign, Activity } from 'lucide-react';
import './Balances.css';

const Balances = () => {
  const { id } = useParams();
  const [data, setData] = useState({ balances: [], settlements: [] });
  const [loading, setLoading] = useState(true);
  
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementData, setSettlementData] = useState({
    payee_id: '',
    amount: '',
    settlement_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const fetchBalances = async () => {
    try {
      const res = await getBalances(id);
      setData(res);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to fetch balances', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [id]);

  const handleSettleUpClick = (suggestion) => {
    // Find payee id by name (for simplicity in MVP we match by name since that's what the minimal transfer algo returns)
    // Actually the suggestion has 'from' and 'to' names. We need the ID of 'to'.
    // If the backend returned user_ids in the settlements it would be easier, 
    // but for now we'll show the modal and let them pick from a list or prefill based on what we have.
    // For MVP: Just open the modal
    setIsSettlementModalOpen(true);
  };

  const handleRecordSettlement = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createSettlement({
        group_id: id,
        ...settlementData,
        amount: parseFloat(settlementData.amount)
      });
      addToast('Settlement recorded successfully', 'success');
      setIsSettlementModalOpen(false);
      setSettlementData({
        payee_id: '', amount: '', settlement_date: new Date().toISOString().split('T')[0], notes: ''
      });
      fetchBalances();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to record settlement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-state">Calculating balances...</div>;

  return (
    <div className="balances-container">
      <div className="page-header">
        <h1 className="page-title gradient-text">Group Balances</h1>
        <p className="page-subtitle">Who owes whom</p>
      </div>

      <div className="balances-layout">
        <div className="balances-list-section">
          <h2>Individual Balances</h2>
          {data.balances.length === 0 ? (
            <div className="empty-state glass-panel">
              <Activity size={48} className="empty-icon" />
              <h3>No balances yet</h3>
              <p>Add some expenses to see who owes whom.</p>
            </div>
          ) : (
            <div className="balance-cards">
              {data.balances.map(b => (
                <div key={b.user_id} className={`balance-card glass-panel ${b.balance > 0 ? 'positive' : b.balance < 0 ? 'negative' : 'settled'}`}>
                  <div className="balance-user-info">
                    <div className="avatar">{b.name.charAt(0).toUpperCase()}</div>
                    <span className="balance-name">{b.name}</span>
                  </div>
                  <div className="balance-amount-display">
                    <span className="balance-label">
                      {b.balance > 0 ? 'gets back' : b.balance < 0 ? 'owes' : 'settled up'}
                    </span>
                    <span className="balance-value">
                      {b.balance === 0 ? '₹0.00' : `₹${Math.abs(b.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="suggestions-section">
          <h2>Suggested Settlements</h2>
          {data.settlements.length === 0 ? (
            <div className="glass-panel p-4 text-center text-muted">
              Everyone is settled up!
            </div>
          ) : (
            <div className="suggestions-list">
              {data.settlements.map((s, idx) => (
                <div key={idx} className="suggestion-card glass-panel">
                  <div className="transfer-visual">
                    <span className="transfer-node from">{s.from}</span>
                    <div className="transfer-arrow">
                      <ArrowRight size={16} />
                      <span className="transfer-amount">₹{s.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <span className="transfer-node to">{s.to}</span>
                  </div>
                  <button className="btn-secondary sm mt-3 w-full" onClick={() => handleSettleUpClick(s)}>
                    Record Settlement
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <button className="btn-primary w-full" onClick={() => setIsSettlementModalOpen(true)}>
              <DollarSign size={18} /> Record Any Settlement
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={isSettlementModalOpen} onClose={() => setIsSettlementModalOpen(false)} title="Record Settlement">
        <form onSubmit={handleRecordSettlement} className="form-layout">
          <div className="form-group">
            <label>Who did you pay? (Payee ID for MVP)</label>
            <input 
              type="text" 
              value={settlementData.payee_id} 
              onChange={e => setSettlementData({...settlementData, payee_id: e.target.value})} 
              required 
              placeholder="User ID of payee"
            />
            <small className="help-text">In a full version, this would be a dropdown of members.</small>
          </div>
          <div className="amount-date-row">
            <div className="form-group">
              <label>Amount (₹)</label>
              <input 
                type="number" 
                step="0.01"
                value={settlementData.amount} 
                onChange={e => setSettlementData({...settlementData, amount: e.target.value})} 
                required 
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input 
                type="date" 
                value={settlementData.settlement_date} 
                onChange={e => setSettlementData({...settlementData, settlement_date: e.target.value})} 
                required 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea 
              value={settlementData.notes} 
              onChange={e => setSettlementData({...settlementData, notes: e.target.value})} 
              rows={2}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsSettlementModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Balances;
