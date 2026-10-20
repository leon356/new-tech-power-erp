
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;

const supabase = createClient();

function formatValue(value: unknown, unit = "") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${value}${unit ? ` ${unit}` : ""}`;
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 className="font-semibold text-zinc-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 break-words font-medium text-zinc-900">
        {formatValue(value)}
      </p>
    </div>
  );
}

export default function SystemDesignDetailPage() {
  const params = useParams<{ id: string }>();
  const designId = params.id;

  const [design, setDesign] = useState<Row | null>(null);
  const [sections, setSections] = useState<Row[]>([]);
  const [strings, setStrings] = useState<Row[]>([]);
  const [panels, setPanels] = useState<Row[]>([]);
  const [bom, setBom] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDesign() {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data: designData, error: designError } =
          await supabase
            .from("system_designs")
            .select("*")
            .eq("id", designId)
            .single();

        if (designError) throw designError;

        if (!designData) {
          throw new Error("System design not found.");
        }

        const [
          sectionResult,
          panelResult,
          bomResult,
        ] = await Promise.all([
          supabase
            .from("roof_sections")
            .select("*")
            .eq("system_design_id", designId)
            .order("created_at", { ascending: true }),

          supabase
            .from("system_panels")
            .select("*")
            .eq("system_design_id", designId)
            .order("panel_number", { ascending: true }),

          supabase
            .from("system_design_bom")
            .select("*")
            .eq("system_design_id", designId)
            .order("component_name", { ascending: true }),
        ]);

        if (sectionResult.error) throw sectionResult.error;
        if (panelResult.error) throw panelResult.error;
        if (bomResult.error) throw bomResult.error;

        const sectionRows = sectionResult.data ?? [];
        const sectionIds = sectionRows.map(
          (section) => section.id
        );

        let stringRows: Row[] = [];

        if (sectionIds.length > 0) {
          const { data, error } = await supabase
            .from("system_strings")
            .select("*")
            .in("roof_section_id", sectionIds)
            .order("string_number", { ascending: true });

          if (error) throw error;
          stringRows = data ?? [];
        }

        setDesign(designData);
        setSections(sectionRows);
        setStrings(stringRows);
        setPanels(panelResult.data ?? []);
        setBom(bomResult.data ?? []);
      } catch (error) {
        console.error("Failed to load system design:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load this system design."
        );
      } finally {
        setLoading(false);
      }
    }

    if (designId) {
      loadDesign();
    }
  }, [designId]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-8 text-zinc-600">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Loading system design...
      </div>
    );
  }

  if (errorMessage || !design) {
    return (
      <div className="space-y-4">
        <Link
          href="/system-designer"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to System Designer
        </Link>

        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h1 className="font-semibold text-red-900">
            Could not load design
          </h1>
          <p className="mt-2 text-sm text-red-800">
            {errorMessage || "System design not found."}
          </p>
        </div>
      </div>
    );
  }

  const totalPanels =
    Number(design.panel_quantity ?? panels.length);

  const totalPvKw =
    Number(design.total_pv_kw ?? 0);

  const totalBatteryKwh =
    Number(design.battery_capacity_kwh ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/system-designer"
          className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to System Designer
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {design.design_name || "Unnamed Design"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Saved solar system design and bill of materials
            </p>
          </div>

          <span className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
            Read-only view
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">PV capacity</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {totalPvKw.toFixed(2)} kW
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Solar panels</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {totalPanels}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Inverter</p>
          <p className="mt-2 font-semibold text-zinc-900">
            {formatValue(design.inverter_capacity_kw, "kW")}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {design.inverter_model || "Not specified"}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Battery capacity</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">
            {totalBatteryKwh.toFixed(2)} kWh
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {design.battery_model || "Not specified"}
          </p>
        </div>
      </div>

      <Card title="System specifications">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Design name" value={design.design_name} />
          <Detail label="Panel model" value={design.panel_model} />
          <Detail
            label="Panel wattage"
            value={formatValue(design.panel_wattage_w, "W")}
          />
          <Detail
            label="Panel length"
            value={formatValue(design.panel_length_m, "m")}
          />
          <Detail
            label="Panel width"
            value={formatValue(design.panel_width_m, "m")}
          />
          <Detail label="Inverter model" value={design.inverter_model} />
          <Detail
            label="Inverter capacity"
            value={formatValue(design.inverter_capacity_kw, "kW")}
          />
          <Detail label="Battery model" value={design.battery_model} />
          <Detail
            label="Battery capacity"
            value={formatValue(design.battery_capacity_kwh, "kWh")}
          />
          <Detail
            label="Created"
            value={
              design.created_at
                ? new Date(design.created_at).toLocaleString("en-ZA")
                : "—"
            }
          />
        </div>
      </Card>

      <Card title={`Roof sections (${sections.length})`}>
        {sections.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No roof sections were saved.
          </p>
        ) : (
          <div className="space-y-6">
            {sections.map((section, index) => {
              const sectionPanels = panels.filter(
                (panel) => panel.roof_section_id === section.id
              );

              const sectionStrings = strings.filter(
                (string) => string.roof_section_id === section.id
              );

              return (
                <div
                  key={section.id}
                  className="rounded-lg border border-zinc-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-zinc-900">
                        {section.name || `Roof Section ${index + 1}`}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {section.orientation || "Orientation not specified"}
                        {section.tilt_degrees != null
                          ? ` · ${section.tilt_degrees}° tilt`
                          : ""}
                      </p>
                    </div>

                    <span className="rounded-md bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
                      {sectionPanels.length} panels
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail
                      label="Panel orientation"
                      value={section.panel_orientation}
                    />
                    <Detail
                      label="Mounting template ID"
                      value={section.mounting_template_id}
                    />
                    <Detail
                      label="Rail orientation"
                      value={section.rail_orientation}
                    />
                    <Detail
                      label="Rails per panel"
                      value={section.rails_per_panel}
                    />
                    <Detail
                      label="Roof width"
                      value={formatValue(section.width_m, "m")}
                    />
                    <Detail
                      label="Roof length"
                      value={formatValue(section.length_m, "m")}
                    />
                    <Detail
                      label="Usable width"
                      value={formatValue(section.usable_width_m, "m")}
                    />
                    <Detail
                      label="Usable length"
                      value={formatValue(section.usable_length_m, "m")}
                    />
                  </div>

                  {section.notes && (
                    <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-600">
                      {section.notes}
                    </p>
                  )}

                  <div className="mt-5">
                    <h4 className="mb-2 text-sm font-semibold text-zinc-800">
                      Panel layout
                    </h4>

                    {sectionPanels.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        No panel layout data found.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="grid w-max gap-2">
                          {Array.from({
                            length: Math.max(
                              1,
                              ...sectionPanels.map(
                                (panel) => Number(panel.row_number || 1)
                              )
                            ),
                          }).map((_, rowIndex) => {
                            const rowNumber = rowIndex + 1;

                            const maxColumn = Math.max(
                              1,
                              ...sectionPanels.map(
                                (panel) => Number(panel.column_number || 1)
                              )
                            );

                            return (
                              <div
                                key={rowNumber}
                                className="flex gap-2"
                              >
                                {Array.from({
                                  length: maxColumn,
                                }).map((__, columnIndex) => {
                                  const columnNumber = columnIndex + 1;

                                  const panel = sectionPanels.find(
                                    (item) =>
                                      Number(item.row_number) === rowNumber &&
                                      Number(item.column_number) === columnNumber
                                  );

                                  const panelString = panel
                                    ? strings.find(
                                        (item) => item.id === panel.string_id
                                      )
                                    : null;

                                  return (
                                    <div
                                      key={columnNumber}
                                      className={`flex h-16 w-14 flex-col items-center justify-center rounded border text-xs ${
                                        panel
                                          ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                                          : "border-dashed border-zinc-200 bg-zinc-50 text-zinc-300"
                                      }`}
                                    >
                                      {panel ? (
                                        <>
                                          <span className="font-semibold">
                                            {panel.panel_number}
                                          </span>
                                          <span>
                                            {panelString
                                              ? `S${panelString.string_number}`
                                              : "—"}
                                          </span>
                                        </>
                                      ) : (
                                        "—"
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    <h4 className="mb-2 text-sm font-semibold text-zinc-800">
                      Strings ({sectionStrings.length})
                    </h4>

                    {sectionStrings.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        No strings saved for this roof section.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 text-zinc-600">
                            <tr>
                              <th className="px-3 py-2">String</th>
                              <th className="px-3 py-2">MPPT</th>
                              <th className="px-3 py-2">Panels</th>
                              <th className="px-3 py-2">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {sectionStrings.map((string) => (
                              <tr key={string.id}>
                                <td className="px-3 py-2">
                                  {string.string_number}
                                </td>
                                <td className="px-3 py-2">
                                  {formatValue(string.mppt_number)}
                                </td>
                                <td className="px-3 py-2">
                                  {formatValue(string.panel_quantity)}
                                </td>
                                <td className="px-3 py-2">
                                  {formatValue(string.notes)}
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
            })}
          </div>
        )}
      </Card>

      <Card title={`Calculated bill of materials (${bom.length} items)`}>
        {bom.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No BOM items were saved for this design. This may mean no
            mounting template was selected when the design was saved.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Component</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Calculation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {bom.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {item.component_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatValue(item.description)}
                    </td>
                    <td className="px-4 py-3 text-zinc-900">
                      {formatValue(item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatValue(item.unit)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatValue(item.calculation_method)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
