import React from 'react';
import { useLanguage } from '../context/LanguageContext';

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

function MemberDetail({ member, allMembers, onClose, onEdit, onDelete, onAddChild, onCreateBranch, onSelectMember }) {
  const { t } = useLanguage();

  const resolveMember = (ref) => {
    if (!ref) return null;
    if (typeof ref === 'object') return ref;
    return allMembers.find((m) => m._id === ref);
  };

  const resolveName = (ref) => {
    const m = resolveMember(ref);
    if (!m) return null;
    // saint-last-middle-vn-first order
    const parts = [];
    if (m.saintName) parts.push(m.saintName);
    if (m.lastName) parts.push(m.lastName);
    if (m.middleName) parts.push(m.middleName);
    if (m.vnName) parts.push(m.vnName);
    if (m.firstName) parts.push(m.firstName);
    return parts.join(' ');
  };

  const statusIcon = (status) => {
    if (status === 'married') return `💚 ${t('detail_married')}`;
    if (status === 'divorced') return `⚡ ${t('detail_divorced')}`;
    if (status === 'widowed') return `🕊️ ${t('detail_widowed')}`;
    return status;
  };

  // Format date to avoid timezone issues - Vietnamese style
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const dateOnly = dateStr.substring(0, 10); // "1990-05-15"
    const [year, month, day] = dateOnly.split('-');
    // Vietnamese style: Ngày ... Tháng ... Năm ...
    return `Ngày ${parseInt(day, 10)} Tháng ${parseInt(month, 10)} Năm ${year}`;
  };

  const statusBadgeClass = (status) => {
    if (status === 'married') return 'badge-married';
    if (status === 'divorced') return 'badge-divorced';
    if (status === 'widowed') return 'badge-widowed';
    return '';
  };

  const genderText = (gender) => {
    if (gender === 'male') return t('detail_male');
    if (gender === 'female') return t('detail_female');
    return t('detail_other');
  };

  const generations = allMembers
    ? countDescendantGenerations(member._id, allMembers)
    : 0;

  const handleMemberClick = (ref) => {
    const m = resolveMember(ref);
    if (m && onSelectMember) {
      onSelectMember(m);
    }
  };

  return (
    <div className="member-detail-panel">
      <div className="member-detail-header">
        <div className="member-avatar-lg">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt={member.firstName} />
          ) : member.gender === 'male' ? '👨' : member.gender === 'female' ? '👩' : '🧑'}
        </div>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
      </div>

      <h3>
        {member.saintName && <span className="saint-name">{member.saintName} </span>}
        {member.lastName} {member.middleName && `${member.middleName} `}{member.vnName && `${member.vnName} `}{member.firstName}
      </h3>

      <div className="member-info">
        {member.gender && (
          <div className="info-row">
            <span className="info-label">{t('modal_gender')}</span>
            <span className="info-value">
              {genderText(member.gender)}
            </span>
          </div>
        )}

        {member.birthDate && (
          <div className="info-row">
            <span className="info-label">{t('detail_birth')}</span>
            <span className="info-value">
              {formatDate(member.birthDate)}
            </span>
          </div>
        )}

        {!member.isLiving && member.deathDate && (
          <div className="info-row">
            <span className="info-label">{t('detail_death')}</span>
            <span className="info-value">
              {formatDate(member.deathDate)}
            </span>
          </div>
        )}

        <div className="info-row">
          <span className="info-label">Tình trạng</span>
          <span
            className={`info-badge ${member.isLiving ? 'living' : 'deceased'}`}
          >
            {member.isLiving ? t('detail_living') : t('detail_deceased')}
          </span>
        </div>

        {member.birthPlace && (
          <div className="info-row">
            <span className="info-label">{t('detail_birthplace')}</span>
            <span className="info-value">{member.birthPlace}</span>
          </div>
        )}

        {member.occupation && (
          <div className="info-row">
            <span className="info-label">{t('detail_occupation')}</span>
            <span className="info-value">{member.occupation}</span>
          </div>
        )}

        {member.email && (
          <div className="info-row">
            <span className="info-label">{t('detail_email')}</span>
            <span className="info-value">{member.email}</span>
          </div>
        )}

        {member.phone && (
          <div className="info-row">
            <span className="info-label">{t('detail_phone')}</span>
            <span className="info-value">{member.phone}</span>
          </div>
        )}

        <div className="info-section-label">{t('detail_parents')}</div>

        {resolveName(member.fatherId) && (
          <div className="info-row">
            <span className="info-label">👨 {t('detail_father')}</span>
            <button
              className="profile-link-btn"
              onClick={() => handleMemberClick(member.fatherId)}
            >
              {resolveName(member.fatherId)} →
            </button>
          </div>
        )}

        {resolveName(member.motherId) && (
          <div className="info-row">
            <span className="info-label">👩 {t('detail_mother')}</span>
            <button
              className="profile-link-btn"
              onClick={() => handleMemberClick(member.motherId)}
            >
              {resolveName(member.motherId)} →
            </button>
          </div>
        )}

        {member.spouses && member.spouses.length > 0 && (
          <>
            <div className="info-section-label" style={{ marginTop: 8 }}>
              {t('detail_spouses')}
            </div>
            {member.spouses.map((sp, idx) => {
              const spouseName = resolveName(sp.memberId);
              return spouseName ? (
                <div className="info-row" key={idx}>
                  <button
                    className="profile-link-btn"
                    onClick={() => handleMemberClick(sp.memberId)}
                  >
                    ❤️ {spouseName} →
                  </button>
                  <span className={`info-badge ${statusBadgeClass(sp.status)}`}>
                    {statusIcon(sp.status)}
                  </span>
                </div>
              ) : null;
            })}
          </>
        )}

        {member.childrenIds?.length > 0 && (
          <>
            <div className="info-section-label" style={{ marginTop: 8 }}>
              {t('detail_children')}
            </div>
            {member.childrenIds.map((c, idx) => {
              const child = resolveMember(c);
              if (!child) return null;
              return (
                <div className="info-row" key={idx}>
                  <button
                    className="profile-link-btn"
                    onClick={() => handleMemberClick(c)}
                  >
                    👶 {child.saintName ? `${child.saintName} ` : ''}{child.lastName} {child.middleName ? `${child.middleName} ` : ''}{child.vnName ? `${child.vnName} ` : ''}{child.firstName} →
                  </button>
                </div>
              );
            })}
          </>
        )}

        {member.bio && (
          <div className="info-row info-bio">
            <span className="info-label">{t('detail_bio')}</span>
            <p className="info-value">{member.bio}</p>
          </div>
        )}
      </div>

      <div className="member-detail-actions">
        <button className="btn btn-primary btn-sm" onClick={onEdit}>
          {t('detail_edit')}
        </button>
        <button className="btn btn-outline btn-sm" onClick={onAddChild}>
          {t('detail_add_child')}
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>
          {t('detail_delete')}
        </button>
      </div>

      {generations >= 3 && onCreateBranch && (
        <div className="branch-tree-section">
          <button
            className="btn btn-branch"
            onClick={() => onCreateBranch(member._id)}
          >
            🌳 {t('detail_create_branch')} ({generations} thế hệ)
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
