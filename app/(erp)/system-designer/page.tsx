"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SystemDesign = {
  id: string;
  design_name: string | null;
  inverter_model: string | null;
  inverter_capacity_kw: number | null;
  battery_model: string | null;
  battery_capacity_kwh: number | null;
  panel_model: string | null;
  panel_wattage_w: number | null;
  panel_quantity: number | null;
  total_pv_kw: number | null;
  created_at: string;
};

export default function SystemDesignerPage() {
  const supabase = createClient();

  const [designs, setDesigns] = useState<SystemDesign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDesigns();
  }, []);

  const loadDesigns = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("system_designs")
      .select(`
        id,
        design_name,
        inverter_model,
        inverter_capacity_kw,
        battery_model,
        battery_capacity_kwh,
        panel_model,
        panel_wattage_w,
        panel_quantity,
        total_pv_kw,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading system designs:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      setDesigns([]);
    } else {
      setDesigns(data ?? []);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            System Designer
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Manage solar system designs for your jobs.
          </p>
        </div>

        <Link
          href="/system-designer/new"
          className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          New Design
        </Link>
      </div>

      {/* Design List */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-500">
            Loading designs...
          </div>
        ) : designs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto max-w-sm">
              <h2 className="text-base font-semibold text-zinc-900">
                No system designs yet
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Create your first system design to start planning panels,
                strings, mounting and BOM.
              </p>

              <Link
                href="/system-designer/new"
                className="mt-5 inline-flex items-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                <Plus className="h-4 w-4" />
                New Design
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-zinc-600">
                    Design
                  </th>

                  <th className="px-6 py-3 font-medium text-zinc-600">
                    System
                  </th>

                  <th className="px-6 py-3 font-medium text-zinc-600">
                    Panels
                  </th>

                  <th className="px-6 py-3 font-medium text-zinc-600">
                    Inverter
                  </th>

                  <th className="px-6 py-3 font-medium text-zinc-600">
                    Battery
                  </th>

                  <th className="px-6 py-3 font-medium text-zinc-600">
                    Created
                  </th>

                  <th className="px-6 py-3 text-right font-medium text-zinc-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {designs.map((design) => (
                  <tr
                    key={design.id}
                    className="transition hover:bg-zinc-50"
                  >
                    {/* Design */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-900">
                        {design.design_name || "Unnamed Design"}
                      </div>

                      {design.panel_model && (
                        <div className="mt-1 text-xs text-zinc-500">
                          {design.panel_model}

                          {design.panel_wattage_w
                            ? ` • ${design.panel_wattage_w} W`
                            : ""}
                        </div>
                      )}
                    </td>

                    {/* PV System */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-800">
                        {design.total_pv_kw
                          ? `${design.total_pv_kw} kW`
                          : "—"}
                      </div>

                      <div className="mt-1 text-xs text-zinc-500">
                        PV System
                      </div>
                    </td>

                    {/* Panels */}
                    <td className="px-6 py-4 text-zinc-700">
                      {design.panel_quantity
                        ? `${design.panel_quantity} panels`
                        : "—"}
                    </td>

                    {/* Inverter */}
                    <td className="px-6 py-4">
                      {design.inverter_model ? (
                        <div>
                          <div className="font-medium text-zinc-800">
                            {design.inverter_model}
                          </div>

                          {design.inverter_capacity_kw && (
                            <div className="mt-1 text-xs text-zinc-500">
                              {design.inverter_capacity_kw} kW
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Battery */}
                    <td className="px-6 py-4">
                      {design.battery_model ? (
                        <div>
                          <div className="font-medium text-zinc-800">
                            {design.battery_model}
                          </div>

                          {design.battery_capacity_kwh && (
                            <div className="mt-1 text-xs text-zinc-500">
                              {design.battery_capacity_kwh} kWh
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4 text-zinc-500">
                      {new Date(
                        design.created_at
                      ).toLocaleDateString("en-ZA")}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/system-designer/${design.id}`}
                        className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                      >
                        <Pencil className="h-4 w-4" />
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
