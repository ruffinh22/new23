import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { Input, Button } from '@/components/common'
import { z } from 'zod'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { apiClient } from '@/services/api'
import { folderService } from '@/services/folderService'
import { USER_ENDPOINTS } from '@/utils/constants'
import { User } from '@/types/auth'

interface EditUserModalProps {
  isOpen: boolean
  user: User | null
  onClose: () => void
  onSuccess: () => void
}

const editUserSchema = z.object({
  first_name: z.string().min(2, 'First name required'),
  last_name: z.string().min(2, 'Last name required'),
  email: z.string().email('Invalid email'),
  password: z.string().optional(),
  role: z.enum(['ADMIN', 'POLE_MANAGER', 'FILIALE_MANAGER', 'SERVICE_MANAGER', 'DOCUMENT_MANAGER', 'AGENT']),
  pole: z.string().optional().nullable(), // Rendre optionnel pour ADMIN
  branche: z.string().optional().nullable(), // Rendre optionnel pour ADMIN
  service: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

type EditUserForm = z.infer<typeof editUserSchema>

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, user, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string>('')
  const [poles, setPoles] = React.useState<any[]>([])
  const [filiales, setFiliales] = React.useState<any[]>([])
  const [services, setServices] = React.useState<any[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
  })

  const poleValue = watch('pole')
  const brancheValue = watch('branche')

  // Load poles on mount
  useEffect(() => {
    if (!isOpen) return
    const loadPoles = async () => {
      try {
        const polesData = await folderService.getPoles()
        // Trier alphabétiquement
        polesData.sort((a: any, b: any) => a.name.localeCompare(b.name))
        setPoles(polesData)
      } catch (err) {
        console.error('Error loading poles:', err)
      }
    }
    loadPoles()
  }, [isOpen])

  // Load filiales when pole changes
  useEffect(() => {
    if (!poleValue) {
      setFiliales([])
      setServices([])
      return
    }
    const loadFiliales = async () => {
      try {
        console.log('[EditUserModal] Loading filiales for pole:', poleValue)
        const filialesData = await folderService.getFiliales(poleValue)
        console.log('[EditUserModal] Filiales loaded:', filialesData)
        // Trier alphabétiquement
        filialesData.sort((a: any, b: any) => a.name.localeCompare(b.name))
        setFiliales(filialesData)
      } catch (err) {
        console.error('[EditUserModal] Error loading filiales:', err)
        setFiliales([])
      }
    }
    loadFiliales()
  }, [poleValue])

  // Load services when branche changes
  useEffect(() => {
    if (!brancheValue) {
      setServices([])
      return
    }
    const loadServices = async () => {
      try {
        const servicesData = await folderService.getServices(brancheValue)
        // Trier alphabétiquement
        servicesData.sort((a: any, b: any) => a.name.localeCompare(b.name))
        setServices(servicesData)
      } catch (err) {
        console.error('Error loading services:', err)
      }
    }
    loadServices()
  }, [brancheValue])

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      console.log('[EditUserModal] User changed, resetting form')
      reset({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        password: '',
        role: user.role || 'AGENT',
        pole: user.pole ? String(user.pole) : '',
        branche: user.branch ? String(user.branch) : '',
        service: user.department ? String(user.department) : '',
        is_active: user.is_active,
      })
    }
  }, [user?.id, reset])

  const onSubmit: SubmitHandler<EditUserForm> = async (data) => {
    if (!user) return

    setError('')
    setIsLoading(true)

    try {
      console.log('[EditUserModal] Updating user:', { id: user.id, email: data.email })

      const updateData: any = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        role: data.role,
        is_active: data.is_active,
      }

      // Handle hierarchy fields - all roles can have hierarchies assigned
      if (data.pole && data.pole !== '') {
        updateData.pole = parseInt(data.pole)
      } else {
        updateData.pole = null
      }

      if (data.branche && data.branche !== '') {
        updateData.branch = parseInt(data.branche)
      } else {
        updateData.branch = null
      }

      if (data.service && data.service !== '') {
        updateData.department = parseInt(data.service)
      } else {
        updateData.department = null
      }

      // Only include password if provided
      if (data.password && data.password.length >= 8) {
        updateData.password = data.password
        updateData.password_confirm = data.password
      }

      await apiClient.patch(USER_ENDPOINTS.detail(user.id), updateData)

      console.log('[EditUserModal] User updated successfully')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('[EditUserModal] Error updating user:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update user'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Modifier Utilisateur</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="First Name"
            placeholder="John"
            {...register('first_name')}
            error={errors.first_name?.message}
          />

          <Input
            label="Last Name"
            placeholder="Doe"
            {...register('last_name')}
            error={errors.last_name?.message}
          />

          <Input
            label="Email"
            type="email"
            placeholder="john@example.com"
            {...register('email')}
            error={errors.email?.message}
          />

          <Input
            label="New Password (Leave empty to keep current)"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
          />

          <div className="space-y-4 border-t pt-4">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded text-sm text-blue-800">
              💡 <strong>Hiérarchie requise:</strong> Pour tous les rôles (sauf ADMIN qui peut n'avoir aucune assignation), assignez au minimum un Pôle et une Filiale. Le Service est optionnel.
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Rôle de l'utilisateur
              </label>
              <select
                id="role"
                {...register('role')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Administrateur</option>
                <option value="POLE_MANAGER">Gestionnaire Pôle</option>
                <option value="FILIALE_MANAGER">Gestionnaire Filiale</option>
                <option value="SERVICE_MANAGER">Gestionnaire Service</option>
                <option value="DOCUMENT_MANAGER">Gestionnaire Document</option>
              </select>
              {errors.role && (
                <p className="text-red-600 text-sm mt-1">{errors.role.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="pole" className="block text-sm font-medium text-gray-700 mb-2">
                Pôle (Optionnel)
              </label>
              <select
                id="pole"
                {...register('pole')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Sélectionner un Pôle --</option>
                {poles.map((pole: any) => (
                  <option key={pole.id} value={pole.id}>
                    {pole.name}
                  </option>
                ))}
              </select>
              {errors.pole && (
                <p className="text-red-600 text-sm mt-1">{errors.pole.message}</p>
              )}
            </div>

            {poleValue && (
              <div>
                <label htmlFor="branche" className="block text-sm font-medium text-gray-700 mb-2">
                  Filiale (Optionnel)
                </label>
                <select
                  id="branche"
                  {...register('branche')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Sélectionner une Filiale --</option>
                  {filiales.map((filiale: any) => (
                    <option key={filiale.id} value={filiale.id}>
                      {filiale.name}
                    </option>
                  ))}
                </select>
                {errors.branche && (
                  <p className="text-red-600 text-sm mt-1">{errors.branche.message}</p>
                )}
              </div>
            )}

            {brancheValue && (
              <div>
                <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-2">
                  Service (Optionnel)
                </label>
                <select
                  id="service"
                  {...register('service')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Sélectionner un Service --</option>
                  {services.map((svc: any) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                {...register('is_active')}
                className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Utilisateur actif
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="w-full"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
