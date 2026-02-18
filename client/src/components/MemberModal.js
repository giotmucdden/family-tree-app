import React, { useState, useRef } from 'react';
import Modal from 'react-modal';
import { useLanguage } from '../context/LanguageContext';

Modal.setAppElement('#root');

const customStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 0,
    padding: 0,
    border: 'none',
    background: '#fff',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
  },
};

const scrollContainerStyle = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
  padding: '16px',
  touchAction: 'pan-y',
  overscrollBehavior: 'contain',
};

function MemberModal({ title, initialData, members, onSubmit, onClose, onAddChild, onDelete }) {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

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

  const initChildren = () => {
    if (initialData?.childrenIds && initialData.childrenIds.length > 0) {
      return initialData.childrenIds.map((c) => ({
        memberId: resolveId(c),
        isNew: false,
      }));
    }
    return [];
  };

  const [form, setForm] = useState({
    saintName: initialData?.saintName || '',
    firstName: initialData?.firstName || '',
    middleName: initialData?.middleName || '',
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
    photo: initialData?.photo || '',
  });

  const [spouses, setSpouses] = useState(initSpouses);
  const [children, setChildren] = useState(initChildren);
  const [photoPreview, setPhotoPreview] = useState(initialData?.photo || '');
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File quá lớn. Tối đa 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target.result;
      setPhotoPreview(base64);
      setForm((prev) => ({ ...prev, photo: base64 }));
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoPreview('');
    setForm((prev) => ({ ...prev, photo: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  function handleChildChange(index, value) {
    setChildren((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], memberId: value };
      return updated;
    });
  }

  function addChildRow() {
    setChildren((prev) => [...prev, { memberId: '', isNew: false }]);
  }

  function removeChildRow(index) {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert('Họ và tên là bắt buộc');
      return;
    }
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.birthDate) delete data.birthDate;
      if (!data.deathDate) delete data.deathDate;
      if (!data.fatherId) delete data.fatherId;
      if (!data.motherId) delete data.motherId;

      const validSpouses = spouses.filter((sp) => sp.memberId);
      data.spouses = validSpouses;

      const validChildren = children.filter((ch) => ch.memberId);
      data.linkedChildrenIds = validChildren.map((ch) => ch.memberId);

      await onSubmit(data);
    } finally {
      setSaving(false);
    }
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
    <Modal
      isOpen={true}
      onRequestClose={onClose}
      style={customStyles}
      contentLabel={title}
    >
      <div className="modal-header" style={{ flexShrink: 0 }}>
        <h2>{title}</h2>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
      </div>

      {/* Scrollable Form Container */}
      <div style={scrollContainerStyle}>
        <form id="member-form" onSubmit={handleSubmit}>
        <div className="form-section-label">{t('modal_photo')}</div>
        <div className="photo-upload-section">
          {photoPreview ? (
            <div className="photo-preview">
              <img src={photoPreview} alt="Preview" />
              <button type="button" className="btn btn-outline btn-sm" onClick={removePhoto}>
                {t('modal_remove_photo')}
              </button>
            </div>
          ) : (
            <div className="photo-placeholder">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => fileInputRef.current?.click()}
              >
                📷 {t('modal_choose_photo')}
              </button>
              <p className="photo-hint">{t('modal_photo_support')}</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handlePhotoChange}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('modal_saint_name')}</label>
            <input
              type="text"
              name="saintName"
              value={form.saintName}
              onChange={handleChange}
              placeholder="Ví dụ: Giuse, Maria"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('modal_last_name')} *</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Nguyễn"
              required
            />
          </div>
          <div className="form-group">
            <label>{t('modal_middle_name')}</label>
            <input
              type="text"
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              placeholder="Văn"
            />
          </div>
          <div className="form-group">
            <label>{t('modal_first_name')} *</label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="An"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('modal_gender')}</label>
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
              &nbsp;{t('modal_living')}
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('modal_birth_date')}</label>
            <input
              type="date"
              name="birthDate"
              value={form.birthDate}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>{t('modal_death_date')}</label>
            <input
              type="date"
              name="deathDate"
              value={form.deathDate}
              onChange={handleChange}
              disabled={form.isLiving}
              style={form.isLiving ? { backgroundColor: '#f0f0f0', color: '#999', cursor: 'not-allowed' } : {}}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('modal_birthplace')}</label>
            <input
              type="text"
              name="birthPlace"
              value={form.birthPlace}
              onChange={handleChange}
              placeholder="Thành phố, Quốc gia"
            />
          </div>
          <div className="form-group">
            <label>{t('modal_occupation')}</label>
            <input
              type="text"
              name="occupation"
              value={form.occupation}
              onChange={handleChange}
              placeholder="Nghề nghiệp"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('modal_email')}</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@example.com"
            />
          </div>
          <div className="form-group">
            <label>{t('modal_phone')}</label>
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
          <label>{t('modal_bio')}</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Tiểu sử ngắn..."
            rows={3}
          />
        </div>

        <div className="form-section-label">{t('modal_family')}</div>

        <div className="form-row">
          <div className="form-group">
            <label>👨 {t('modal_father')}</label>
            <select
              name="fatherId"
              value={form.fatherId}
              onChange={handleChange}
            >
              <option value="">{t('modal_none')}</option>
              {males.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.lastName} {m.firstName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>👩 {t('modal_mother')}</label>
            <select
              name="motherId"
              value={form.motherId}
              onChange={handleChange}
            >
              <option value="">{t('modal_none')}</option>
              {females.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.lastName} {m.firstName}
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
                      {m.lastName} {m.firstName} (
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

        {initialData && (
          <>
            <div className="form-section-label">
              Con cái
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ marginLeft: 12, fontSize: 11, padding: '2px 10px' }}
                onClick={addChildRow}
              >
                + Thêm Con (chọn thành viên)
              </button>
              {onAddChild && (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  style={{ marginLeft: 8, fontSize: 11, padding: '2px 10px' }}
                  onClick={onAddChild}
                >
                  + Tạo Con mới
                </button>
              )}
            </div>

            {children.length === 0 && (
              <p style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
                Chưa có con. Nhấn "+ Thêm Con" để chọn từ thành viên hiện có hoặc "+ Tạo Con mới" để thêm mới.
              </p>
            )}

            {children.map((ch, idx) => {
              const usedChildIds = children.map((c) => c.memberId);
              const availableChildren = members.filter(
                (m) =>
                  m._id !== initialData?._id &&
                  (m._id === ch.memberId || !usedChildIds.includes(m._id))
              );
              return (
                <div className="form-row spouse-row" key={idx}>
                  <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                    <label>👶 Con {idx + 1}</label>
                    <select
                      value={ch.memberId}
                      onChange={(e) => handleChildChange(idx, e.target.value)}
                    >
                      <option value="">-- Chọn thành viên --</option>
                      {availableChildren.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.lastName} {m.firstName} (
                          {m.gender === 'male'
                            ? '♂'
                            : m.gender === 'female'
                            ? '♀'
                            : '⚬'}
                          )
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="spouse-remove-btn"
                      title="Xóa con"
                      onClick={() => removeChildRow(idx)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Bottom padding for scrolling */}
        <div style={{ height: 20 }} />
        </form>
      </div>

      {/* Fixed Footer */}
      <div className="modal-actions" style={{ flexShrink: 0 }}>
        {initialData && onDelete && (
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            🗑️ {t('detail_delete')}
          </button>
        )}
        <div className="modal-actions-spacer" />
        <button type="button" className="btn btn-outline" onClick={onClose}>
          {t('modal_cancel')}
        </button>
        <button type="submit" form="member-form" className="btn btn-primary" disabled={saving}>
          {saving ? t('modal_saving') : (initialData ? t('modal_save') : t('modal_add'))}
        </button>
      </div>
    </Modal>
  );
}

export default MemberModal;
