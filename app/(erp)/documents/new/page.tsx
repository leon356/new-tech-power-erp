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

export default function NewDocumentPage() {
  const router = useRouter()

  const [clients, setClients] = useState<Client[]>([])
  const [jobs, setJobs] = useState<Job[]>([])

  const [clientId, setClientId] = useState('')
  const [jobId, setJobId] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [loadingData, setLoadingData] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    const [clientsResult, jobsResult] = await Promise.all([
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

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setLoading(true)
    setError('')

    if (!file) {
      setError('Please select a file.')
      setLoading(false)
      return
    }

    if (!clientId && !jobId) {
      setError(
        'Please connect the document to a client or job.'
      )
      setLoading(false)
      return
    }

    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in.')
      setLoading(false)
      return
    }

    const fileExtension =
      file.name.split('.').pop() || 'file'

    const safeFileName =
      file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')

    const filePath = `${crypto.randomUUID()}-${safeFileName}`

    const { error: uploadError } =
      await supabase.storage
        .from('documents')
        .upload(filePath, file)

    if (uploadError) {
      setError(uploadError.message)
      setLoading(false)
      return
    }

    const { error: databaseError } =
      await supabase
        .from('documents')
        .insert({
          name: file.name,
          file_path: filePath,
          file_type: fileExtension,
          file_size: file.size,
          client_id: clientId || null,
          job_id: jobId || null,
          uploaded_by: user.id,
        })

    if (databaseError) {
      await supabase.storage
        .from('documents')
        .remove([filePath])

      setError(databaseError.message)
      setLoading(false)
      return
    }

    router.push('/documents')
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
        href="/documents"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to Documents
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Upload Document
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Upload a document and connect it to a client or job.
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

        {/* File */}
        <div className="rounded-xl border bg-white p-6">

          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Document
          </h2>

          <label className="text-sm font-medium text-gray-700">
            File *
          </label>

          <input
            type="file"
            required
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
            className="mt-2 block w-full rounded-lg border p-2.5 text-sm text-gray-700"
          />

          {file && (
            <p className="mt-2 text-xs text-gray-500">
              {file.name} —{' '}
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          )}

        </div>

        {/* Connections */}
        <div className="rounded-xl border bg-white p-6">

          <h2 className="mb-5 text-lg font-semibold text-gray-800">
            Connect Document
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
                  Select a client
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
                      : 'Select a job'
                    : 'Select a client first'}
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

          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">

          <Link
            href="/documents"
            className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Upload Document'}
          </button>

        </div>

      </form>

    </div>
  )
}
