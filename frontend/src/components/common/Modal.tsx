import React from 'react'

interface ModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  onClose,
  children,
  footer,
}) => {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full my-8">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-51">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              ✕
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">{children}</div>
          {footer && (
            <div className="flex gap-3 justify-end p-6 border-t border-gray-200 sticky bottom-0 bg-white z-51">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
