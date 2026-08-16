import React, { useState, useEffect, useRef } from 'react'
import { useData } from '@/hooks/useData'
import { downloadBackup, importBackup, getLastBackupTime, ImportResult } from '@/backup/backupService'
import { clearAllData } from '@/database/db'
import { formatDateTime } from '@/utils'
import Modal from '@/components/Modal'

type ModalType = 'clear_confirm' | 'import_mode' | 'import_result' | null

export default function SettingsPage() {
  const { sessions, racks, loading, reload } = useData()
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalType>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getLastBackupTime().then(setLastBackup)
  }, [])

  const handleExport = async () => {
    setBusy(true)
    try {
      await downloadBackup()
      const t = await getLastBackupTime()
      setLastBackup(t)
    } finally {
      setBusy(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPendingFile(file)
      setModal('import_mode')
    }
    e.target.value = ''
  }

  const handleImport = async (mode: 'merge' | 'replace') => {
    if (!pendingFile) return
    setBusy(true)
    setModal(null)
    try {
      const result = await importBackup(pendingFile, mode)
      setImportResult(result)
      setModal('import_result')
      await reload()
    } finally {
      setBusy(false)
      setPendingFile(null)
    }
  }

  const handleClear = async () => {
    setBusy(true)
    setModal(null)
    try {
      await clearAllData()
      await reload()
    } finally {
      setBusy(false)
    }
  }

  const totalRacks = racks.filter((r) => r.status === 'completed').length

  return (
    <div className="flex-1 flex flex-col px-4 pt-6 pb-4 overflow-y-auto">
      <h1 className="font-sans font-bold text-text-primary text-2xl px-2 mb-6">Pengaturan</h1>

      {/* Data Summary */}
      <Section title="Data">
        {loading ? (
          <div className="px-5 py-4 text-text-muted text-sm">Memuat…</div>
        ) : (
          <div className="px-5 py-4 flex gap-6">
            <div>
              <div className="font-mono font-bold text-text-primary text-lg">{totalRacks}</div>
              <div className="text-text-muted text-xs mt-0.5">Rack selesai</div>
            </div>
            <div>
              <div className="font-mono font-bold text-text-primary text-lg">{sessions.length}</div>
              <div className="text-text-muted text-xs mt-0.5">Sesi</div>
            </div>
          </div>
        )}
      </Section>

      {/* Backup */}
      <Section title="Backup">
        <div className="px-5 py-4 border-b border-border/50">
          <div className="text-text-muted text-xs mb-1">Backup terakhir</div>
          <div className="font-sans text-text-secondary text-sm">
            {lastBackup ? formatDateTime(lastBackup) : 'Belum pernah'}
          </div>
          {!lastBackup && totalRacks > 0 && (
            <div className="mt-2 text-warning text-xs leading-relaxed">
              Data CueRun tersimpan hanya di perangkat ini. Buat backup untuk menghindari kehilangan data.
            </div>
          )}
        </div>

        <SettingsButton
          label="Export Backup"
          description="Simpan atau bagikan file backup JSON"
          icon="📤"
          onClick={handleExport}
          disabled={busy}
        />
        <SettingsButton
          label="Import Backup"
          description="Pulihkan data dari file backup CueRun"
          icon="📥"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </Section>

      {/* Danger Zone */}
      <Section title="Zona Berbahaya">
        <SettingsButton
          label="Hapus Semua Data"
          description="Tidak bisa dibatalkan. Export backup dulu."
          icon="🗑"
          danger
          onClick={() => setModal('clear_confirm')}
          disabled={busy}
        />
      </Section>

      {/* App Info */}
      <div className="mt-auto px-2 pt-8 text-center">
        <div className="font-mono text-accent font-bold text-sm tracking-wider">CUERUN</div>
        <div className="text-text-muted text-xs mt-1">v1.0.0 · Offline PWA</div>
        <div className="text-text-muted text-xs mt-1">cuerun.binapath.my.id</div>
      </div>

      {/* Modals */}
      {modal === 'clear_confirm' && (
        <Modal
          title="Hapus semua data CueRun?"
          body="Semua sesi dan rack akan dihapus permanen dari perangkat ini. Tindakan ini tidak bisa dibatalkan. Pastikan kamu sudah export backup."
          buttons={[
            { label: 'Batal', onClick: () => setModal(null), variant: 'ghost' },
            { label: 'Hapus Semua Data', onClick: handleClear, variant: 'danger' },
          ]}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'import_mode' && (
        <Modal
          title="Pilih mode import"
          body={`File: ${pendingFile?.name ?? ''}`}
          buttons={[
            { label: 'Gabungkan (Merge)', onClick: () => handleImport('merge'), variant: 'default' },
            { label: 'Ganti Data (Replace)', onClick: () => handleImport('replace'), variant: 'danger' },
            { label: 'Batal', onClick: () => { setModal(null); setPendingFile(null) }, variant: 'ghost' },
          ]}
        />
      )}

      {modal === 'import_result' && importResult && (
        <Modal
          title={importResult.success ? 'Import Berhasil' : 'Import Gagal'}
          body={
            importResult.success
              ? `${importResult.importedSessions} sesi dan ${importResult.importedRacks} rack berhasil diimport. ${importResult.skipped} item dilewati (duplikat).`
              : importResult.errors.join('\n')
          }
          buttons={[
            { label: 'OK', onClick: () => setModal(null), variant: 'default' },
          ]}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="font-mono text-text-muted text-xs tracking-[0.2em] uppercase px-2 mb-2">{title}</div>
      <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden divide-y divide-border/50">
        {children}
      </div>
    </div>
  )
}

function SettingsButton({
  label,
  description,
  icon,
  onClick,
  danger,
  disabled,
}: {
  label: string
  description: string
  icon: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-5 py-4 text-left flex items-center gap-4 transition-colors active:bg-surface-3 disabled:opacity-40 ${
        danger ? 'text-danger' : ''
      }`}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`font-sans font-semibold text-sm ${danger ? 'text-danger' : 'text-text-primary'}`}>
          {label}
        </div>
        <div className="text-text-muted text-xs mt-0.5">{description}</div>
      </div>
    </button>
  )
}
