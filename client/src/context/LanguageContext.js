import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  vi: {
    // Navbar
    nav_home: 'Trang chủ',
    nav_logout: 'Đăng xuất',
    nav_login: 'Đăng nhập',

    // Dashboard
    dash_title: 'Cây Gia Phả của Bạn',
    dash_create: 'Tạo Cây Mới',
    dash_no_trees: 'Chưa có cây gia phả nào.',
    dash_members: 'thành viên',
    dash_view: 'Xem',
    dash_delete: 'Xóa',
    dash_new_tree_name: 'Tên cây gia phả mới:',
    dash_cancel: 'Hủy',
    dash_create_btn: 'Tạo',

    // TreeView
    tree_back: '← Quay lại',
    tree_export: '📥 Xuất Excel',
    tree_import: '📤 Nhập Excel',
    tree_importing: 'Đang nhập...',
    tree_add_member: '+ Thêm Thành Viên',
    tree_add_child: 'Thêm Con',
    tree_import_progress: 'Đang xử lý file...',
    tree_import_failed: 'Nhập thất bại',
    tree_import_success: 'Nhập thành công!',
    tree_import_created: 'thêm mới',
    tree_import_updated: 'cập nhật',
    tree_import_issues: 'lỗi',
    tree_close: 'Đóng',

    // MemberDetail
    detail_living: '🟢 Còn sống',
    detail_deceased: '⚫ Đã mất',
    detail_male: '♂ Nam',
    detail_female: '♀ Nữ',
    detail_other: '⚥ Khác',
    detail_birth: 'Sinh',
    detail_death: 'Mất',
    detail_age: 'tuổi',
    detail_died_at: 'mất lúc',
    detail_birthplace: 'Nơi sinh',
    detail_occupation: 'Nghề nghiệp',
    detail_email: 'Email',
    detail_phone: 'Điện thoại',
    detail_bio: 'Tiểu sử',
    detail_parents: 'Cha Mẹ',
    detail_father: 'Cha',
    detail_mother: 'Mẹ',
    detail_spouses: 'Vợ/Chồng',
    detail_children: 'Con cái',
    detail_child: 'con',
    detail_edit: '✏️ Sửa',
    detail_add_child: '👶 Thêm Con',
    detail_create_branch: '🌿 Tạo Nhánh',
    detail_delete: '🗑️ Xóa',
    detail_close: 'Đóng',
    detail_view_profile: 'Xem Hồ Sơ',
    detail_married: 'Kết hôn',
    detail_divorced: 'Ly hôn',
    detail_widowed: 'Góa',

    // MemberModal
    modal_add_member: 'Thêm Thành Viên',
    modal_edit_member: 'Sửa Thành Viên',
    modal_photo: 'Ảnh đại diện',
    modal_choose_photo: 'Chọn ảnh',
    modal_remove_photo: 'Xóa ảnh',
    modal_photo_support: 'Hỗ trợ: JPEG, PNG, GIF, WebP (tối đa 5MB)',
    modal_saint_name: 'Tên Thánh',
    modal_last_name: 'Họ',
    modal_middle_name: 'Tên đệm',
    modal_vn_name: 'Tên Việt',
    modal_first_name: 'Tên',
    modal_gender: 'Giới tính',
    modal_living: 'Còn sống',
    modal_birth_date: 'Ngày sinh',
    modal_death_date: 'Ngày mất',
    modal_birthplace: 'Nơi sinh',
    modal_occupation: 'Nghề nghiệp',
    modal_email: 'Email',
    modal_phone: 'Điện thoại',
    modal_bio: 'Tiểu sử',
    modal_family: 'Quan hệ gia đình',
    modal_father: 'Cha',
    modal_mother: 'Mẹ',
    modal_none: '-- Không có --',
    modal_cancel: 'Hủy',
    modal_save: 'Lưu Thay Đổi',
    modal_add: 'Thêm Thành Viên',
    modal_saving: 'Đang lưu...',

    // Login
    login_title: 'Đăng Nhập',
    login_email: 'Email',
    login_password: 'Mật khẩu',
    login_submit: 'Đăng Nhập',
    login_no_account: 'Chưa có tài khoản?',
    login_register: 'Đăng ký',
    login_register_title: 'Đăng Ký',
    login_name: 'Tên',
    login_have_account: 'Đã có tài khoản?',
    login_login: 'Đăng nhập',
    login_error_fill: 'Vui lòng điền đầy đủ thông tin',
    login_error_password: 'Mật khẩu phải có ít nhất 6 ký tự',
    login_error_email_used: 'Email đã được sử dụng',
    login_error_invalid: 'Email hoặc mật khẩu không đúng',

    // Reset Password
    reset_forgot_title: 'Quên Mật Khẩu',
    reset_forgot_desc: 'Nhập email để nhận mã đặt lại mật khẩu',
    reset_forgot_link: 'Quên mật khẩu?',
    reset_title: 'Đặt Lại Mật Khẩu',
    reset_desc: 'Nhập mã đặt lại và mật khẩu mới',
    reset_token: 'Mã đặt lại',
    reset_token_label: 'Mã của bạn',
    reset_new_password: 'Mật khẩu mới',
    reset_send: 'Gửi Mã',
    reset_submit: 'Đặt Lại Mật Khẩu',
    reset_use_token: 'Sử dụng mã này',
    reset_back_login: 'Quay lại Đăng nhập',
  },
  en: {
    // Navbar
    nav_home: 'Home',
    nav_logout: 'Logout',
    nav_login: 'Login',

    // Dashboard
    dash_title: 'Your Family Trees',
    dash_create: 'Create New Tree',
    dash_no_trees: 'No family trees yet.',
    dash_members: 'members',
    dash_view: 'View',
    dash_delete: 'Delete',
    dash_new_tree_name: 'New tree name:',
    dash_cancel: 'Cancel',
    dash_create_btn: 'Create',

    // TreeView
    tree_back: '← Back',
    tree_export: '📥 Export Excel',
    tree_import: '📤 Import Excel',
    tree_importing: 'Importing...',
    tree_add_member: '+ Add Member',
    tree_add_child: 'Add Child',
    tree_import_progress: 'Processing file...',
    tree_import_failed: 'Import failed',
    tree_import_success: 'Import successful!',
    tree_import_created: 'created',
    tree_import_updated: 'updated',
    tree_import_issues: 'issues',
    tree_close: 'Close',

    // MemberDetail
    detail_living: '🟢 Living',
    detail_deceased: '⚫ Deceased',
    detail_male: '♂ Male',
    detail_female: '♀ Female',
    detail_other: '⚥ Other',
    detail_birth: 'Born',
    detail_death: 'Died',
    detail_age: 'years old',
    detail_died_at: 'died at',
    detail_birthplace: 'Birthplace',
    detail_occupation: 'Occupation',
    detail_email: 'Email',
    detail_phone: 'Phone',
    detail_bio: 'Biography',
    detail_parents: 'Parents',
    detail_father: 'Father',
    detail_mother: 'Mother',
    detail_spouses: 'Spouses',
    detail_children: 'Children',
    detail_child: 'children',
    detail_edit: '✏️ Edit',
    detail_add_child: '👶 Add Child',
    detail_create_branch: '🌿 Create Branch',
    detail_delete: '🗑️ Delete',
    detail_close: 'Close',
    detail_view_profile: 'View Profile',
    detail_married: 'Married',
    detail_divorced: 'Divorced',
    detail_widowed: 'Widowed',

    // MemberModal
    modal_add_member: 'Add Member',
    modal_edit_member: 'Edit Member',
    modal_photo: 'Profile Photo',
    modal_choose_photo: 'Choose Photo',
    modal_remove_photo: 'Remove Photo',
    modal_photo_support: 'Supports: JPEG, PNG, GIF, WebP (max 5MB)',
    modal_saint_name: 'Saint Name',
    modal_last_name: 'Last Name',
    modal_middle_name: 'Middle Name',
    modal_vn_name: 'Vietnamese Name',
    modal_first_name: 'First Name',
    modal_gender: 'Gender',
    modal_living: 'Living',
    modal_birth_date: 'Birth Date',
    modal_death_date: 'Death Date',
    modal_birthplace: 'Birthplace',
    modal_occupation: 'Occupation',
    modal_email: 'Email',
    modal_phone: 'Phone',
    modal_bio: 'Biography',
    modal_family: 'Family Relations',
    modal_father: 'Father',
    modal_mother: 'Mother',
    modal_none: '-- None --',
    modal_cancel: 'Cancel',
    modal_save: 'Save Changes',
    modal_add: 'Add Member',
    modal_saving: 'Saving...',

    // Login
    login_title: 'Login',
    login_email: 'Email',
    login_password: 'Password',
    login_submit: 'Login',
    login_no_account: "Don't have an account?",
    login_register: 'Register',
    login_register_title: 'Register',
    login_name: 'Name',
    login_have_account: 'Already have an account?',
    login_login: 'Login',
    login_error_fill: 'Please fill in all required fields',
    login_error_password: 'Password must be at least 6 characters',
    login_error_email_used: 'Email already in use',
    login_error_invalid: 'Invalid email or password',

    // Reset Password
    reset_forgot_title: 'Forgot Password',
    reset_forgot_desc: 'Enter your email to receive a reset code',
    reset_forgot_link: 'Forgot password?',
    reset_title: 'Reset Password',
    reset_desc: 'Enter the reset code and your new password',
    reset_token: 'Reset Code',
    reset_token_label: 'Your code',
    reset_new_password: 'New Password',
    reset_send: 'Send Code',
    reset_submit: 'Reset Password',
    reset_use_token: 'Use this code',
    reset_back_login: 'Back to Login',
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'vi';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'vi' ? 'en' : 'vi'));
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
