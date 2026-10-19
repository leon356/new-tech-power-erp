'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function TaskActions({
  taskId,
  status,
}: {
  taskId: string
  status: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function completeTask() {
    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (error) {
      alert(`Could not complete task: ${error.message}`)
      setLoading(false)
      return
    }

    router.refresh()
    setLoading(false)
  }

  if (
    status === 'completed' ||
    status === 'cancelled'
  ) {
    return null
  }

  return (
    <button
      type="button"
      onClick={completeTask}
      disabled={loading}
      className="flex shrink-0 items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Check size={16} />

      {loading ? 'Completing...' : 'Complete'}
    </button>
  )
}
