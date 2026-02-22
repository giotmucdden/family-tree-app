import React, { useState, useRef } from 'react';
import Modal from 'react-modal';
import { useLanguage } from '../context/LanguageContext';
import SearchableSelect from './SearchableSelect';

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
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  content: {
    position: 'relative',
    inset: 'auto',
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 0,
    padding: 0,
    border: 'none',
    background: '#fff',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideFromTop 0.3s ease-out',
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

function MemberModal({ title, initialData, members, onSubmit, onClose, onAddChild, onDelete, parentInfo }) {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  const resolveId = (ref) => {
    if (!ref) return '';
    return typeof ref === 'object' ? ref._id : ref;
  };

  // Helper to display full member name: lastName middleName vnName firstName
  const formatMemberName = (m) => {
    const parts = [m.lastName, m.middleName, m.vnName, m.firstName].filter(Boolean);
    return parts.join(' ');
  };

  // Calculate parent IDs based on parentInfo
  const getInitialParentIds = () => {
    if (parentInfo && parentInfo.id) {
      const parent = members.find(m => m._id === parentInfo.id);
      if (parent) {
        let fatherId = '';
        let motherId = '';
        if (parent.gender === 'male') {
          fatherId = parent._id;
          // Auto-fill mother from spouse
          if (parent.spouses && parent.spouses.length > 0) {
            const marriedSpouse = parent.spouses.find(sp => sp.status === 'married');
            const spouseEntry = marriedSpouse || parent.spouses[0];
            const spouseId = typeof spouseEntry.memberId === 'object'
              ? spouseEntry.memberId._id
              : spouseEntry.memberId;
            if (spouseId) motherId = spouseId;
          }
        } else if (parent.gender === 'female') {
          motherId = parent._id;
          // Auto-fill father from spouse
          if (parent.spouses && parent.spouses.length > 0) {
            const marriedSpouse = parent.spouses.find(sp => sp.status === 'married');
            const spouseEntry = marriedSpouse || parent.spouses[0];
            const spouseId = typeof spouseEntry.memberId === 'object'
              ? spouseEntry.memberId._id
              : spouseEntry.memberId;
            if (spouseId) fatherId = spouseId;
          }
        } else {
          fatherId = parent._id;
        }
        return { fatherId, motherId };
      }
    }
    return {
      fatherId: resolveId(initialData?.fatherId),
      motherId: resolveId(initialData?.motherId)
    };
  };

  const initialParentIds = getInitialParentIds();

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
    vnName: initialData?.vnName || '',
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
    fatherId: initialParentIds.fatherId,
    motherId: initialParentIds.motherId,
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

    // Resize image before storing to improve canvas performance
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (evt) => {
      img.onload = () => {
        // Target max dimensions for member photos
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;

        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed JPEG (quality 0.8)
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);

        setPhotoPreview(resizedBase64);
        setForm((prev) => ({ ...prev, photo: resizedBase64 }));
      };
      img.src = evt.target.result;
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
    console.log('Form submitted - form data:', JSON.stringify(form, null, 2));
    console.log('vnName value:', form.vnName, 'firstName value:', form.firstName);
    if (!form.lastName.trim()) {
      alert('Họ là bắt buộc');
      return;
    }
    const hasVnName = form.vnName && form.vnName.trim();
    const hasFirstName = form.firstName && form.firstName.trim();
    console.log('hasVnName:', hasVnName, 'hasFirstName:', hasFirstName);
    if (!hasVnName && !hasFirstName) {
      alert('Tên hoặc Tên Việt là bắt buộc (ít nhất một)');
      return;
    }
    console.log('Validation passed, saving...');
    setSaving(true);
    try {
      const data = { ...form };
      if (!data.birthDate) delete data.birthDate;
      if (!data.deathDate) delete data.deathDate;

      // For parent links, send null explicitly to remove the link (not delete the field)
      // This tells the server to clear the parent link
      if (initialData) {
        // Only for editing existing members
        // Handle '__pending__' as empty (user added parent row but didn't select)
        const fatherValue = data.fatherId === '__pending__' ? '' : data.fatherId;
        const motherValue = data.motherId === '__pending__' ? '' : data.motherId;
        data.fatherId = fatherValue || null;
        data.motherId = motherValue || null;
      } else {
        // For new members, just delete empty fields
        if (!data.fatherId || data.fatherId === '__pending__') delete data.fatherId;
        if (!data.motherId || data.motherId === '__pending__') delete data.motherId;
      }

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
        <form id="member-form" onSubmit={handleSubmit} autoComplete="off">
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
              id="input-lastname"
              value={form.lastName}
              onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Nguyễn"
              autoComplete="nope"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              tabIndex={1}
            />
          </div>
          <div className="form-group">
            <label>{t('modal_middle_name')}</label>
            <input
              type="text"
              id="input-middlename"
              value={form.middleName}
              onChange={(e) => setForm(prev => ({ ...prev, middleName: e.target.value }))}
              placeholder="Văn"
              autoComplete="nope"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              tabIndex={2}
            />
          </div>
          <div className="form-group">
            <label>{t('modal_vn_name')} *</label>
            <input
              type="text"
              id="input-vnname"
              value={form.vnName}
              onChange={(e) => setForm(prev => ({ ...prev, vnName: e.target.value }))}
              placeholder="Tên Việt"
              autoComplete="nope"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              tabIndex={3}
            />
          </div>
          <div className="form-group">
            <label>{t('modal_first_name')} *</label>
            <input
              type="text"
              id="input-firstname"
              value={form.firstName}
              onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="An"
              autoComplete="nope"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              tabIndex={4}
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
              type="text"
              name="member-thudt"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@example.com"
              autoComplete="off"
              data-form-type="other"
            />
          </div>
          <div className="form-group">
            <label>{t('modal_phone')}</label>
            <input
              type="text"
              name="member-dienthoai"
              value={form.phone}
              onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+84 123 456 789"
              autoComplete="off"
              data-form-type="other"
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

        <div className="form-section-label">
          {t('modal_family')} - Cha Mẹ
          {!form.fatherId && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginLeft: 12, fontSize: 11, padding: '2px 10px' }}
              onClick={() => setForm(prev => ({ ...prev, fatherId: '__pending__' }))}
            >
              + Thêm Cha
            </button>
          )}
          {!form.motherId && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginLeft: 8, fontSize: 11, padding: '2px 10px' }}
              onClick={() => setForm(prev => ({ ...prev, motherId: '__pending__' }))}
            >
              + Thêm Mẹ
            </button>
          )}
        </div>

        {!form.fatherId && !form.motherId && (
          <p style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
            Chưa có cha mẹ. Nhấn "+ Thêm Cha" hoặc "+ Thêm Mẹ" ở trên để thêm.
          </p>
        )}

        {(form.fatherId) && (
          <div className="form-row spouse-row">
            <div className="form-group" style={{ flex: 1, position: 'relative' }}>
              <label>👨 {t('modal_father')}</label>
              <SearchableSelect
                options={males.map(m => ({ value: m._id, label: formatMemberName(m) }))}
                value={form.fatherId === '__pending__' ? '' : form.fatherId}
                onChange={(value) => setForm(prev => ({ ...prev, fatherId: value }))}
                placeholder="-- Chọn Cha --"
              />
              <button
                type="button"
                className="spouse-remove-btn"
                title="Xóa liên kết cha"
                onClick={() => setForm(prev => ({ ...prev, fatherId: '' }))}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {(form.motherId) && (
          <div className="form-row spouse-row">
            <div className="form-group" style={{ flex: 1, position: 'relative' }}>
              <label>👩 {t('modal_mother')}</label>
              <SearchableSelect
                options={females.map(m => ({ value: m._id, label: formatMemberName(m) }))}
                value={form.motherId === '__pending__' ? '' : form.motherId}
                onChange={(value) => setForm(prev => ({ ...prev, motherId: value }))}
                placeholder="-- Chọn Mẹ --"
              />
              <button
                type="button"
                className="spouse-remove-btn"
                title="Xóa liên kết mẹ"
                onClick={() => setForm(prev => ({ ...prev, motherId: '' }))}
              >
                ✕
              </button>
            </div>
          </div>
        )}

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

        {spouses.map((sp, idx) => {
          const availableSpouses = potentialSpouses.filter(
            (m) => m._id === sp.memberId || !usedSpouseIds.includes(m._id)
          );
          return (
            <div className="form-row spouse-row" key={idx}>
              <div className="form-group">
                <label>❤️ Vợ/Chồng {idx + 1}</label>
                <SearchableSelect
                  options={availableSpouses.map(m => ({
                    value: m._id,
                    label: `${formatMemberName(m)} (${m.gender === 'male' ? '♂' : m.gender === 'female' ? '♀' : '⚬'})`
                  }))}
                  value={sp.memberId}
                  onChange={(value) => handleSpouseChange(idx, 'memberId', value)}
                  placeholder="-- Chọn --"
                />
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
          );
        })}

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
              // Filter out members who already have parent links (fatherId or motherId)
              const availableChildren = members.filter(
                (m) =>
                  m._id !== initialData?._id &&
                  (m._id === ch.memberId || !usedChildIds.includes(m._id)) &&
                  (m._id === ch.memberId || (!m.fatherId && !m.motherId))
              );
              return (
                <div className="form-row spouse-row" key={idx}>
                  <div className="form-group" style={{ flex: 1, position: 'relative' }}>
                    <label>👶 Con {idx + 1}</label>
                    <SearchableSelect
                      options={availableChildren.map(m => ({
                        value: m._id,
                        label: `${formatMemberName(m)} (${m.gender === 'male' ? '♂' : m.gender === 'female' ? '♀' : '⚬'})`
                      }))}
                      value={ch.memberId}
                      onChange={(value) => handleChildChange(idx, value)}
                      placeholder="-- Chọn thành viên --"
                    />
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
      <div className="modal-actions" style={{ flexShrink: 0, display: 'flex', gap: '8px', padding: '12px 16px' }}>
        {initialData && onDelete && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={onDelete}
            style={{ flex: 1 }}
          >
            {t('detail_delete')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline"
          onClick={onClose}
          style={{ flex: initialData && onDelete ? 2 : 1 }}
        >
          {t('modal_cancel')}
        </button>
        <button
          type="submit"
          form="member-form"
          className="btn btn-primary"
          disabled={saving}
          style={{ flex: initialData && onDelete ? 3 : 2 }}
          onClick={() => console.log('Save button clicked')}
        >
          {saving ? t('modal_saving') : (initialData ? t('modal_save') : t('modal_add'))}
        </button>
      </div>
    </Modal>
  );
}

export default MemberModal;
