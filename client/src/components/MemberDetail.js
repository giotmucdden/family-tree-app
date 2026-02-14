import React from 'react';

function countDescendantGenerations(memberId, allMembers, visited = new Set()) {
  if (visited.has(memberId)) return 0;
  visited.add(memberId);

  const member = allMembers.find(
    (m) => (m._id || m) === memberId || m._id?.toString() === memberId?.toString()
  );
  if (!member || !member.childrenIds || member.childrenIds.length === 0) return 0;

  let maxChildDepth = 0;
  for (const cid of member.childrenIds) {
    const childId = typeof cid === 'object' && cid._id ? cid._id : cid;
    const depth = countDescendantGenerations(childId, allMembers, visited);
    maxChildDepth = Math.max(maxChildDepth, depth);
  }
  return 1 + maxChildDepth;
}

function MemberDetail({ member, allMembers, onClose, onEdit, onDelete, onAddChild, onCreateBranch }) {
  const resolveName = (ref) => {
    if (!ref) return null;
    if (typeof ref === 'object') return `${ref.firstName} ${ref.lastName}`;
    return 'Linked';
  };

  const statusIcon = (status) => {
    if (status === 'married') return '💚 Married';
    if (status === 'divorced') return '⚡ Divorced';
    if (status === 'widowed') return '🕊️ Widowed';
    return status;
  };

  const statusBadgeClass = (status) => {
    if (status === 'married') return 'badge-married';
    if (status === 'divorced') return 'badge-divorced';
    if (status === 'widowed') return 'badge-widowed';
    return '';
  };

  const generations = allMembers
    ? countDescendantGenerations(member._id, allMembers)
    : 0;

  return (
    <div className="member-detail-panel">
      <div className="member-detail-header">
        <div className="member-avatar-lg">
          {member.gender === 'male'
            ? '👨'
            : member.gender === 'female'
            ? '👩'
            : '🧑'}
        </div>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
      </div>

      <h3>
        {member.firstName} {member.lastName}
      </h3>

      <div className="member-info">
        {member.gender && (
          <div className="info-row">
            <span className="info-label">Gender</span>
            <span className="info-value">
              {member.gender.charAt(0).toUpperCase() + member.gender.slice(1)}
            </span>
          </div>
        )}

        {member.birthDate && (
          <div className="info-row">
            <span className="info-label">Born</span>
            <span className="info-value">
              {new Date(member.birthDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {!member.isLiving && member.deathDate && (
          <div className="info-row">
            <span className="info-label">Died</span>
            <span className="info-value">
              {new Date(member.deathDate).toLocaleDateString()}
            </span>
          </div>
        )}

        <div className="info-row">
          <span className="info-label">Status</span>
          <span
            className={`info-badge ${member.isLiving ? 'living' : 'deceased'}`}
          >
            {member.isLiving ? '● Living' : '○ Deceased'}
          </span>
        </div>

        {member.birthPlace && (
          <div className="info-row">
            <span className="info-label">Birth Place</span>
            <span className="info-value">{member.birthPlace}</span>
          </div>
        )}

        {member.occupation && (
          <div className="info-row">
            <span className="info-label">Occupation</span>
            <span className="info-value">{member.occupation}</span>
          </div>
        )}

        {member.email && (
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{member.email}</span>
          </div>
        )}

        {member.phone && (
          <div className="info-row">
            <span className="info-label">Phone</span>
            <span className="info-value">{member.phone}</span>
          </div>
        )}

        <div className="info-section-label">Family</div>

        {resolveName(member.fatherId) && (
          <div className="info-row">
            <span className="info-label">👨 Father</span>
            <span className="info-value info-link-father">
              {resolveName(member.fatherId)}
            </span>
          </div>
        )}

        {resolveName(member.motherId) && (
          <div className="info-row">
            <span className="info-label">👩 Mother</span>
            <span className="info-value info-link-mother">
              {resolveName(member.motherId)}
            </span>
          </div>
        )}

        {member.spouses && member.spouses.length > 0 && (
          <>
            <div className="info-section-label" style={{ marginTop: 8 }}>
              Spouses
            </div>
            {member.spouses.map((sp, idx) => {
              const spouseName = resolveName(sp.memberId);
              return spouseName ? (
                <div className="info-row" key={idx}>
                  <span className="info-label">❤️ {spouseName}</span>
                  <span className={`info-badge ${statusBadgeClass(sp.status)}`}>
                    {statusIcon(sp.status)}
                  </span>
                </div>
              ) : null;
            })}
          </>
        )}

        {member.childrenIds?.length > 0 && (
          <div className="info-row">
            <span className="info-label">Children</span>
            <span className="info-value">
              {member.childrenIds
                .map((c) =>
                  typeof c === 'object'
                    ? `${c.firstName} ${c.lastName}`
                    : 'Unknown'
                )
                .join(', ')}
            </span>
          </div>
        )}

        {member.bio && (
          <div className="info-row info-bio">
            <span className="info-label">Bio</span>
            <p className="info-value">{member.bio}</p>
          </div>
        )}
      </div>

      <div className="member-detail-actions">
        <button className="btn btn-primary btn-sm" onClick={onEdit}>
          ✏️ Edit
        </button>
        <button className="btn btn-outline btn-sm" onClick={onAddChild}>
          👶 Add Child
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>
          🗑️ Delete
        </button>
      </div>

      {generations >= 3 && onCreateBranch && (
        <div className="branch-tree-section">
          <button
            className="btn btn-branch"
            onClick={() => onCreateBranch(member._id)}
          >
            🌳 Create Family Tree ({generations} generations)
          </button>
          <p className="branch-hint">
            Branch this member and all descendants into a new tree on your Dashboard.
          </p>
        </div>
      )}
    </div>
  );
}

export default MemberDetail;
