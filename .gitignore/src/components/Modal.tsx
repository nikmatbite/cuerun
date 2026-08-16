import React from 'react' // eslint-disable-line

interface ModalButton {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger' | 'ghost'
}

interface Props {
  title: string
  body?: string
  buttons: ModalButton[]
  onClose?: () => void
}

export default function Modal({ title, body, buttons, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-2 border border-border rounded-t-2xl p-6 pb-10 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-sans font-semibold text-text-primary text-base">{title}</h2>
        {body && <p className="text-text-secondary text-sm leading-relaxed">{body}</p>}
        <div className="flex flex-col gap-2 pt-2">
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              className={`w-full py-3.5 rounded-xl font-sans font-semibold text-sm transition-colors ${
                btn.variant === 'danger'
                  ? 'bg-danger/10 text-danger border border-danger/30 active:bg-danger/20'
                  : btn.variant === 'ghost'
                  ? 'bg-surface-3 text-text-secondary border border-border active:bg-surface-2'
                  : 'bg-accent text-surface font-bold active:bg-accent-dim'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
