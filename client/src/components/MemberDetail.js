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
    return 'Đã liên kết';
  };

  const statusIcon = (status) => {
    if (status === 'married') return '💚 Kết hôn';
    if (status === 'divorced') return '⚡ Ly hôn';
    if (status === 'widowed') return '🕊️ Góa';
    return status;
  };

  const statusBadgeClass = (status) => {
    if (status === 'married') return 'badge-married';
    if (status === 'divorced') return 'badge-divorced';
    if (status === 'widowed') return 'badge-widowed';
    return '';
  };

  const genderText = (gender) => {
    if (gender === 'male') return 'Nam';
    if (gender === 'female') return 'Nữ';
    return 'Khác';
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
            <span className="info-label">Giới tính</span>
            <span className="info-value">
              {genderText(member.gender)}
            </span>
          </div>
        )}

        {member.birthDate && (
          <div className="info-row">
            <span className="info-label">Ngày sinh</span>
            <span className="info-value">
              {new Date(member.birthDate).toLocaleDateString('vi-VN')}
            </span>
          </div>
        )}

        {!member.isLiving && member.deathDate && (
          <div className="info-row">
            <span className="info-label">Ngày mất</span>
            <span className="info-value">
              {new Date(member.deathDate).toLocaleDateString('vi-VN')}
            </span>
          </div>
        )}

        <div className="info-row">
          <span className="info-label">Tình trạng</span>
          <span
            className={`info-badge ${member.isLiving ? 'living' : 'deceased'}`}
          >
            {member.isLiving ? '● Còn sống' : '○ Đã mất'}
          </span>
        </div>

        {member.birthPlace && (
          <div className="info-row">
            <span className="info-label">Nơi sinh</span>
            <span className="info-value">{member.birthPlace}</span>
          </div>
        )}

        {member.occupation && (
          <div className="info-row">
            <span className="info-label">Nghề nghiệp</span>
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
            <span className="info-label">Điện thoại</span>
            <span className="info-value">{member.phone}</span>
          </div>
        )}

        <div className="info-section-label">Gia đình</div>

        {resolveName(member.fatherId) && (
          <div className="info-row">
            <span className="info-label">👨 Cha</span>
            <span className="info-value info-link-father">
              {resolveName(member.fatherId)}
            </span>
          </div>
        )}

        {resolveName(member.motherId) && (
          <div className="info-row">
            <span className="info-label">👩 Mẹ</span>
            <span className="info-value info-link-mother">
              {resolveName(member.motherId)}
            </span>
          </div>
        )}

        {member.spouses && member.spouses.length > 0 && (
          <>
            <div className="info-section-label" style={{ marginTop: 8 }}>
              Vợ/Chồng
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
            <span className="info-label">Con cái</span>
            <span className="info-value">
              {member.childrenIds
                .map((c) =>
                  typeof c === 'object'
                    ? `${c.firstName} ${c.lastName}`
                    : 'Không rõ'
                )
                .join(', ')}
            </span>
          </div>
        )}

        {member.bio && (
          <div className="info-row info-bio">
            <span className="info-label">Tiểu sử</span>
            <p className="info-value">{member.bio}</p>
          </div>
        )}
      </div>

      <div className="member-detail-actions">
        <button className="btn btn-primary btn-sm" onClick={onEdit}>
          ✏️ Sửa
        </button>
        <button className="btn btn-outline btn-sm" onClick={onAddChild}>
          👶 Thêm Con
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>
          🗑️ Xóa
        </button>
      </div>

      {generations >= 3 && onCreateBranch && (
        <div className="branch-tree-section">
          <button
            className="btn btn-branch"
            onClick={() => onCreateBranch(member._id)}
          >
            🌳 Tạo Gia Phả ({generations} thế hệ)
          </button>
          <p className="branch-hint">
            Tách thành viên này và tất cả con cháu thành cây gia phả mới trên Bảng điều khiển.
          </p>
        </div>
      )}
    </div>
  );
}

export default MemberDetail;
