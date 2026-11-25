// Aturan password baru yang dipilih pengguna sendiri (saat wajib/ingin mengganti password).
// Password sementara buatan Admin tetap hanya mengikuti batas panjang karena akan langsung diganti.
const COMMON = new Set([
  'gantisegera123!', 'password', 'password1', 'password123', 'passw0rd', '12345678', '123456789', '1234567890', '11111111', '00000000',
  'qwertyui', 'qwertyuiop', 'qwerty123', 'abcd1234', 'abc12345', 'admin123', 'admin1234', 'admin12345', 'guru1234', 'guru12345',
  'bismillah', 'bismillah123', 'indonesia', 'indonesia123', 'sekolah123', 'madrasah123', 'rahasia123', 'iloveyou',
]);

export function checkNewPassword(pw, { username = '', current = '' } = {}) {
  const p = String(pw ?? '');
  if (p.length < 8) return 'Password baru minimal 8 karakter.';
  if (p.length > 200) return 'Password baru maksimal 200 karakter.';
  if (current && p === current) return 'Password baru tidak boleh sama dengan password saat ini.';
  const low = p.toLowerCase();
  if (username && low === String(username).toLowerCase()) return 'Password tidak boleh sama dengan username.';
  if (COMMON.has(low) || /^(.)\1+$/.test(p)) return 'Password terlalu mudah ditebak. Gunakan kombinasi huruf dan angka yang lebih unik.';
  return null;
}
