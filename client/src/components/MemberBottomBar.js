function MemberBottomBar({ member, onClose, onViewProfile }) {
  const resolveName = (ref) => {
    if (!ref) return null;
    if (typeof ref === 'object') return `${ref.firstName} ${ref.lastName}`;
    return null;
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

  const birthYear = member.birthDate
    ? new Date(member.birthDate).getFullYear()
    : null;
  const deathYear =
    !member.isLiving && member.deathDate
      ? new Date(member.deathDate).getFullYear()
      : null;

  const fatherName = resolveName(member.fatherId);
  const motherName = resolveName(member.motherId);

  const spouseInfo = (member.spouses || [])
    .map((sp) => {
      const name = resolveName(sp.memberId);
      return name ? { name, status: sp.status } : null;
    })
    .filter(Boolean);

  const childCount = member.childrenIds?.length || 0;

  return (
    <div className="member-bottom-bar">
      <div className="bottom-bar-inner">
        <div className="bottom-bar-avatar">
          {!member.isLiving
            ? '🪦'
            : member.gender === 'male'
            ? '👨'
            : member.gender === 'female'
            ? '👩'
            : '🧑'}
        </div>

        <div className="bottom-bar-name">
          <span className="bottom-bar-fullname">
            {member.firstName} {member.lastName}
          </span>
          <span className="bottom-bar-life">
            {birthYear && (
              <>
                {deathYear ? `${birthYear} – ${deathYear}` : `sinh ${birthYear}`}
              </>
            )}
            {age != null && (
              <span className="bottom-bar-age">
                ({member.isLiving ? `${age} tuổi` : `mất lúc ${age} tuổi`})
              </span>
            )}
          </span>
        </div>

        <span className="bottom-bar-divider" />

        <div className="bottom-bar-info">
          <span
            className={`bottom-bar-status ${
              member.isLiving ? 'living' : 'deceased'
            }`}
          >
            {member.isLiving ? '● Còn sống' : '○ Đã mất'}
          </span>
          {member.gender && (
            <span className="bottom-bar-gender">
              {member.gender === 'male'
                ? '♂ Nam'
                : member.gender === 'female'
                ? '♀ Nữ'
                : '⚥ Khác'}
            </span>
          )}
        </div>

        <span className="bottom-bar-divider" />

        <div className="bottom-bar-family">
          {fatherName && (
            <span className="bottom-bar-relation">
              👨 <strong>Cha:</strong> {fatherName}
            </span>
          )}
          {motherName && (
            <span className="bottom-bar-relation">
              👩 <strong>Mẹ:</strong> {motherName}
            </span>
          )}
          {spouseInfo.length > 0 &&
            spouseInfo.map((sp, i) => (
              <span key={i} className="bottom-bar-relation">
                ❤️ <strong>{sp.status === 'divorced' ? 'Cựu' : 'Vợ/Chồng'}:</strong>{' '}
                {sp.name}
              </span>
            ))}
          {childCount > 0 && (
            <span className="bottom-bar-relation">
              👶 <strong>Con:</strong> {childCount}
            </span>
          )}
        </div>

        <div className="bottom-bar-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onViewProfile && onViewProfile(member)}
          >
            Xem Hồ Sơ
          </button>
          <button className="bottom-bar-close" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default MemberBottomBar;
