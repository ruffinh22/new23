import React from 'react'

export const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">403</h1>
        <p className="text-xl text-gray-600 mb-8">
          Access Denied - You don't have permission to view this page
        </p>
      </div>
    </div>
  )
}
