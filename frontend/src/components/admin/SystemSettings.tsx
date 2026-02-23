import React from 'react'
import { Button, Input } from '@/components/common'

interface SystemSettingsProps {
  settings: Record<string, string | boolean | number>
  onSave: (settings: Record<string, string | boolean | number>) => void
  isLoading?: boolean
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  settings,
  onSave,
  isLoading = false,
}) => {
  const [formSettings, setFormSettings] = React.useState<Record<string, string | boolean | number>>(settings)

  const handleChange = (key: string, value: string | boolean | number) => {
    setFormSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formSettings)
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h2>

      <div className="space-y-4 mb-6">
        <Input
          label="System Name"
          value={String(formSettings.system_name || '')}
          onChange={(e) => handleChange('system_name', e.target.value)}
        />

        <Input
          label="Max Upload Size (MB)"
          type="number"
          value={String(formSettings.max_upload_size || '')}
          onChange={(e) => handleChange('max_upload_size', e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enable Notifications
          </label>
          <input
            type="checkbox"
            checked={Boolean(formSettings.enable_notifications)}
            onChange={(e) =>
              handleChange('enable_notifications', e.target.checked)
            }
            className="w-4 h-4 rounded border-gray-300"
          />
        </div>

        <Input
          label="Support Email"
          type="email"
          value={String(formSettings.support_email || '')}
          onChange={(e) => handleChange('support_email', e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          Save Settings
        </Button>
      </div>
    </form>
  )
}
