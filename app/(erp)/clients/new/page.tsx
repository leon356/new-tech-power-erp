'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewClientPage() {
  const router = useRouter()

  const [clientType, setClientType] = useState('individual')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [alternativePhone, setAlternativePhone] = useState('')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setSaving(true)
    setError('')

    const supabase = createClient()

    const { error } = await supabase
      .from('clients')
      .insert({
        client_type: clientType,

        first_name:
          clientType === 'individual'
            ? firstName
            : null,

        last_name:
          clientType === 'individual'
            ? lastName
            : null,

        company_name:
          clientType === 'business'
            ? companyName
            : null,

        email: email || null,
        phone: phone || null,
        alternative_phone:
          alternativePhone || null,
        notes: notes || null,
      })

    if (error) {
      console.error(error)
      setError(error.message)
      setSaving(false)
      return
    }

    router.push('/clients')
    router.refresh()
  }

  return (
    <div className="max-w-3xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Add Client
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Add a new client to the New Tech Power database.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* Client type */}
        <div className="rounded-xl border bg-white p-6">

          <h2 className="mb-4 font-semibold text-gray-800">
            Client Type
          </h2>

          <div className="flex gap-3">

            <button
              type="button"
              onClick={() => setClientType('individual')}
              className={`rounded-lg border px-4 py-2 text-sm text-gray-700 ${
                clientType === 'individual'
                  ? 'bg-black text-white'
                  : 'bg-white'
              }`}
            >
              Individual
            </button>

            <button
              type="button"
              onClick={() => setClientType('business')}
              className={`rounded-lg border px-4 py-2 text-sm text-gray-700 ${
                clientType === 'business'
                  ? 'bg-black text-white'
                  : 'bg-white'
              }`}
            >
              Business
            </button>

          </div>

        </div>

        {/* Client information */}
        <div className="rounded-xl border bg-white p-6">

          <h2 className="mb-5 font-semibold text-gray-800">
            Client Information
          </h2>

          {clientType === 'individual' ? (

            <div className="grid gap-5 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  First Name
                </label>

                <input
                  value={firstName}
                  onChange={(e) =>
                    setFirstName(e.target.value)
                  }
                  required
                  className="w-full rounded-lg border p-3 text-gray-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Last Name
                </label>

                <input
                  value={lastName}
                  onChange={(e) =>
                    setLastName(e.target.value)
                  }
                  required
                  className="w-full rounded-lg border p-3 text-gray-700"
                />
              </div>

            </div>

          ) : (

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Company Name
              </label>

              <input
                value={companyName}
                onChange={(e) =>
                  setCompanyName(e.target.value)
                }
                required
                className="w-full rounded-lg border p-3 text-gray-700"
              />
            </div>

          )}

          <div className="mt-5 grid gap-5 sm:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                className="w-full rounded-lg border p-3 text-gray-700"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Phone
              </label>

              <input
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                className="w-full rounded-lg border p-3 text-gray-700"
              />
            </div>

          </div>

          <div className="mt-5">

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Alternative Phone
            </label>

            <input
              value={alternativePhone}
              onChange={(e) =>
                setAlternativePhone(e.target.value)
              }
              className="w-full rounded-lg border p-3 text-gray-700"
            />

          </div>

          <div className="mt-5">

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              rows={4}
              className="w-full rounded-lg border p-3 text-gray-700"
              placeholder="Additional information..."
            />

          </div>

        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3">

          <button
            type="button"
            onClick={() => router.push('/clients')}
            className="rounded-lg border bg-white px-5 py-2.5 text-sm font-medium text-gray-700"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Client'}
          </button>

        </div>

      </form>

    </div>
  )
}