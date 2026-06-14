import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGroupById, addMember } from '../api/groups';
import { getGroupExpenses, createExpense } from '../api/expenses';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Plus, UserPlus, DollarSign, Calendar, Upload } from 'lucide-react';
import './GroupDetail.css';

const GroupDetail = () => {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  
  // Forms state
  const [newMemberName, setNewMemberName] = useState('');
  const [expenseData, setExpenseData] = useState({
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    split_type: 'equal',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const fetchGroupData = async () => {
    try {
      const groupData = await getGroupById(id);
      setGroup(groupData);
      
      const expensesData = await getGroupExpenses(id);
      setExpenses(expensesData.expenses || []);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to fetch group details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addMember(id, newMemberName);
      addToast(`Added ${newMemberName} to the group`, 'success');
      setIsMemberModalOpen(false);
      setNewMemberName('');
      fetchGroupData(); // refresh members
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to add member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Create equal split details automatically for simplicity in MVP
      let split_details = [];
      if (expenseData.split_type === 'equal') {
        split_details = group.members.map(m => ({
          user_id: m.id,
          share_amount: (parseFloat(expenseData.amount) / group.members.length).toFixed(2)
        }));
      }

      await createExpense(id, {
        ...expenseData,
        amount: parseFloat(expenseData.amount),
        split_details
      });
      
      addToast('Expense added successfully', 'success');
      setIsExpenseModalOpen(false);
      setExpenseData({
        description: '', amount: '', expense_date: new Date().toISOString().split('T')[0],
        split_type: 'equal', notes: ''
      });
      fetchGroupData();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to add expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-state">Loading group details...</div>;
  if (!group) return <div className="loading-state">Group not found</div>;

  return (
    <div className="group-container">
      <div className="group-header glass-panel">
        <div className="group-header-info">
          <h1 className="page-title gradient-text">{group.name}</h1>
          {group.description && <p className="page-subtitle">{group.description}</p>}
        </div>
        <div className="group-actions">
          <button className="btn-secondary" onClick={() => setIsMemberModalOpen(true)}>
            <UserPlus size={18} /> Add Member
          </button>
          <Link to={`/group/${id}/import`} className="btn-secondary">
            <Upload size={18} /> Import CSV
          </Link>
          <button className="btn-primary" onClick={() => setIsExpenseModalOpen(true)}>
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </div>

      <div className="group-content">
        <div className="expenses-section">
          <h2>Recent Expenses</h2>
          
          {expenses.length === 0 ? (
            <div className="empty-state glass-panel">
              <DollarSign size={48} className="empty-icon" />
              <h3>No expenses yet</h3>
              <p>Add an expense or import a CSV to get started.</p>
              <button className="btn-primary" onClick={() => setIsExpenseModalOpen(true)}>
                Add First Expense
              </button>
            </div>
          ) : (
            <div className="expense-list">
              {expenses.map(expense => (
                <div key={expense.id} className="expense-card glass-panel">
                  <div className="expense-date">
                    <Calendar size={14} />
                    <span>{new Date(expense.expense_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className="expense-details">
                    <div className="expense-title">
                      <h4>{expense.description}</h4>
                      <span className={`status-badge status-${expense.status}`}>{expense.status}</span>
                    </div>
                    <div className="expense-meta">
                      <span className="payer">Paid by <strong>{expense.payer_name}</strong></span>
                      {expense.split_type && <span className="split-type">• Split {expense.split_type}</span>}
                    </div>
                  </div>
                  <div className="expense-amount">
                    <div className="amount-val">₹{parseFloat(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    {expense.currency && expense.currency !== 'INR' && (
                      <div className="original-currency">{parseFloat(expense.amount / (expense.fx_rate_used || 83.5)).toFixed(2)} {expense.currency}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="members-sidebar glass-panel">
          <h3>Members ({group.members?.length || 0})</h3>
          <ul className="member-list">
            {group.members?.map(member => (
              <li key={member.id} className="member-item">
                <div className="avatar small">{member.username.charAt(0).toUpperCase()}</div>
                <div className="member-info">
                  <span className="member-name">{member.username}</span>
                  {member.is_guest ? <span className="badge guest">Guest</span> : null}
                  {member.left_at ? <span className="badge left">Left</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} title="Add Member">
        <form onSubmit={handleAddMember} className="form-layout">
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={newMemberName} 
              onChange={e => setNewMemberName(e.target.value)} 
              required 
              placeholder="Username of existing user"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsMemberModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Expense Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Add Expense">
        <form onSubmit={handleAddExpense} className="form-layout">
          <div className="form-group">
            <label>Description</label>
            <input 
              type="text" 
              value={expenseData.description} 
              onChange={e => setExpenseData({...expenseData, description: e.target.value})} 
              required 
              placeholder="e.g. Dinner at Marina Bites"
            />
          </div>
          <div className="amount-date-row">
            <div className="form-group">
              <label>Amount (₹)</label>
              <input 
                type="number" 
                step="0.01"
                value={expenseData.amount} 
                onChange={e => setExpenseData({...expenseData, amount: e.target.value})} 
                required 
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input 
                type="date" 
                value={expenseData.expense_date} 
                onChange={e => setExpenseData({...expenseData, expense_date: e.target.value})} 
                required 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Split Type</label>
            <select 
              value={expenseData.split_type} 
              onChange={e => setExpenseData({...expenseData, split_type: e.target.value})}
            >
              <option value="equal">Equal</option>
              {/* Other split types would require a more complex UI for the MVP */}
              <option value="unequal" disabled>Unequal (Coming soon)</option>
              <option value="percentage" disabled>Percentage (Coming soon)</option>
            </select>
            <small className="help-text">Currently defaults to splitting equally among all active members.</small>
          </div>
          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea 
              value={expenseData.notes} 
              onChange={e => setExpenseData({...expenseData, notes: e.target.value})} 
              rows={2}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsExpenseModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GroupDetail;
