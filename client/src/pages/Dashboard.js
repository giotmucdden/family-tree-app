import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrees, createTree, deleteTree } from '../api';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trees, setTrees] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [newTreeDesc, setNewTreeDesc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrees();
  }, []);

  async function loadTrees() {
    try {
      const data = await getTrees();
      setTrees(data);
    } catch (err) {
      console.error('Failed to load trees:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const tree = await createTree({
        name: newTreeName || 'My Family Tree',
        description: newTreeDesc,
      });
      setTrees([...trees, tree]);
      setShowCreate(false);
      setNewTreeName('');
      setNewTreeDesc('');
      navigate(`/tree/${tree._id}`);
    } catch (err) {
      alert('Failed to create tree: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this family tree? This cannot be undone.'))
      return;
    try {
      await deleteTree(id);
      setTrees(trees.filter((t) => t._id !== id));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {user?.firstName || user?.displayName}!</h1>
          <p>Manage your family trees below</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Family Tree
        </button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Family Tree</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Tree Name</label>
                <input
                  type="text"
                  placeholder="e.g. The Smith Family"
                  value={newTreeName}
                  onChange={(e) => setNewTreeName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  placeholder="A brief description of this family tree"
                  value={newTreeDesc}
                  onChange={(e) => setNewTreeDesc(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Tree
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {trees.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🌱</span>
          <h2>No family trees yet</h2>
          <p>Create your first family tree to get started!</p>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            Create Your First Tree
          </button>
        </div>
      ) : (
        <div className="tree-grid">
          {trees.map((tree) => (
            <div
              key={tree._id}
              className="tree-card"
              onClick={() => navigate(`/tree/${tree._id}`)}
            >
              <div className="tree-card-icon">🌳</div>
              <h3>{tree.name}</h3>
              {tree.description && <p>{tree.description}</p>}
              <div className="tree-card-meta">
                <span>{tree.members?.length || 0} members</span>
                <span>
                  {new Date(tree.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(tree._id);
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
