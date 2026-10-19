'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Client = {
  id: string
  client_type: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
}

type Job = {
  id: string
  job_number: string
  title: string
  client_id: string
}

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
}

export default function NewTaskPage() {
  const router = useRouter()

  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  const [clientId, setClientId] = useState('')
  const [jobId, setJobId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [dueDate, setDueDate] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    const [
      clientsResult,
      jobsResult,
      profilesResult,
    ] = await Promise.all([
      supabase
        .from('clients')
        .select(
          'id, client_type, first_name, last_name, company_name'
        )
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('jobs')
        .select(
          'id, job_number, title, client_id'
        )
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('profiles')
        .select(
          'id, first_name, last_name'
        )
        .order('first_name'),
    ])

    if (clientsResult.error) {
      setError(clientsResult.error.message)
    } else {
      setClients(clientsResult.data || [])
    }

    if (jobsResult.error) {
      setError(jobsResult.error.message)
    } else {
      setJobs(jobsResult.data || [])
    }

    if (profilesResult.error) {
      setError(profilesResult.error.message)
    } else {
      setProfiles(profilesResult.data || [])
    }

    setLoadingData(false)
  }

  function getClientName(client: Client) {
    if (client.client_type === 'business') {
      return client.company_name || 'Unnamed Business'
    }

    return (
      `${client.first_name || ''} ${
        client.last_name || ''
      }`.trim() || 'Unnamed Client'
    )
  }

  function getProfileName(profile: Profile) {
    return (
      `${profile.first_name || ''} ${
        profile.last_name || ''
      }`.trim() || 'Unnamed User'
    )
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setLoading(true)
    setError('')

    if (!title.trim()) {
      setError('Please enter a task title.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
        client_id: clientId || null,
        job_id: jobId || null,
        assigned_to: assignedTo || null,
        created_by: user?.id || null,
      })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/tasks')
    router.refresh()
  }

  const filteredJobs = clientId
    ? jobs.filter(
        (job) => job.client_id === clientId
      )
    : jobs

  if (loadingData) {
    return (
      <div>
        <p className="text-sm text-gray-500">
          Loading...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">

      <Link
        href="/tasks"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to Tasks
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          New Task
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Create a task and assign it to a client, job or team member.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* Task information */}
        <div className="rounded-xl border bg-white p-6">

          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Task Information
          </h2>

          <div className="space-y-5">

            <div>
              <label className="text-sm font-medium text-gray-700">
                Task Title *
              </label>

              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                required
                placeholder="e.g. Order panels for Job #NTP-00012"
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                rows={4}
                placeholder="Add any useful details..."
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value)
                  }
                  className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                >
                  <option value="low">
                    Low
                  </option>

                  <option value="normal">
                    Normal
                  </option>

                  <option value="high">
                    High
                  </option>

                  <option value="urgent">
                    Urgent
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Due Date
                </label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) =>
                    setDueDate(e.target.value)
                  }
                  className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
                />
              </div>

            </div>

          </div>

        </div>

        {/* Connections */}
        <div className="rounded-xl border bg-white p-6">

          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Connect Task
          </h2>

          <div className="space-y-5">

            <div>
              <label className="text-sm font-medium text-gray-700">
                Client
              </label>

              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value)
                  setJobId('')
                }}
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
              >
                <option value="">
                  No client
                </option>

                {clients.map((client) => (
                  <option
                    key={client.id}
                    value={client.id}
                  >
                    {getClientName(client)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Job
              </label>

              <select
                value={jobId}
                onChange={(e) =>
                  setJobId(e.target.value)
                }
                disabled={filteredJobs.length === 0}
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none disabled:bg-gray-100 focus:border-gray-500"
              >
                <option value="">
                  {clientId
                    ? filteredJobs.length === 0
                      ? 'No jobs for this client'
                      : 'No job'
                    : 'No job'}
                </option>

                {filteredJobs.map((job) => (
                  <option
                    key={job.id}
                    value={job.id}
                  >
                    {job.job_number} — {job.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Assign To
              </label>

              <select
                value={assignedTo}
                onChange={(e) =>
                  setAssignedTo(e.target.value)
                }
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-gray-500"
              >
                <option value="">
                  Unassigned
                </option>

                {profiles.map((profile) => (
                  <option
                    key={profile.id}
                    value={profile.id}
                  >
                    {getProfileName(profile)}
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">

          <Link
            href="/tasks"
            className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>

        </div>

      </form>

    </div>
  )
}
