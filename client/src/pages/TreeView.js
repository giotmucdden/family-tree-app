import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTree, addMember, updateMember, deleteMember, createBranchTree, exportMembersExcel, importMembersExcel } from '../api';
import FamilyTreeCanvas from '../components/FamilyTreeCanvas';
import MemberModal from '../components/MemberModal';
import MemberBottomBar from '../components/MemberBottomBar';
import RelationshipPopup from '../components/RelationshipPopup';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

function TreeView() {
  const { t } = useLanguage();
  const { user, isAdmin, canEditMember } = useAuth();
  const { treeId } = useParams();
  const navigate = useNavigate();
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addParentInfo, setAddParentInfo] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [viewMode, setViewMode] = useState('full'); // 'full' = Tree View, 'branch' = Branch View
  const [relationshipMode, setRelationshipMode] = useState(false); // Vai Vế mode
  const [relationshipMembers, setRelationshipMembers] = useState([]); // Selected members for comparison
  const fileInputRef = useRef(null);

  // Helper to format member name
  const formatMemberName = (m) => {
    if (!m) return '';
    const parts = [m.lastName, m.middleName, m.vnName, m.firstName].filter(Boolean);
    return parts.join(' ');
  };

  // Handle member selection in relationship mode
  const handleMemberSelect = useCallback((member) => {
    if (relationshipMode && member) {
      setRelationshipMembers(prev => {
        if (prev.length === 0) {
          return [member];
        } else if (prev.length === 1 && prev[0]._id !== member._id) {
          return [prev[0], member];
        } else if (prev.length === 2) {
          // When 2 members are already selected, clicking starts a new comparison
          return [member];
        }
        return prev;
      });
    } else {
      setSelectedMember(member);
    }
  }, [relationshipMode]);

  // Debug: log user role
  console.log('TreeView - User:', user?.email, 'Role:', user?.role, 'isAdmin():', isAdmin());

  const loadTree = useCallback(async () => {
    try {
      const data = await getTree(treeId);
      console.log('TreeView - loadTree: received', data?.members?.length, 'members');
      // Force new reference to trigger React re-render
      setTree({ ...data, members: [...(data.members || [])] });
    } catch (err) {
      console.error('Không thể tải cây:', err);
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
            if (parent.spouses && parent.spouses.length > 0) {
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
      alert('Thêm thành viên thất bại: ' + err.message);
    }
  }

  async function handleUpdateMember(memberData) {
    try {
      await updateMember(treeId, editingMember._id, memberData);
      await loadTree();
      setEditingMember(null);
      setSelectedMember(null);
    } catch (err) {
      alert('Cập nhật thất bại: ' + err.message);
    }
  }

  async function handleDeleteMember(memberId) {
    if (!window.confirm('Xóa thành viên này?')) return;
    try {
      await deleteMember(treeId, memberId);
      await loadTree();
      setSelectedMember(null);
    } catch (err) {
      alert('Xóa thất bại: ' + err.message);
    }
  }

  function handleAddChild(parentMemberId) {
    setAddParentInfo({ id: parentMemberId });
    setShowAddModal(true);
  }

  async function handleCreateBranch(rootMemberId) {
    if (!window.confirm('Tạo cây gia phả mới từ thành viên này và tất cả con cháu?')) return;
    try {
      await createBranchTree(treeId, rootMemberId);
      navigate('/');
    } catch (err) {
      alert('Tạo nhánh thất bại: ' + err.message);
    }
  }

  async function handleExport() {
    try {
      await exportMembersExcel(treeId);
    } catch (err) {
      alert('Xuất file thất bại: ' + err.message);
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
          {t('tree_back')}
        </button>
        <h2>{tree?.name}</h2>
        <div className="toolbar-actions">
          {/* Admin-only actions */}
          {isAdmin() && (
            <>
              <button className="btn btn-outline btn-export" onClick={handleExport}>
                {t('tree_export')}
              </button>
              <button
                className="btn btn-outline btn-import"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? t('tree_importing') : t('tree_import')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.numbers"
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
                {t('tree_add_member')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* View Mode Toggle - 2x2 grid */}
      <div className="view-toggle-bar">
        <button
          className={`toggle-btn ${viewMode === 'full' ? 'active' : ''}`}
          onClick={() => { setViewMode('full'); setRelationshipMode(false); }}
        >
          🌳 Tree View
        </button>
        <button
          className={`toggle-btn ${viewMode === 'branch' ? 'active' : ''}`}
          onClick={() => { setViewMode('branch'); setRelationshipMode(false); }}
        >
          🌿 Branch View
        </button>
        {isAdmin() && (
          <button
            className={`toggle-btn ${relationshipMode ? 'active' : ''}`}
            onClick={() => {
              const newMode = !relationshipMode;
              setRelationshipMode(newMode);
              setRelationshipMembers([]);
              if (newMode) {
                setSelectedMember(null); // Close bottom bar when activating Vai Vế
              }
            }}
          >
            👥 Vai Vế
          </button>
        )}
      </div>

      {/* Relationship Mode Instructions */}
      {relationshipMode && (
        <div className="relationship-instruction">
          {relationshipMembers.length === 0 && (
            <>
              <div className="relationship-slot empty">
                <span className="slot-placeholder">👆 Chọn người 1</span>
              </div>
              <div className="relationship-slot-divider">❓</div>
              <div className="relationship-slot empty">
                <span className="slot-placeholder">👆 Chọn người 2</span>
              </div>
            </>
          )}
          {relationshipMembers.length === 1 && (
            <>
              <div className="relationship-slot filled">
                <div className="slot-photo">
                  {relationshipMembers[0]?.photo ? (
                    <img src={relationshipMembers[0].photo} alt="" />
                  ) : (
                    <span>{relationshipMembers[0]?.gender === 'male' ? '👨' : relationshipMembers[0]?.gender === 'female' ? '👩' : '👤'}</span>
                  )}
                </div>
                <div className="slot-info">
                  <span className="slot-name">{formatMemberName(relationshipMembers[0])}</span>
                  <span className="slot-details">
                    {relationshipMembers[0]?.gender === 'male' ? '♂ Nam' : relationshipMembers[0]?.gender === 'female' ? '♀ Nữ' : '⚬'}
                  </span>
                </div>
              </div>
              <div className="relationship-slot-divider">❓</div>
              <div className="relationship-slot empty">
                <span className="slot-placeholder">👆 Chọn người 2</span>
              </div>
            </>
          )}
          {relationshipMembers.length === 2 && (
            <RelationshipPopup
              member1={relationshipMembers[0]}
              member2={relationshipMembers[1]}
              allMembers={tree?.members || []}
            />
          )}
        </div>
      )}

      <div className="tree-container">
        <FamilyTreeCanvas
          members={tree?.members || []}
          treeId={treeId}
          treeRootId={tree?.rootMember}
          onSelectMember={relationshipMode ? handleMemberSelect : setSelectedMember}
          onAddChild={handleAddChild}
          isAdmin={isAdmin()}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          userLinkedMemberId={!isAdmin() ? user?.linkedMemberId : null}
          relationshipMode={relationshipMode}
          relationshipMembers={relationshipMembers}
        />
      </div>

      {/* Enhanced Bottom Bar - replaces right panel */}
      {selectedMember && (
        <MemberBottomBar
          member={selectedMember}
          allMembers={tree?.members || []}
          onClose={() => setSelectedMember(null)}
          onEdit={() => setEditingMember(selectedMember)}
          onSelectMember={setSelectedMember}
          canEdit={isAdmin() || canEditMember(selectedMember._id, tree?.members || [])}
        />
      )}

      {showAddModal && (
        <MemberModal
          title={addParentInfo ? t('tree_add_child') : t('modal_add_member')}
          members={tree?.members || []}
          parentInfo={addParentInfo}
          onSubmit={handleAddMember}
          onClose={() => {
            setShowAddModal(false);
            setAddParentInfo(null);
          }}
        />
      )}

      {editingMember && (
        <MemberModal
          title={t('modal_edit_member')}
          initialData={editingMember}
          members={tree?.members || []}
          onSubmit={handleUpdateMember}
          onClose={() => setEditingMember(null)}
          onAddChild={isAdmin() || canEditMember(editingMember._id, tree?.members || []) ? () => {
            const memberId = editingMember._id;
            setEditingMember(null);
            handleAddChild(memberId);
          } : null}
          onDelete={isAdmin() || canEditMember(editingMember._id, tree?.members || []) ? () => {
            const memberId = editingMember._id;
            setEditingMember(null);
            handleDeleteMember(memberId);
          } : null}
        />
      )}

      {importing && (
        <div className="import-overlay">
          <div className="import-progress">
            <div className="spinner" />
            <p>{t('tree_import_progress')}</p>
          </div>
        </div>
      )}

      {importResult && (
        <div className="import-overlay" onClick={() => setImportResult(null)}>
          <div className="import-result" onClick={(e) => e.stopPropagation()}>
            {importResult.error ? (
              <>
                <h3>❌ {t('tree_import_failed')}</h3>
                <p className="import-error">{importResult.error}</p>
              </>
            ) : (
              <>
                <h3>✅ {t('tree_import_success')}</h3>
                <div className="import-stats">
                  <span className="stat-created">🆕 {importResult.created} {t('tree_import_created')}</span>
                  <span className="stat-updated">✏️ {importResult.updated} {t('tree_import_updated')}</span>
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="import-warnings">
                    <h4>⚠️ {importResult.errors.length} {t('tree_import_issues')}:</h4>
                    <ul>
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            <button className="btn btn-primary" onClick={() => setImportResult(null)}>{t('tree_close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TreeView;
