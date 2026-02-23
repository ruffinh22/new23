import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/common'

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <Link to="/dashboard">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  )
}
