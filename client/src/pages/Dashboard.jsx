import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGroups, createGroup } from '../api/groups';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { Plus, Users } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const { addToast } = useToast();

  const fetchGroups = async () => {
    try {
      const data = await getGroups();
      setGroups(data.groups || []);
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to fetch groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createGroup(newGroupName, newGroupDesc);
      addToast('Group created successfully', 'success');
      setIsModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      fetchGroups();
    } catch (error) {
      addToast(error.response?.data?.message || 'Failed to create group', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="loading-state">Loading your groups...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title gradient-text">Your Groups</h1>
          <p className="page-subtitle">Manage your shared expenses across different groups</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state glass-panel">
          <Users size={48} className="empty-icon" />
          <h3>No groups yet</h3>
          <p>Create a group to start sharing expenses with friends, family, or roommates.</p>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            Create First Group
          </button>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map(group => (
            <Link key={group.id} to={`/group/${group.id}`} className="group-card glass-panel">
              <div className="group-card-header">
                <h3 className="group-name">{group.name}</h3>
                <span className="member-count">
                  <Users size={14} /> {group.member_count || 1}
                </span>
              </div>
              {group.description && <p className="group-desc">{group.description}</p>}
              <div className="group-card-footer">
                <span className="view-link">View Details →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Group">
        <form onSubmit={handleCreateGroup} className="form-layout">
          <div className="form-group">
            <label>Group Name</label>
            <input 
              type="text" 
              value={newGroupName} 
              onChange={e => setNewGroupName(e.target.value)} 
              required 
              placeholder="e.g. Marina Trip 2026"
            />
          </div>
          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea 
              value={newGroupDesc} 
              onChange={e => setNewGroupDesc(e.target.value)} 
              placeholder="What is this group for?"
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
