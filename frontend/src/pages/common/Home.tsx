import React from 'react'
import { Layout, Button } from '@/components/common'
import { Link } from 'react-router-dom'

export const Home: React.FC = () => {
  return (
    <Layout>
      <div className="text-center py-20">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Welcome to SGDRA
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Système de Gestion Documentaire - Document Management System
        </p>
        <Link to="/dashboard">
          <Button size="lg">Get Started</Button>
        </Link>
      </div>
    </Layout>
  )
}
