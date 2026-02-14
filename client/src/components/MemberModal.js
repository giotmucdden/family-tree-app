import React, { useState } from 'react';

function MemberModal({ title, initialData, members, onSubmit, onClose }) {
  const resolveId = (ref) => {
    if (!ref) return '';
    return typeof ref === 'object' ? ref._id : ref;
  };

  const initSpouses = () => {
    if (initialData?.spouses && initialData.spouses.length > 0) {
      return initialData.spouses.map((sp) => ({
        memberId: resolveId(sp.memberId),
        status: sp.status || 'married',
      }));
    }
    return [];
  };

  const [form, setForm] = useState({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    gender: initialData?.gender || 'other',
    birthDate: initialData?.birthDate
      ? initialData.birthDate.substring(0, 10)
      : '',
    deathDate: initialData?.deathDate
      ? initialData.deathDate.substring(0, 10)
      : '',
    isLiving: initialData?.isLiving !== undefined ? initialData.isLiving : true,
    bio: initialData?.bio || '',
    birthPlace: initialData?.birthPlace || '',
    occupation: initialData?.occupation || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    fatherId: resolveId(initialData?.fatherId),
    motherId: resolveId(initialData?.motherId),
  });

  const [spouses, setSpouses] = useState(initSpouses);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleSpouseChange(index, field, value) {
    setSpouses((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addSpouseRow() {
    setSpouses((prev) => [...prev, { memberId: '', status: 'married' }]);
  }

  function removeSpouseRow(index) {
    setSpouses((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert('Họ và tên là bắt buộc');
      return;
    }
    const data = { ...form };
    if (!data.birthDate) delete data.birthDate;
    if (!data.deathDate) delete data.deathDate;
    if (!data.fatherId) delete data.fatherId;
    if (!data.motherId) delete data.motherId;

    const validSpouses = spouses.filter((sp) => sp.memberId);
    data.spouses = validSpouses;

    onSubmit(data);
  }

  const males = members.filter(
    (m) => m.gender === 'male' && m._id !== initialData?._id
  );
  const females = members.filter(
    (m) => m.gender === 'female' && m._id !== initialData?._id
  );
  const potentialSpouses = members.filter(
    (m) => m._id !== initialData?._id
  );

  const usedSpouseIds = spouses.map((sp) => sp.memberId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Tên *</label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Tên"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Họ *</label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Họ"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Giới tính</label>
              <select name="gender" value={form.gender} onChange={handleChange}>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="isLiving"
                  checked={form.isLiving}
                  onChange={handleChange}
                />
                &nbsp;Còn sống
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Ngày sinh</label>
              <input
                type="date"
                name="birthDate"
                value={form.birthDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Ngày mất</label>
              <input
                type="date"
                name="deathDate"
                value={form.deathDate}
                onChange={handleChange}
                disabled={form.isLiving}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nơi sinh</label>
              <input
                type="text"
                name="birthPlace"
                value={form.birthPlace}
                onChange={handleChange}
                placeholder="Thành phố, Quốc gia"
              />
            </div>
            <div className="form-group">
              <label>Nghề nghiệp</label>
              <input
                type="text"
                name="occupation"
                value={form.occupation}
                onChange={handleChange}
                placeholder="Nghề nghiệp"
              />
            </div>
          </div>

          <div className="form-section-label">Quan hệ gia đình</div>

          <div className="form-row">
            <div className="form-group">
              <label>👨 Cha</label>
              <select
                name="fatherId"
                value={form.fatherId}
                onChange={handleChange}
              >
                <option value="">-- Không có --</option>
                {males.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>👩 Mẹ</label>
              <select
                name="motherId"
                value={form.motherId}
                onChange={handleChange}
              >
                <option value="">-- Không có --</option>
                {females.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section-label">
            Vợ/Chồng
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginLeft: 12, fontSize: 11, padding: '2px 10px' }}
              onClick={addSpouseRow}
            >
              + Thêm Vợ/Chồng
            </button>
          </div>

          {spouses.length === 0 && (
            <p style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
              Chưa có vợ/chồng. Nhấn "+ Thêm Vợ/Chồng" ở trên để thêm.
            </p>
          )}

          {spouses.map((sp, idx) => (
            <div className="form-row spouse-row" key={idx}>
              <div className="form-group">
                <label>❤️ Vợ/Chồng {idx + 1}</label>
                <select
                  value={sp.memberId}
                  onChange={(e) =>
                    handleSpouseChange(idx, 'memberId', e.target.value)
                  }
                >
                  <option value="">-- Chọn --</option>
                  {potentialSpouses
                    .filter(
                      (m) =>
                        m._id === sp.memberId ||
                        !usedSpouseIds.includes(m._id)
                    )
                    .map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.firstName} {m.lastName} (
                        {m.gender === 'male'
                          ? '♂'
                          : m.gender === 'female'
                          ? '♀'
                          : '⚬'}
                        )
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Tình trạng</label>
                <select
                  value={sp.status}
                  onChange={(e) =>
                    handleSpouseChange(idx, 'status', e.target.value)
                  }
                >
                  <option value="married">💚 Kết hôn</option>
                  <option value="divorced">⚡ Ly hôn</option>
                  <option value="widowed">🕊️ Góa</option>
                </select>
                <button
                  type="button"
                  className="spouse-remove-btn"
                  title="Xóa vợ/chồng"
                  onClick={() => removeSpouseRow(idx)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label>Điện thoại</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+84 123 456 789"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Tiểu sử</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tiểu sử ngắn..."
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              {initialData ? 'Lưu Thay Đổi' : 'Thêm Thành Viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MemberModal;
