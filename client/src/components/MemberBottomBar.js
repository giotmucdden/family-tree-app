import { useLanguage } from '../context/LanguageContext';

function MemberBottomBar({ member, allMembers, onClose, onEdit, onSelectMember, canEdit = true }) {
  const { t } = useLanguage();

  const resolveMember = (ref) => {
    if (!ref) return null;
    if (typeof ref === 'object') return ref;
    return allMembers?.find((m) => m._id === ref) || null;
  };

  const resolveName = (ref) => {
    const m = resolveMember(ref);
    if (!m) return null;
    // Short name: last-vn-first order (without middleName)
    const parts = [];
    if (m.lastName) parts.push(m.lastName);
    if (m.vnName) parts.push(m.vnName);
    if (m.firstName) parts.push(m.firstName);
    return parts.join(' ');
  };

  const handleMemberClick = (ref) => {
    if (!ref || !onSelectMember) return;

    // Get the member ID from the reference
    let memberId;
    if (typeof ref === 'object' && ref._id) {
      memberId = ref._id;
    } else if (typeof ref === 'string') {
      memberId = ref;
    } else {
      return;
    }

    // Find the full member from allMembers by ID
    const fullMember = allMembers?.find((m) => m._id === memberId || m._id.toString() === memberId.toString());
    if (fullMember) {
      onSelectMember(fullMember);
    }
  };

  const age = (() => {
    if (!member.birthDate) return null;
    const birth = new Date(member.birthDate);
    const end = member.isLiving
      ? new Date()
      : member.deathDate
      ? new Date(member.deathDate)
      : new Date();
    let a = end.getFullYear() - birth.getFullYear();
    const mDiff = end.getMonth() - birth.getMonth();
    if (mDiff < 0 || (mDiff === 0 && end.getDate() < birth.getDate())) a--;
    return a;
  })();

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    // Parse date string directly to avoid timezone issues
    // Database stores dates like "1990-05-15T00:00:00.000Z"
    // We want to display the date as stored, not converted to local timezone
    const dateOnly = dateStr.substring(0, 10); // "1990-05-15"
    const [year, month, day] = dateOnly.split('-');
    // Vietnamese style: Ngày ... Tháng ... Năm ...
    return `Ngày ${parseInt(day, 10)} Tháng ${parseInt(month, 10)} Năm ${year}`;
  };

  const fatherMember = resolveMember(member.fatherId);
  const motherMember = resolveMember(member.motherId);

  const spouseInfo = (member.spouses || [])
    .map((sp) => {
      const spouseMember = resolveMember(sp.memberId);
      return spouseMember ? { member: spouseMember, name: resolveName(sp.memberId), status: sp.status } : null;
    })
    .filter(Boolean);

  const childrenInfo = (member.childrenIds || [])
    .map((c) => {
      const childMember = resolveMember(c);
      return childMember ? { member: childMember, name: resolveName(c) } : null;
    })
    .filter(Boolean);

  const statusIcon = (status) => {
    if (status === 'married') return '💚';
    if (status === 'divorced') return '⚡';
    if (status === 'widowed') return '🕊️';
    return '';
  };

  return (
    <div className="member-bottom-bar-enhanced">
      <div className="bottom-bar-header">
        <button className="bottom-bar-close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="bottom-bar-content">
        {/* Left: Photo + Basic Info */}
        <div className="bottom-bar-main">
          <div className="bottom-bar-photo">
            {member.photo ? (
              <img src={member.photo} alt={member.firstName} />
            ) : (
              <span className="photo-emoji">
                {!member.isLiving ? '🪦' : member.gender === 'male' ? '👨' : member.gender === 'female' ? '👩' : '🧑'}
              </span>
            )}
          </div>

          <div className="bottom-bar-basic">
            <h3 className="member-fullname">
              {member.saintName && <span className="saint-name">{member.saintName} </span>}
              {member.lastName} {member.middleName && `${member.middleName} `}{member.vnName && `${member.vnName} `}{member.firstName}
            </h3>

            <div className="member-meta">
              <span className={`status-badge ${member.isLiving ? 'living' : 'deceased'}`}>
                {member.isLiving ? t('detail_living') : t('detail_deceased')}
              </span>
              <span className="gender-badge">
                {member.gender === 'male' ? '♂ Nam' : member.gender === 'female' ? '♀ Nữ' : '⚬ Khác'}
              </span>
            </div>

            <div className="member-dates">
              {member.birthDate && (
                <span>🎂 {formatDate(member.birthDate)}</span>
              )}
              {!member.isLiving && member.deathDate && (
                <span>✝️ {formatDate(member.deathDate)}</span>
              )}
              {age != null && (
                <span className="age-info">
                  ({member.isLiving ? `${age} tuổi` : `mất năm ${age} tuổi`})
                </span>
              )}
            </div>

            {member.birthPlace && (
              <div className="member-extra">📍 {member.birthPlace}</div>
            )}
            {member.occupation && (
              <div className="member-extra">💼 {member.occupation}</div>
            )}
          </div>
        </div>

        {/* Center: Family Links */}
        <div className="bottom-bar-family">
          {/* Parents */}
          {(fatherMember || motherMember) && (
            <div className="family-section">
              <div className="family-section-title">{t('detail_parents')}</div>
              <div className="family-links">
                {fatherMember && (
                  <button className="family-link-btn" onClick={() => handleMemberClick(member.fatherId)}>
                    <span className="link-icon">👨 </span>{resolveName(member.fatherId)}
                  </button>
                )}
                {motherMember && (
                  <button className="family-link-btn" onClick={() => handleMemberClick(member.motherId)}>
                    <span className="link-icon">👩 </span>{resolveName(member.motherId)}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Spouses */}
          {spouseInfo.length > 0 && (
            <div className="family-section">
              <div className="family-section-title">{t('detail_spouses')}</div>
              <div className="family-links">
                {spouseInfo.map((sp, idx) => (
                  <button key={idx} className="family-link-btn" onClick={() => handleMemberClick(sp.member)}>
                    <span className="link-icon">{statusIcon(sp.status)} </span>{sp.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Children */}
          {childrenInfo.length > 0 && (
            <div className="family-section">
              <div className="family-section-title">{t('detail_children')} ({childrenInfo.length})</div>
              <div className="family-links children-grid">
                {childrenInfo.map((ch, idx) => (
                  <button key={idx} className="family-link-btn small" onClick={() => handleMemberClick(ch.member)}>
                    <span className="link-icon">👶 </span>{ch.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions - Only show if user can edit */}
        {canEdit && (
          <div className="bottom-bar-actions">
            <button className="action-btn edit" onClick={onEdit}>
              {t('detail_edit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemberBottomBar;
