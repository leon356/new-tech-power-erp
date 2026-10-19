'use client'

import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  FileText,
  Sun,
  Boxes,
  ListTodo,
  FolderOpen,
  Settings,
  LogOut,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Jobs', href: '/jobs', icon: BriefcaseBusiness },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'System Designer', href: '/system-designer', icon: Sun },
  { name: 'BOM', href: '/bom', icon: Boxes },
  { name: 'Inventory', href: '/inventory', icon: Boxes },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'Documents', href: '/documents', icon: FolderOpen },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function ErpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userName, setUserName] = useState('Loading...')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserName(
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
            user.email ||
            'User'
        )

        setUserRole(profile.role)
      } else {
        setUserName(user.email || 'User')
      }
    }

    loadProfile()
  }, [])

  async function handleLogout() {
    const supabase = createClient()

    await supabase.auth.signOut()

    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r bg-white">

        {/* Logo */}
        <div className="flex h-16 items-center border-b px-5">
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              New Tech Power
            </h1>

            <p className="text-xs text-gray-500">
              ERP System
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3">
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Icon size={19} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User account */}
        <div className="border-t p-3">

          <div className="mb-2 rounded-lg px-3 py-2">
            <p className="truncate text-sm font-medium text-gray-800">
              {userName}
            </p>

            <p className="text-xs capitalize text-gray-600">
              {userRole}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            <LogOut size={19} />
            Sign out
          </button>

        </div>

      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        {children}
      </main>

    </div>
  )
}