import React from 'react'
import { X } from 'lucide-react'
import { Input, Button } from '@/components/common'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { apiClient } from '@/services/api'
import { folderService } from '@/services/folderService'
import { USER_ENDPOINTS } from '@/utils/constants'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const createUserSchema = z.object({
  first_name: z.string().min(2, 'First name required'),
  last_name: z.string().min(2, 'Last name required'),
  email: z.string().email('Invalid email'),
  matricule: z.string().min(3, 'Matricule required'),
  password: z.string().min(8, 'Password min 8 chars'),
  role: z.string().min(1, 'Role required'),
  pole: z.string().min(1, 'Pôle required'),
  branche: z.string().min(1, 'Filiale required'),
  departement: z.string().optional(),
})

type CreateUserForm = z.infer<typeof createUserSchema>

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string>('')
  const [poles, setPoles] = React.useState<any[]>([])
  const [filiales, setFiliales] = React.useState<any[]>([])
  const [services, setServices] = React.useState<any[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
  })

  const poleValue = watch('pole')
  const brancheValue = watch('branche')

  // Load poles on mount
  React.useEffect(() => {
    if (!isOpen) return
    const loadPoles = async () => {
      try {
        const polesData = await folderService.getPoles()
        setPoles(polesData)
      } catch (err) {
        console.error('Error loading poles:', err)
      }
    }
    loadPoles()
  }, [isOpen])

  // Load filiales when pole changes
  React.useEffect(() => {
    if (!poleValue) {
      setFiliales([])
      return
    }
    const loadFiliales = async () => {
      try {
        const filialesData = await folderService.getFiliales(poleValue)
        setFiliales(filialesData)
      } catch (err) {
        console.error('Error loading filiales:', err)
      }
    }
    loadFiliales()
  }, [poleValue])

  // Load services when branche changes
  React.useEffect(() => {
    if (!brancheValue) {
      setServices([])
      return
    }
    const loadServices = async () => {
      try {
        const servicesData = await folderService.getServices(brancheValue)
        setServices(servicesData)
      } catch (err) {
        console.error('Error loading services:', err)
      }
    }
    loadServices()
  }, [brancheValue])

  const onSubmit = async (data: CreateUserForm) => {
    setError('')
    setIsLoading(true)

    try {
      console.log('[AddUserModal] Creating user:', { email: data.email, matricule: data.matricule })
      const submitData: any = {
        ...data,
        password_confirm: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      }

      // Convert pole and branche to integers
      if (data.pole) submitData.pole = parseInt(data.pole)
      if (data.branche) submitData.branch = parseInt(data.branche)
      if (data.departement) submitData.department = parseInt(data.departement)

      await apiClient.post(USER_ENDPOINTS.list, submitData)

      console.log('[AddUserModal] User created successfully')
      reset()
      onSuccess()
      onClose()
    } catch (err) {
      console.error('[AddUserModal] Error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add New User</h2>
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
            label="Matricule"
            placeholder="AGENT001"
            {...register('matricule')}
            error={errors.matricule?.message}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
          />

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Role</label>
            <select
              {...register('role')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
            >
              <option value="">Select a role</option>
              <option value="AGENT">Agent</option>
              <option value="SERVICE_MANAGER">Service Manager</option>
              <option value="FILIALE_MANAGER">Filiale Manager</option>
              <option value="POLE_MANAGER">Pôle Manager</option>
              <option value="DOCUMENT_MANAGER">Document Manager</option>
            </select>
            {errors.role && <p className="text-red-600 text-sm mt-1">{errors.role.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Pôle</label>
            <select
              {...register('pole')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
            >
              <option value="">Select a Pôle</option>
              {poles.map((pole: any) => (
                <option key={pole.id} value={pole.id}>
                  {pole.name}
                </option>
              ))}
            </select>
            {errors.pole && <p className="text-red-600 text-sm mt-1">{errors.pole.message}</p>}
          </div>

          {poleValue && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Filiale</label>
              <select
                {...register('branche')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
              >
                <option value="">Select a Filiale</option>
                {filiales.map((filiale: any) => (
                  <option key={filiale.id} value={filiale.id}>
                    {filiale.name}
                  </option>
                ))}
              </select>
              {errors.branche && <p className="text-red-600 text-sm mt-1">{errors.branche.message}</p>}
            </div>
          )}

          {brancheValue && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Service (Optional)</label>
              <select
                {...register('departement')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
              >
                <option value="">Select a Service</option>
                {services.map((service: any) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
