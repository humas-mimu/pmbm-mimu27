'use client';
import { useEffect, useMemo, useState } from 'react';
import { Field } from './ui';
import Combo from './Combo';

// Alamat: Kabupaten/Kota → Kecamatan → Desa/Kelurahan → Jalan/Dusun → RT → RW → Kode Pos.
// Data resmi Jawa Timur ada di /public/wilayah. Rekomendasi kecamatan & desa muncul setelah tingkat di atasnya cocok dengan daftar.
export default function AddressFields({ form, set, setMany, errors }) {
  const [kabs, setKabs] = useState([]);   // [[kode, nama]]
  const [kecs, setKecs] = useState([]);   // [[nama, [[desa, kodepos]]]]

  useEffect(() => {
    fetch('/wilayah/kabupaten.json').then((r) => r.json()).then(setKabs).catch(() => {});
  }, []);

  const kab = kabs.find(([, n]) => n === form.kabupaten_kota);
  const kabCode = kab?.[0];
  useEffect(() => {
    if (!kabCode) { setKecs([]); return; }
    let live = true;
    fetch(`/wilayah/${kabCode}.json`).then((r) => r.json()).then((d) => live && setKecs(d)).catch(() => live && setKecs([]));
    return () => { live = false; };
  }, [kabCode]);

  const kc = kecs.find(([n]) => n === form.kecamatan);
  const desaList = kc ? kc[1] : [];
  const kabNames = useMemo(() => kabs.map(([, n]) => n), [kabs]);
  const kecNames = useMemo(() => kecs.map(([n]) => n), [kecs]);
  const desaNames = useMemo(() => desaList.map(([n]) => n), [kc]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeKab = (t) => {
    const m = kabs.find(([, n]) => n === t);
    setMany({ kabupaten_kota: t, ...(m && m[0] !== kabCode ? { kecamatan: '', desa_kelurahan: '' } : {}) });
  };
  const changeKec = (t) => {
    const m = kecs.find(([n]) => n === t);
    setMany({ kecamatan: t, ...(m && t !== form.kecamatan ? { desa_kelurahan: '' } : {}) });
  };
  const changeDesa = (t) => {
    const d = desaList.find(([n]) => n === t);
    setMany({ desa_kelurahan: t, ...(d && d[1] && t !== form.desa_kelurahan ? { kode_pos: d[1] } : {}) }); // kode pos disarankan, bisa diubah
  };
  const txt = (key, ph, extra = {}) => (
    <input className="pinput" value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={ph} autoComplete="off" {...extra} />
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
      <Field label="Kabupaten / Kota" required error={errors.kabupaten_kota} className="sm:col-span-6"
        hint="Ketik sebagian nama (misal: TULUNG), lalu pilih dari rekomendasi. Tidak ada di daftar / luar Jawa Timur? Ketik saja manual.">
        <Combo value={form.kabupaten_kota} onChange={changeKab} options={kabNames} placeholder="KETIK ATAU PILIH KABUPATEN / KOTA" />
      </Field>
      <Field label="Kecamatan" required error={errors.kecamatan} className="sm:col-span-3"
        hint={kab ? undefined : 'Rekomendasi muncul setelah Kabupaten/Kota dipilih dari daftar.'}>
        <Combo value={form.kecamatan} onChange={changeKec} options={kecNames} placeholder="KETIK ATAU PILIH KECAMATAN" />
      </Field>
      <Field label="Desa / Kelurahan" required error={errors.desa_kelurahan} className="sm:col-span-3"
        hint={kc ? undefined : 'Rekomendasi muncul setelah Kecamatan dipilih dari daftar.'}>
        <Combo value={form.desa_kelurahan} onChange={changeDesa} options={desaNames} placeholder="KETIK ATAU PILIH DESA / KELURAHAN" />
      </Field>
      <Field label="Jalan / Dusun" required error={errors.jalan_dusun} className="sm:col-span-6">{txt('jalan_dusun', 'Nama jalan atau dusun')}</Field>
      <Field label="RT" required error={errors.rt} className="sm:col-span-2">{txt('rt', '001', { inputMode: 'numeric', maxLength: 3 })}</Field>
      <Field label="RW" required error={errors.rw} className="sm:col-span-2">{txt('rw', '001', { inputMode: 'numeric', maxLength: 3 })}</Field>
      <Field label="Kode Pos" required error={errors.kode_pos} className="sm:col-span-2" hint="Terisi otomatis dari desa, bisa diubah.">
        {txt('kode_pos', '5 digit', { inputMode: 'numeric', maxLength: 5 })}
      </Field>
    </div>
  );
}
