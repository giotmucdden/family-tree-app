import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTree, addMember, updateMember, deleteMember, createBranchTree, exportMembersExcel, importMembersExcel } from '../api';
import FamilyTreeCanvas from '../components/FamilyTreeCanvas';
import MemberModal from '../components/MemberModal';
import MemberDetail from '../components/MemberDetail';
import MemberBottomBar from '../components/MemberBottomBar';

function TreeView() {
  const { treeId } = useParams();
  const navigate = useNavigate();
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addParentInfo, setAddParentInfo] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const loadTree = useCallback(async () => {
    try {
      const data = await getTree(treeId);
      setTree(data);
    } catch (err) {
      console.error('Failed to load tree:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [treeId, navigate]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  async function handleAddMember(memberData) {
    try {
      const payload = { ...memberData };

      if (addParentInfo) {
        const parent = (tree?.members || []).find(
          (m) => m._id === addParentInfo.id
        );
        if (parent) {
          if (parent.gender === 'male') {
            payload.fatherId = parent._id;
            // Find mother from the parent's spouses array
            if (parent.spouses && parent.spouses.length > 0) {
              // Prefer current married spouse, otherwise first spouse
              const marriedSpouse = parent.spouses.find(
                (sp) => sp.status === 'married'
              );
              const spouseEntry = marriedSpouse || parent.spouses[0];
              const spouseId =
                typeof spouseEntry.memberId === 'object'
                  ? spouseEntry.memberId._id
                  : spouseEntry.memberId;
              if (spouseId) payload.motherId = spouseId;
            }
          } else if (parent.gender === 'female') {
            payload.motherId = parent._id;
            if (parent.spouses && parent.spouses.length > 0) {
              const marriedSpouse = parent.spouses.find(
                (sp) => sp.status === 'married'
              );
              const spouseEntry = marriedSpouse || parent.spouses[0];
              const spouseId =
                typeof spouseEntry.memberId === 'object'
                  ? spouseEntry.memberId._id
                  : spouseEntry.memberId;
              if (spouseId) payload.fatherId = spouseId;
            }
          } else {
            payload.fatherId = parent._id;
          }
        }
      }

      await addMember(treeId, payload);
      await loadTree();
      setShowAddModal(false);
      setAddParentInfo(null);
    } catch (err) {
      alert('Failed to add member: ' + err.message);
    }
  }

  async function handleUpdateMember(memberData) {
    try {
      await updateMember(treeId, editingMember._id, memberData);
      await loadTree();
      setEditingMember(null);
      setSelectedMember(null);
    } catch (err) {
      alert('Failed to update member: ' + err.message);
    }
  }

  async function handleDeleteMember(memberId) {
    if (!window.confirm('Remove this family member?')) return;
    try {
      await deleteMember(treeId, memberId);
      await loadTree();
      setSelectedMember(null);
    } catch (err) {
      alert('Failed to delete member: ' + err.message);
    }
  }

  function handleAddChild(parentMemberId) {
    setAddParentInfo({ id: parentMemberId });
    setShowAddModal(true);
  }

  async function handleCreateBranch(rootMemberId) {
    if (!window.confirm('Create a new family tree from this member and all descendants?')) return;
    try {
      await createBranchTree(treeId, rootMemberId);
      navigate('/');
    } catch (err) {
      alert('Failed to create branch tree: ' + err.message);
    }
  }

  async function handleExport() {
    try {
      await exportMembersExcel(treeId);
    } catch (err) {
      alert('Failed to export: ' + err.message);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importMembersExcel(treeId, file);
      setImportResult(result);
      await loadTree();
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
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
    <div className="tree-view">
      <div className="tree-toolbar">
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h2>{tree?.name}</h2>
        <div className="toolbar-actions">
          <button className="btn btn-outline btn-export" onClick={handleExport}>
            📥 Export Excel
          </button>
          <button
            className="btn btn-outline btn-import"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? '⏳ Importing...' : '📤 Import Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              setAddParentInfo(null);
              setShowAddModal(true);
            }}
          >
            + Add Member
          </button>
        </div>
      </div>

      <div className="tree-container">
        <FamilyTreeCanvas
          members={tree?.members || []}
          treeId={treeId}
          treeRootId={tree?.rootMember}
          onSelectMember={setSelectedMember}
          onAddChild={handleAddChild}
        />

        {selectedMember && (
            <MemberBottomBar
              member={selectedMember}
              onClose={() => { setSelectedMember(null); setShowFullProfile(false); }}
              onViewProfile={() => setShowFullProfile(true)}
            />
          )}

          {showFullProfile && selectedMember && (
            <>
              <div className="detail-panel-backdrop" onClick={() => { setSelectedMember(null); setShowFullProfile(false); }} />
              <MemberDetail
                member={selectedMember}
                allMembers={tree?.members || []}
                onClose={() => { setSelectedMember(null); setShowFullProfile(false); }}
                onEdit={() => setEditingMember(selectedMember)}
                onDelete={() => handleDeleteMember(selectedMember._id)}
                onAddChild={() => handleAddChild(selectedMember._id)}
                onCreateBranch={handleCreateBranch}
              />
            </>
          )}
      </div>

      {showAddModal && (
        <MemberModal
          title={addParentInfo ? 'Add Child' : 'Add Family Member'}
          members={tree?.members || []}
          onSubmit={handleAddMember}
          onClose={() => {
            setShowAddModal(false);
            setAddParentInfo(null);
          }}
        />
      )}

      {editingMember && (
        <MemberModal
          title="Edit Member"
          initialData={editingMember}
          members={tree?.members || []}
          onSubmit={handleUpdateMember}
          onClose={() => setEditingMember(null)}
        />
      )}

      {importing && (
        <div className="import-overlay">
          <div className="import-progress">
            <div className="spinner" />
            <p>Importing members... This may take a moment for large files.</p>
          </div>
        </div>
      )}

      {importResult && (
        <div className="import-overlay" onClick={() => setImportResult(null)}>
          <div className="import-result" onClick={(e) => e.stopPropagation()}>
            {importResult.error ? (
              <>
                <h3>❌ Import Failed</h3>
                <p className="import-error">{importResult.error}</p>
              </>
            ) : (
              <>
                <h3>✅ Import Complete</h3>
                <div className="import-stats">
                  <span className="stat-created">🆕 {importResult.created} created</span>
                  <span className="stat-updated">✏️ {importResult.updated} updated</span>
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="import-warnings">
                    <h4>⚠️ {importResult.errors.length} issue(s):</h4>
                    <ul>
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            <button className="btn btn-primary" onClick={() => setImportResult(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TreeView;
