import React from 'react'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'

type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  type: AlertType
  title: string
  message: string
  onClose?: () => void
}

const ICONS = {
  success: <CheckCircle className="text-green-600" />,
  error: <XCircle className="text-red-600" />,
  warning: <AlertCircle className="text-yellow-600" />,
  info: <Info className="text-blue-600" />,
}

const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900',
}

export const Alert: React.FC<AlertProps> = ({ type, title, message, onClose }) => {
  return (
    <div className={`border rounded-lg p-4 flex gap-3 ${STYLES[type]}`}>
      <div className="flex-shrink-0">{ICONS[type]}</div>
      <div className="flex-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm mt-1">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  )
}
