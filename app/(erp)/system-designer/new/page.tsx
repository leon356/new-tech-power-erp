"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Sun,
  Battery,
  Zap,
  Grid3X3,
  RotateCcw,
  Cable,
  X,
  Ruler,
  Hammer,
  Link2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  calculateBom,
  type BomTemplateItem,
  type CalculatedBomItem,
} from "@/lib/supabase/bom-calculator";

type Panel = {
  id: string;
  row: number;
  column: number;
  panel_number: number;
  string_id: string | null;
};

type DesignString = {
  id: string;
  string_number: number;
  mppt_number: number | "";
  notes: string;
};

type RoofSection = {
  id: string;
  name: string;
  orientation: string;
  tilt_degrees: number | "";
  panel_orientation: "portrait" | "landscape";
  width_m: number | "";
  length_m: number | "";
  usable_width_m: number | "";
  usable_length_m: number | "";
  mounting_template_id: string | null;
  rail_orientation: "horizontal" | "vertical" | "";
  rails_per_panel: number | "";
  rail_overhang_m: number | "";
  rail_stock_length_m: number | "";
  mounting_spacing_m: number | "";
  mounting_edge_offset_m: number | "";
  notes: string;
  panels: Panel[];
  strings: DesignString[];
};

type Job = {
  id: string;
  job_number: string;
  title: string;
  client_id: string;
  site_id: string;
};

type MountingTemplate = {
  id: string;
  name: string;
  description: string | null;
  roof_type: string | null;
  mounting_method: string | null;
  active: boolean;
};

type GeometryResult = {
  occupiedRows: number;
  occupiedColumns: number;
  railCount: number;
  railLength: number;
  totalRailLength: number;
  stockRailCount: number;
  joinerCount: number;
  mountingPointsPerRail: number;
  mountingPointCount: number;
};

type SectionBom = {
  sectionId: string;
  sectionName: string;
  templateId: string | null;
  items: CalculatedBomItem[];
};

const supabase = createClient();

const GRID_ROWS = 8;
const GRID_COLUMNS = 12;

const STRING_COLORS = [
  { border: "border-rose-500", bg: "bg-rose-50", text: "text-rose-800" },
  { border: "border-sky-500", bg: "bg-sky-50", text: "text-sky-800" },
  { border: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800" },
  { border: "border-violet-500", bg: "bg-violet-50", text: "text-violet-800" },
  { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-800" },
  { border: "border-cyan-500", bg: "bg-cyan-50", text: "text-cyan-800" },
  { border: "border-fuchsia-500", bg: "bg-fuchsia-50", text: "text-fuchsia-800" },
  { border: "border-orange-500", bg: "bg-orange-50", text: "text-orange-800" },
];

function getStringColor(stringNumber: number) {
  return STRING_COLORS[(Math.max(1, stringNumber) - 1) % STRING_COLORS.length];
}

function emptyRoofSection(): RoofSection {
  return {
    id: crypto.randomUUID(),
    name: "Roof Section 1",
    orientation: "",
    tilt_degrees: "",
    panel_orientation: "portrait",
    width_m: "",
    length_m: "",
    usable_width_m: "",
    usable_length_m: "",
    mounting_template_id: null,
    rail_orientation: "horizontal",
    rails_per_panel: 2,
    rail_overhang_m: 0,
    rail_stock_length_m: 5.15,
    mounting_spacing_m: 1.2,
    mounting_edge_offset_m: 0,
    notes: "",
    panels: [],
    strings: [],
  };
}

export default function NewSystemDesignPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [mountingTemplates, setMountingTemplates] = useState<
    MountingTemplate[]
  >([]);

  const [bomTemplateItems, setBomTemplateItems] = useState<
    BomTemplateItem[]
  >([]);

  const [selectedJobId, setSelectedJobId] = useState("");

  const [designName, setDesignName] = useState("");

  const [inverterModel, setInverterModel] = useState("");
  const [inverterCapacity, setInverterCapacity] = useState<number | "">("");

  const [batteryModel, setBatteryModel] = useState("");
  const [batteryCapacity, setBatteryCapacity] = useState<number | "">("");

  const [panelModel, setPanelModel] = useState("");
  const [panelWattage, setPanelWattage] = useState<number | "">("");

  const [panelLength, setPanelLength] = useState<number | "">("");
  const [panelWidth, setPanelWidth] = useState<number | "">(1.2);

  const [roofSections, setRoofSections] = useState<RoofSection[]>([
    emptyRoofSection(),
  ]);

  const [activeSectionId, setActiveSectionId] = useState(
    roofSections[0].id
  );

  const [builderMode, setBuilderMode] = useState<"layout" | "strings">(
    "layout"
  );

  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [loadingBom, setLoadingBom] = useState(false);

  const activeSection =
    roofSections.find((section) => section.id === activeSectionId) ??
    roofSections[0];

  /*
   * --------------------------------------------------------------------------
   * LOAD JOBS
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    async function loadJobs() {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_number, title, client_id, site_id")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load jobs:", error);
        return;
      }

      setJobs(data ?? []);
    }

    loadJobs();
  }, []);

  /*
   * --------------------------------------------------------------------------
   * LOAD MOUNTING TEMPLATES
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    async function loadMountingTemplates() {
      const { data, error } = await supabase
        .from("mounting_templates")
        .select(
          "id, name, description, roof_type, mounting_method, active"
        )
        .eq("active", true)
        .order("name");

      if (error) {
        console.error("Failed to load mounting templates:", error);
        return;
      }

      setMountingTemplates(data ?? []);
    }

    loadMountingTemplates();
  }, []);

  /*
   * --------------------------------------------------------------------------
   * LOAD BOM TEMPLATE ITEMS
   *
   * We load all active template items once and filter them locally.
   * This allows different roof sections to use different templates.
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    async function loadBomItems() {
      setLoadingBom(true);

      const { data, error } = await supabase
        .from("bom_template_items")
        .select(
          `
            id,
            mounting_template_id,
            component_name,
            description,
            calculation_method,
            quantity_value,
            quantity_unit,
            calculation_multiplier,
            rounding_method,
            rounding_value,
            active
          `
        )
        .eq("active", true)
        .order("component_name");

      if (error) {
        console.error("Failed to load BOM template items:", error);
        setBomTemplateItems([]);
      } else {
        setBomTemplateItems((data ?? []) as BomTemplateItem[]);
      }

      setLoadingBom(false);
    }

    loadBomItems();
  }, []);

  /*
   * --------------------------------------------------------------------------
   * HELPERS
   * --------------------------------------------------------------------------
   */

  function updateSection(
    sectionId: string,
    updates: Partial<RoofSection>
  ) {
    setRoofSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              ...updates,
            }
          : section
      )
    );
  }

  function addRoofSection() {
    const newSection = emptyRoofSection();

    newSection.name = `Roof Section ${roofSections.length + 1}`;

    setRoofSections((current) => [...current, newSection]);
    setActiveSectionId(newSection.id);
    setSelectedPanels([]);
  }

  function removeRoofSection(sectionId: string) {
    if (roofSections.length === 1) {
      alert("A design must have at least one roof section.");
      return;
    }

    const remaining = roofSections.filter(
      (section) => section.id !== sectionId
    );

    setRoofSections(remaining);

    if (activeSectionId === sectionId) {
      setActiveSectionId(remaining[0].id);
    }

    setSelectedPanels([]);
  }

  function addPanel(row: number, column: number) {
    const section = roofSections.find(
      (item) => item.id === activeSectionId
    );

    if (!section) return;

    const existing = section.panels.find(
      (panel) =>
        panel.row === row && panel.column === column
    );

    if (existing) return;

    const panel: Panel = {
      id: crypto.randomUUID(),
      row,
      column,
      panel_number:
        section.panels.length > 0
          ? Math.max(
              ...section.panels.map(
                (item) => item.panel_number
              )
            ) + 1
          : 1,
      string_id: null,
    };

    updateSection(activeSectionId, {
      panels: [...section.panels, panel],
    });
  }

  function removePanel(panelId: string) {
    const section = roofSections.find(
      (item) => item.id === activeSectionId
    );

    if (!section) return;

    const removedPanel = section.panels.find(
      (panel) => panel.id === panelId
    );

    const panels = section.panels
      .filter((panel) => panel.id !== panelId)
      .map((panel, index) => ({
        ...panel,
        panel_number: index + 1,
      }));

    const strings = section.strings.map((string) => ({
      ...string,
    }));

    if (removedPanel) {
      for (const string of strings) {
        const assigned = section.panels.filter(
          (panel) =>
            panel.string_id === string.id &&
            panel.id !== removedPanel.id
        );

        string.notes = string.notes;
      }
    }

    updateSection(activeSectionId, {
      panels,
      strings,
    });

    setSelectedPanels((current) =>
      current.filter((id) => id !== panelId)
    );
  }

  function handlePanelClick(
    row: number,
    column: number
  ) {
    const section = roofSections.find(
      (item) => item.id === activeSectionId
    );

    if (!section) return;

    const panel = section.panels.find(
      (item) =>
        item.row === row &&
        item.column === column
    );

    if (builderMode === "layout") {
      if (panel) {
        removePanel(panel.id);
      } else {
        addPanel(row, column);
      }

      return;
    }

    if (!panel) return;

    setSelectedPanels((current) =>
      current.includes(panel.id)
        ? current.filter((id) => id !== panel.id)
        : [...current, panel.id]
    );
  }

  /*
   * --------------------------------------------------------------------------
   * STRINGS
   * --------------------------------------------------------------------------
   */

  function addString() {
    const section = roofSections.find(
      (item) => item.id === activeSectionId
    );

    if (!section) return;

    const nextNumber =
      section.strings.length > 0
        ? Math.max(
            ...section.strings.map(
              (string) => string.string_number
            )
          ) + 1
        : 1;

    const newString: DesignString = {
      id: crypto.randomUUID(),
      string_number: nextNumber,
      mppt_number: "",
      notes: "",
    };

    updateSection(activeSectionId, {
      strings: [...section.strings, newString],
    });
  }

  function updateString(
    stringId: string,
    updates: Partial<DesignString>
  ) {
    const section = roofSections.find(
      (item) => item.id === activeSectionId
    );

    if (!section) return;

    updateSection(activeSectionId, {
      strings: section.strings.map((string) =>
        string.id === stringId
          ? {
              ...string,
              ...updates,
            }
          : string
      ),
    });
  }

  function deleteString(stringId: string) {
    const section = roofSections.find(
      (item) => item.id === activeSectionId
    );

    if (!section) return;

    const strings = section.strings.filter(
      (string) => string.id !== stringId
    );

    const panels = section.panels.map((panel) =>
      panel.string_id === stringId
        ? {
            ...panel,
            string_id: null,
          }
        : panel
    );

    updateSection(activeSectionId, {
      strings,
      panels,
    });
  }

  function clearStringAssignments() {
    const section = roofSections.find(
      (item) => item.id === activeSectionId
    );

    if (!section) return;

    updateSection(activeSectionId, {
      panels: section.panels.map((panel) => ({
        ...panel,
        string_id: null,
      })),
    });

    setSelectedPanels([]);
  }

  function assignSelectedPanelsToString(
    stringId: string
  ) {
    const section = roofSections.find(
      (item) => item.id === activeSectionId
    );

    if (!section || selectedPanels.length === 0) return;

    updateSection(activeSectionId, {
      panels: section.panels.map((panel) =>
        selectedPanels.includes(panel.id)
          ? {
              ...panel,
              string_id: stringId,
            }
          : panel
      ),
    });

    setSelectedPanels([]);
  }

  function getStringPanelCount(
    section: RoofSection,
    stringId: string
  ) {
    return section.panels.filter(
      (panel) => panel.string_id === stringId
    ).length;
  }

  /*
   * --------------------------------------------------------------------------
   * GEOMETRY
   * --------------------------------------------------------------------------
   */

  function calculateGeometry(
    section: RoofSection
  ): GeometryResult {
    const panels = section.panels;

    if (
      panels.length === 0 ||
      !section.rails_per_panel ||
      Number(section.rails_per_panel) <= 0
    ) {
      return {
        occupiedRows: 0,
        occupiedColumns: 0,
        railCount: 0,
        railLength: 0,
        totalRailLength: 0,
        stockRailCount: 0,
        joinerCount: 0,
        mountingPointsPerRail: 0,
        mountingPointCount: 0,
      };
    }

    const occupiedRows =
      Math.max(...panels.map((panel) => panel.row)) -
      Math.min(...panels.map((panel) => panel.row)) +
      1;

    const occupiedColumns =
      Math.max(
        ...panels.map((panel) => panel.column)
      ) -
      Math.min(
        ...panels.map((panel) => panel.column)
      ) +
      1;

    const railsPerPanel = Number(
      section.rails_per_panel
    );

    const panelLengthValue =
      typeof panelLength === "number"
        ? panelLength
        : 0;

    const panelWidthValue =
      typeof panelWidth === "number"
        ? panelWidth
        : 0;

    const isPortrait =
      section.panel_orientation === "portrait";

    const horizontalPanelWidth = isPortrait
      ? panelWidthValue
      : panelLengthValue;

    const verticalPanelHeight = isPortrait
      ? panelLengthValue
      : panelWidthValue;

    let railCount = 0;
    let railLength = 0;

    if (section.rail_orientation === "vertical") {
      railCount =
        occupiedColumns * railsPerPanel;

      railLength =
        occupiedRows * verticalPanelHeight +
        Number(section.rail_overhang_m || 0) * 2;
    } else {
      railCount =
        occupiedRows * railsPerPanel;

      railLength =
        occupiedColumns * horizontalPanelWidth +
        Number(section.rail_overhang_m || 0) * 2;
    }

    const totalRailLength =
      railLength * railCount;

    const stockLength =
      Number(section.rail_stock_length_m || 0);

    let stockRailCount = 0;
    let joinerCount = 0;

    /*
     * Estimate stock rails from total rail length, allowing offcuts from
     * one run to contribute to another. This is a material estimate, not
     * a cut plan. Joiners are counted per continuous rail run.
     */
    if (
      stockLength > 0 &&
      railLength > 0 &&
      railCount > 0
    ) {
      stockRailCount = Math.ceil(
        (railLength * railCount) / stockLength
      );

      const piecesPerContinuousRail = Math.ceil(
        railLength / stockLength
      );

      joinerCount =
        Math.max(piecesPerContinuousRail - 1, 0) *
        railCount;
    }

    const usableRailLength = Math.max(
      railLength -
        Number(section.mounting_edge_offset_m || 0) *
          2,
      0
    );

    const mountingSpacing =
      Number(section.mounting_spacing_m || 0);

    let mountingPointsPerRail = 0;

    if (
      usableRailLength > 0 &&
      mountingSpacing > 0
    ) {
      mountingPointsPerRail =
        Math.ceil(
          usableRailLength / mountingSpacing
        ) + 1;
    }

    const mountingPointCount =
      mountingPointsPerRail * railCount;

    return {
      occupiedRows,
      occupiedColumns,
      railCount,
      railLength,
      totalRailLength,
      stockRailCount,
      joinerCount,
      mountingPointsPerRail,
      mountingPointCount,
    };
  }

  /*
   * --------------------------------------------------------------------------
   * GLOBAL DESIGN TOTALS
   * --------------------------------------------------------------------------
   */

  const totalPanels = useMemo(() => {
    return roofSections.reduce(
      (total, section) =>
        total + section.panels.length,
      0
    );
  }, [roofSections]);

  const totalPvKw = useMemo(() => {
    if (
      typeof panelWattage !== "number" ||
      panelWattage <= 0
    ) {
      return 0;
    }

    return (
      (panelWattage * totalPanels) /
      1000
    );
  }, [panelWattage, totalPanels]);

  const totalRailLength = useMemo(() => {
    return roofSections.reduce(
      (total, section) =>
        total + calculateGeometry(section).totalRailLength,
      0
    );
  }, [roofSections, panelLength, panelWidth]);

  const totalStockRails = useMemo(() => {
    return roofSections.reduce(
      (total, section) =>
        total + calculateGeometry(section).stockRailCount,
      0
    );
  }, [roofSections, panelLength, panelWidth]);

  const totalJoiners = useMemo(() => {
    return roofSections.reduce(
      (total, section) =>
        total + calculateGeometry(section).joinerCount,
      0
    );
  }, [roofSections, panelLength, panelWidth]);

  const totalMountingPoints = useMemo(() => {
    return roofSections.reduce(
      (total, section) =>
        total +
        calculateGeometry(section).mountingPointCount,
      0
    );
  }, [roofSections, panelLength, panelWidth]);

  const totalRails = useMemo(() => {
    return roofSections.reduce(
      (total, section) =>
        total + calculateGeometry(section).railCount,
      0
    );
  }, [roofSections, panelLength, panelWidth]);

  const totalStrings = useMemo(() => {
    return roofSections.reduce(
      (total, section) =>
        total + section.strings.length,
      0
    );
  }, [roofSections]);

  const totalArrays = useMemo(() => {
    /*
     * For now each roof section is treated as one array.
     * This can later be changed if arrays become their own
     * database entity.
     */
    return roofSections.filter(
      (section) => section.panels.length > 0
    ).length;
  }, [roofSections]);

  /*
   * --------------------------------------------------------------------------
   * CALCULATED BOM
   *
   * Each roof section is calculated independently according to
   * its selected mounting template.
   * --------------------------------------------------------------------------
   */

  const calculatedSectionBoms = useMemo<SectionBom[]>(
    () => {
      return roofSections
        .filter(
          (section) =>
            section.panels.length > 0 &&
            section.mounting_template_id
        )
        .map((section) => {
          const geometry =
            calculateGeometry(section);

          const templateItems =
            bomTemplateItems.filter(
              (item) =>
                item.mounting_template_id ===
                section.mounting_template_id
            );

          const result = calculateBom(
            templateItems,
            {
              panelCount: section.panels.length,
              stringCount: section.strings.length,
              arrayCount: 1,
              mountingPointCount:
                geometry.mountingPointCount,
              railCount: geometry.railCount,
              railLength:
                geometry.totalRailLength,
            }
          );

          return {
            sectionId: section.id,
            sectionName: section.name,
            templateId:
              section.mounting_template_id,
            items: result,
          };
        });
    },
    [
      roofSections,
      bomTemplateItems,
      panelLength,
      panelWidth,
    ]
  );

  /*
   * Combine identical BOM components across roof sections.
   */
  const calculatedBom = useMemo<
    CalculatedBomItem[]
  >(() => {
    const combined = new Map<
      string,
      CalculatedBomItem
    >();

    for (const sectionBom of calculatedSectionBoms) {
      for (const item of sectionBom.items) {
        const key = [
          item.component_name,
          item.unit ?? "",
          item.source_template_item_id,
        ].join("|");

        const existing = combined.get(key);

        if (!existing) {
          combined.set(key, {
            ...item,
          });
        } else {
          combined.set(key, {
            ...existing,
            quantity:
              existing.quantity + item.quantity,
          });
        }
      }
    }

    return Array.from(combined.values());
  }, [calculatedSectionBoms]);

  /*
   * --------------------------------------------------------------------------
   * RESET
   * --------------------------------------------------------------------------
   */

  function resetDesign() {
    const newSection = emptyRoofSection();

    setSelectedJobId("");
    setDesignName("");

    setInverterModel("");
    setInverterCapacity("");

    setBatteryModel("");
    setBatteryCapacity("");

    setPanelModel("");
    setPanelWattage("");

    setPanelLength("");
    setPanelWidth("");

    setRoofSections([newSection]);
    setActiveSectionId(newSection.id);

    setBuilderMode("layout");
    setSelectedPanels([]);
  }

  /*
   * --------------------------------------------------------------------------
   * SAVE
   * --------------------------------------------------------------------------
   */

  async function saveDesign() {
    if (!selectedJobId) {
      alert("Please select a job.");
      return;
    }

    if (!designName.trim()) {
      alert("Please enter a design name.");
      return;
    }

    if (
      typeof panelWattage !== "number" ||
      panelWattage <= 0
    ) {
      alert("Please enter a valid panel wattage.");
      return;
    }

    if (totalPanels <= 0) {
      alert("Please add at least one panel.");
      return;
    }

    for (const section of roofSections) {
      for (const string of section.strings) {
        const count = getStringPanelCount(
          section,
          string.id
        );

        if (count === 0) {
          alert(
            `${section.name}: String ${string.string_number} has no panels assigned.`
          );
          return;
        }
      }
    }

    const job = jobs.find(
      (item) => item.id === selectedJobId
    );

    if (!job) {
      alert("Selected job could not be found.");
      return;
    }

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to save a design.");
      return;
    }

    setSaving(true);

    try {
      /*
       * ----------------------------------------------------------------------
       * CREATE SYSTEM DESIGN
       * ----------------------------------------------------------------------
       */

      const { data: savedDesign, error: designError } =
        await supabase
          .from("system_designs")
          .insert({
            job_id: job.id,
            client_id: job.client_id,
            site_id: job.site_id,

            design_name: designName.trim(),

            inverter_model:
              inverterModel.trim() || null,

            inverter_capacity_kw:
              inverterCapacity === ""
                ? null
                : inverterCapacity,

            battery_model:
              batteryModel.trim() || null,

            battery_capacity_kwh:
              batteryCapacity === ""
                ? null
                : batteryCapacity,

            panel_model:
              panelModel.trim() || null,

            panel_wattage_w:
              panelWattage,

            panel_length_m:
              panelLength === ""
                ? null
                : panelLength,

            panel_width_m:
              panelWidth === ""
                ? null
                : panelWidth,

            panel_quantity: totalPanels,
            total_pv_kw: totalPvKw,

            created_by: user.id,
          })
          .select("id")
          .single();

      if (designError) {
        throw designError;
      }

      if (!savedDesign) {
        throw new Error(
          "System design was created but no ID was returned."
        );
      }

      /*
       * ----------------------------------------------------------------------
       * SAVE ROOF SECTIONS
       * ----------------------------------------------------------------------
       */

      const localStringIdMap = new Map<
        string,
        string
      >();

      for (const section of roofSections) {
        const geometry =
          calculateGeometry(section);

        const { data: savedSection, error: sectionError } =
          await supabase
            .from("roof_sections")
            .insert({
              system_design_id:
                savedDesign.id,

              name: section.name,

              orientation:
                section.orientation || null,

              tilt_degrees:
                section.tilt_degrees === ""
                  ? null
                  : section.tilt_degrees,

              panel_quantity:
                section.panels.length,

              notes:
                section.notes.trim() || null,

              mounting_template_id:
                section.mounting_template_id,

              width_m:
                section.width_m === ""
                  ? null
                  : section.width_m,

              length_m:
                section.length_m === ""
                  ? null
                  : section.length_m,

              usable_width_m:
                section.usable_width_m === ""
                  ? null
                  : section.usable_width_m,

              usable_length_m:
                section.usable_length_m === ""
                  ? null
                  : section.usable_length_m,

              panel_orientation:
                section.panel_orientation,

              rail_orientation:
                section.rail_orientation || null,

              rails_per_panel:
                section.rails_per_panel === ""
                  ? null
                  : section.rails_per_panel,

              rail_overhang_m:
                section.rail_overhang_m === ""
                  ? null
                  : section.rail_overhang_m,

              rail_stock_length_m:
                section.rail_stock_length_m === ""
                  ? null
                  : section.rail_stock_length_m,

              mounting_spacing_m:
                section.mounting_spacing_m === ""
                  ? null
                  : section.mounting_spacing_m,

              mounting_edge_offset_m:
                section.mounting_edge_offset_m === ""
                  ? null
                  : section.mounting_edge_offset_m,
            })
            .select("id")
            .single();

        if (sectionError) {
          throw sectionError;
        }

        if (!savedSection) {
          throw new Error(
            `Roof section "${section.name}" was not saved.`
          );
        }

        /*
         * --------------------------------------------------------------------
         * SAVE STRINGS
         * --------------------------------------------------------------------
         */

        for (const string of section.strings) {
          const panelCount =
            getStringPanelCount(
              section,
              string.id
            );

          const {
            data: savedString,
            error: stringError,
          } = await supabase
            .from("system_strings")
            .insert({
              roof_section_id:
                savedSection.id,

              string_number:
                string.string_number,

              mppt_number:
                string.mppt_number === ""
                  ? null
                  : string.mppt_number,

              panel_quantity:
                panelCount,

              notes:
                string.notes.trim() || null,
            })
            .select("id")
            .single();

          if (stringError) {
            throw stringError;
          }

          if (!savedString) {
            throw new Error(
              `String ${string.string_number} could not be saved.`
            );
          }

          localStringIdMap.set(
            string.id,
            savedString.id
          );
        }

        /*
         * --------------------------------------------------------------------
         * SAVE VISUAL PANELS
         * --------------------------------------------------------------------
         */

        if (section.panels.length > 0) {
          const panelRows =
            section.panels.map((panel) => ({
              system_design_id:
                savedDesign.id,

              roof_section_id:
                savedSection.id,

              string_id:
                panel.string_id
                  ? localStringIdMap.get(
                      panel.string_id
                    ) ?? null
                  : null,

              row_number:
                panel.row,

              column_number:
                panel.column,

              panel_number:
                panel.panel_number,
            }));

          const { error: panelError } =
            await supabase
              .from("system_panels")
              .insert(panelRows);

          if (panelError) {
            throw panelError;
          }
        }
      }

      /*
       * ----------------------------------------------------------------------
       * SAVE CALCULATED BOM
       *
       * Recalculate directly from the current design rather than trusting
       * stale UI state.
       * ----------------------------------------------------------------------
       */

      const bomRows: Array<{
        system_design_id: string;
        component_name: string;
        description: string | null;
        quantity: number;
        unit: string | null;
        calculation_method: string;
        calculation_basis: number;
        calculation_multiplier: number;
        rounding_method: string;
        source_template_item_id: string | null;
        source_template_id: string | null;
      }> = [];

      for (const section of roofSections) {
        if (
          section.panels.length === 0 ||
          !section.mounting_template_id
        ) {
          continue;
        }

        const geometry =
          calculateGeometry(section);

        const templateItems =
          bomTemplateItems.filter(
            (item) =>
              item.mounting_template_id ===
              section.mounting_template_id
          );

        const sectionItems = calculateBom(
          templateItems,
          {
            panelCount:
              section.panels.length,

            stringCount:
              section.strings.length,

            arrayCount: 1,

            mountingPointCount:
              geometry.mountingPointCount,

            railCount:
              geometry.railCount,

            railLength:
              geometry.totalRailLength,
          }
        );

        for (const item of sectionItems) {
          bomRows.push({
            system_design_id:
              savedDesign.id,

            component_name:
              item.component_name,

            description:
              item.description,

            quantity:
              item.quantity,

            unit:
              item.unit,

            calculation_method:
              item.calculation_method,

            calculation_basis:
              item.calculation_basis,

            calculation_multiplier:
              item.calculation_multiplier,

            rounding_method:
              item.rounding_method,

            source_template_item_id:
              item.source_template_item_id,

            source_template_id:
              section.mounting_template_id,
          });
        }
      }

      if (bomRows.length > 0) {
        const { error: bomError } =
          await supabase
            .from("system_design_bom")
            .insert(bomRows);

        if (bomError) {
          throw bomError;
        }
      }

      alert(
        "System design and calculated BOM saved successfully."
      );

      resetDesign();
    } catch (error) {
      console.error(
        "Failed to save system design:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Unknown error";

      alert(
        `Failed to save system design:\n${message}`
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * --------------------------------------------------------------------------
   * UI
   * --------------------------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        {/* HEADER */}

        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
              New System Design
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Design the solar system, panel layout,
              string configuration and mounting
              requirements.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetDesign}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <button
              type="button"
              onClick={saveDesign}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />

              {saving
                ? "Saving..."
                : "Save Design"}
            </button>
          </div>
        </div>

        {/* SYSTEM INFORMATION */}

        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Zap size={18} />

              <h2 className="font-semibold text-zinc-950">
                System Information
              </h2>
            </div>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Job">
              <select
                value={selectedJobId}
                onChange={(event) =>
                  setSelectedJobId(
                    event.target.value
                  )
                }
                className="input"
              >
                <option value="">
                  Select a job
                </option>

                {jobs.map((job) => (
                  <option
                    key={job.id}
                    value={job.id}
                  >
                    {job.job_number} — {job.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Design Name">
              <input
                value={designName}
                onChange={(event) =>
                  setDesignName(
                    event.target.value
                  )
                }
                placeholder="e.g. Main House Solar System"
                className="input"
              />
            </Field>

            <Field label="Panel Model">
              <input
                value={panelModel}
                onChange={(event) =>
                  setPanelModel(
                    event.target.value
                  )
                }
                placeholder="e.g. JA Solar 550W"
                className="input"
              />
            </Field>

            <Field label="Panel Wattage (W)">
              <input
                type="number"
                min="0"
                value={panelWattage}
                onChange={(event) =>
                  setPanelWattage(
                    event.target.value === ""
                      ? ""
                      : Number(
                          event.target.value
                        )
                  )
                }
                className="input"
              />
            </Field>

            <Field label="Panel Length (m)">
              <input
                type="number"
                min="0"
                step="0.001"
                value={panelLength}
                onChange={(event) =>
                  setPanelLength(
                    event.target.value === ""
                      ? ""
                      : Number(
                          event.target.value
                        )
                  )
                }
                className="input"
              />
            </Field>

            <Field label="Panel Width (m)">
              <input
                type="number"
                min="0"
                step="0.001"
                value={panelWidth}
                onChange={(event) =>
                  setPanelWidth(
                    event.target.value === ""
                      ? ""
                      : Number(
                          event.target.value
                        )
                  )
                }
                className="input"
              />
            </Field>

            {/* Inverter and battery sizing belong in the electrical design, not this PV layout and mounting-material designer. */}
          </div>
        </section>

        {/* SUMMARY */}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Sun size={18} />

            <h2 className="font-semibold text-zinc-950">
              Design Summary
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Panels"
              value={totalPanels}
              icon={<Sun size={18} />}
            />

            <SummaryCard
              label="PV Capacity"
              value={`${totalPvKw.toFixed(2)} kW`}
              icon={<Zap size={18} />}
            />

            <SummaryCard
              label="Strings"
              value={totalStrings}
              icon={<Cable size={18} />}
            />

            <SummaryCard
              label="Rail Length"
              value={`${totalRailLength.toFixed(
                2
              )} m`}
              icon={<Ruler size={18} />}
            />

            <SummaryCard
              label="Mounting Points"
              value={totalMountingPoints}
              icon={<Hammer size={18} />}
            />
          </div>
        </section>

        {/* ROOF SECTIONS */}

        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-zinc-950">
                Roof Sections
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Create the physical panel layout
                for each roof section.
              </p>
            </div>

            <button
              type="button"
              onClick={addRoofSection}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <Plus size={16} />
              Add Roof Section
            </button>
          </div>

          <div className="border-b border-zinc-200 px-5">
            <div className="flex gap-1 overflow-x-auto">
              {roofSections.map((section) => (
                <button
                  type="button"
                  key={section.id}
                  onClick={() => {
                    setActiveSectionId(
                      section.id
                    );
                    setSelectedPanels([]);
                  }}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
                    activeSectionId === section.id
                      ? "border-black text-black"
                      : "border-transparent text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </div>

          {activeSection && (
            <div className="space-y-6 p-5">
              {/* SECTION DETAILS */}

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Section Name">
                  <input
                    value={activeSection.name}
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          name:
                            event.target.value,
                        }
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Orientation">
                  <select
                    value={
                      activeSection.orientation
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          orientation:
                            event.target.value,
                        }
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Select orientation
                    </option>
                    <option value="north">
                      North
                    </option>
                    <option value="south">
                      South
                    </option>
                    <option value="east">
                      East
                    </option>
                    <option value="west">
                      West
                    </option>
                    <option value="north-east">
                      North-East
                    </option>
                    <option value="north-west">
                      North-West
                    </option>
                    <option value="south-east">
                      South-East
                    </option>
                    <option value="south-west">
                      South-West
                    </option>
                  </select>
                </Field>

                <Field label="Tilt (°)">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={
                      activeSection.tilt_degrees
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          tilt_degrees:
                            event.target.value ===
                            ""
                              ? ""
                              : Number(
                                  event.target
                                    .value
                                ),
                        }
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Panel Orientation">
                  <select
                    value={
                      activeSection.panel_orientation
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          panel_orientation:
                            event.target
                              .value as
                              | "portrait"
                              | "landscape",
                        }
                      )
                    }
                    className="input"
                  >
                    <option value="portrait">
                      Portrait
                    </option>

                    <option value="landscape">
                      Landscape
                    </option>
                  </select>
                </Field>

                <Field label="Roof Width (m)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      activeSection.width_m
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          width_m:
                            event.target.value ===
                            ""
                              ? ""
                              : Number(
                                  event.target
                                    .value
                                ),
                        }
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Roof Length (m)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      activeSection.length_m
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          length_m:
                            event.target.value ===
                            ""
                              ? ""
                              : Number(
                                  event.target
                                    .value
                                ),
                        }
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Usable Width (m)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      activeSection
                        .usable_width_m
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          usable_width_m:
                            event.target.value ===
                            ""
                              ? ""
                              : Number(
                                  event.target
                                    .value
                                ),
                        }
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Usable Length (m)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      activeSection
                        .usable_length_m
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          usable_length_m:
                            event.target.value ===
                            ""
                              ? ""
                              : Number(
                                  event.target
                                    .value
                                ),
                        }
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Mounting Template">
                  <select
                    value={
                      activeSection.mounting_template_id ??
                      ""
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          mounting_template_id:
                            event.target.value ||
                            null,
                        }
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Select mounting template
                    </option>

                    {mountingTemplates.map(
                      (template) => (
                        <option
                          key={template.id}
                          value={template.id}
                        >
                          {template.name}
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field label="Rail Orientation">
                  <select
                    value={
                      activeSection.rail_orientation
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          rail_orientation:
                            event.target
                              .value as
                              | "horizontal"
                              | "vertical",
                        }
                      )
                    }
                    className="input"
                  >
                    <option value="horizontal">
                      Horizontal
                    </option>

                    <option value="vertical">
                      Vertical
                    </option>
                  </select>
                </Field>

                <Field label="Rails per Panel">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      activeSection.rails_per_panel
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          rails_per_panel:
                            event.target.value ===
                            ""
                              ? ""
                              : Number(
                                  event.target
                                    .value
                                ),
                        }
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Rail Overhang (m)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      activeSection
                        .rail_overhang_m
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          rail_overhang_m:
                            event.target.value ===
                            ""
                              ? ""
                              : Number(
                                  event.target
                                    .value
                                ),
                        }
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Stock Rail Length (m)">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={
                      activeSection
                        .rail_stock_length_m
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          rail_stock_length_m:
                            event.target.value ===
                            ""
                              ? ""
                              : Number(
                                  event.target
                                    .value
                                ),
                        }
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Mounting Spacing (m)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      activeSection
                        .mounting_spacing_m
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          mounting_spacing_m:
                            event.target.value ===
                            ""
                              ? ""
                              : Number(
                                  event.target
                                    .value
                                ),
                        }
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Edge Offset (m)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      activeSection
                        .mounting_edge_offset_m
                    }
                    onChange={(event) =>
                      updateSection(
                        activeSection.id,
                        {
                          mounting_edge_offset_m:
                            event.target.value ===
                            ""
                              ? ""
                              : Number(
                                  event.target
                                    .value
                                ),
                        }
                      )
                    }
                    className="input"
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={activeSection.notes}
                  onChange={(event) =>
                    updateSection(
                      activeSection.id,
                      {
                        notes:
                          event.target.value,
                      }
                    )
                  }
                  rows={3}
                  className="input resize-none"
                />
              </Field>

              {/* PANEL LAYOUT */}

              <div className="rounded-lg border border-zinc-200">
                <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-medium text-zinc-950">
                      Panel Layout
                    </h3>

                    <p className="text-xs text-zinc-500">
                      {builderMode ===
                      "layout"
                        ? "Click empty cells to place panels. Click existing panels to remove them."
                        : "Select panels to assign them to a string."}
                    </p>
                  </div>

                  <div className="flex rounded-md border border-zinc-300 bg-zinc-50 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setBuilderMode(
                          "layout"
                        );
                        setSelectedPanels([]);
                      }}
                      className={`rounded px-3 py-1.5 text-xs font-medium ${
                        builderMode ===
                        "layout"
                          ? "bg-black text-white"
                          : "text-zinc-600"
                      }`}
                    >
                      Layout
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setBuilderMode(
                          "strings"
                        )
                      }
                      className={`rounded px-3 py-1.5 text-xs font-medium ${
                        builderMode ===
                        "strings"
                          ? "bg-black text-white"
                          : "text-zinc-600"
                      }`}
                    >
                      Strings
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto p-5">
                  {/*
                    Rotate the clickable grid axes for portrait layouts as
                    well as changing each panel tile's aspect ratio.
                  */}
                  {(() => {
                    const portraitLayout = activeSection.panel_orientation === "portrait";
                    const displayRows = portraitLayout ? GRID_COLUMNS : GRID_ROWS;
                    const displayColumns = portraitLayout ? GRID_ROWS : GRID_COLUMNS;

                    return (
                      <div
                        className="mx-auto grid min-w-[720px] max-w-5xl gap-1"
                        style={{
                          gridTemplateColumns: `repeat(${displayColumns}, minmax(0, 1fr))`,
                        }}
                      >
                        {Array.from({
                          length: displayRows * displayColumns,
                        }).map((_, index) => {
                          const row = portraitLayout
                            ? (index % displayColumns) + 1
                            : Math.floor(index / displayColumns) + 1;
                          const column = portraitLayout
                            ? Math.floor(index / displayColumns) + 1
                            : (index % displayColumns) + 1;

                      const panel =
                        activeSection.panels.find(
                          (item) =>
                            item.row ===
                              row &&
                            item.column ===
                              column
                        );

                      const selected =
                        panel
                          ? selectedPanels.includes(panel.id)
                          : false;
                      const assignedString = panel?.string_id
                        ? activeSection.strings.find(
                            (string) => string.id === panel.string_id
                          )
                        : undefined;
                      const stringColor = assignedString
                        ? getStringColor(assignedString.string_number)
                        : null;
                      const portrait = activeSection.panel_orientation === "portrait";

                      return (
                        <button
                          type="button"
                          key={`${row}-${column}`}
                          onClick={() => handlePanelClick(row, column)}
                          aria-label={panel
                            ? `Panel ${panel.panel_number}${assignedString ? `, String ${assignedString.string_number}` : ""}`
                            : `Add panel at row ${row}, column ${column}`}
                          className={[
                            "relative rounded-md border-2 text-[10px] transition-shadow",
                            portrait ? "aspect-[1/2]" : "aspect-[2/1]",
                            panel
                              ? [stringColor?.border ?? "border-zinc-400", stringColor?.bg ?? "bg-zinc-100", stringColor?.text ?? "text-zinc-800", "hover:brightness-95"].join(" ")
                              : "border-zinc-200 bg-zinc-50 text-transparent hover:border-zinc-400 hover:bg-zinc-100",
                            selected ? "ring-2 ring-zinc-900 ring-offset-1" : "",
                          ].join(" ")}
                        >
                          {panel && (
                            <div className="flex h-full flex-col items-center justify-center gap-0.5 px-0.5">
                              <span className="font-semibold">P{panel.panel_number}</span>
                              {assignedString && (
                                <span className={["rounded px-1 font-bold", stringColor?.text ?? ""].join(" ")}>
                                  S{assignedString.string_number}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                        );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* STRING ASSIGNMENT */}

              {builderMode === "strings" && (
                <div className="rounded-lg border border-zinc-200">
                  <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-medium text-zinc-950">
                        String / MPPT Design
                      </h3>

                      <p className="text-xs text-zinc-500">
                        Select panels above, then
                        assign them to a string.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addString}
                        className="inline-flex items-center gap-2 rounded-md bg-black px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                      >
                        <Plus size={14} />
                        Add String
                      </button>

                      <button
                        type="button"
                        onClick={
                          clearStringAssignments
                        }
                        className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        <X size={14} />
                        Clear Assignments
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-zinc-200">
                    {activeSection.strings
                      .length === 0 ? (
                      <div className="p-5 text-sm text-zinc-500">
                        No strings created yet.
                      </div>
                    ) : (
                      activeSection.strings.map(
                        (string) => {
                          const count =
                            getStringPanelCount(
                              activeSection,
                              string.id
                            );

                          return (
                            <div
                              key={
                                string.id
                              }
                              className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className={["h-5 w-5 shrink-0 rounded-sm border-2", getStringColor(string.string_number).border, getStringColor(string.string_number).bg].join(" ")}
                                />
                                <div className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 text-sm font-semibold", getStringColor(string.string_number).border, getStringColor(string.string_number).bg, getStringColor(string.string_number).text].join(" ")}>
                                  S{string.string_number}
                                </div>
                              </div>

                              <div className="grid flex-1 gap-4 md:grid-cols-3">
                                <Field label="String Number">
                                  <input
                                    type="number"
                                    min="1"
                                    value={
                                      string.string_number
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateString(
                                        string.id,
                                        {
                                          string_number:
                                            Number(
                                              event
                                                .target
                                                .value
                                            ),
                                        }
                                      )
                                    }
                                    className="input"
                                  />
                                </Field>

                                <Field label="MPPT">
                                  <input
                                    type="number"
                                    min="1"
                                    value={
                                      string.mppt_number
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateString(
                                        string.id,
                                        {
                                          mppt_number:
                                            event
                                              .target
                                              .value ===
                                            ""
                                              ? ""
                                              : Number(
                                                  event
                                                    .target
                                                    .value
                                                ),
                                        }
                                      )
                                    }
                                    className="input"
                                  />
                                </Field>

                                <Field label="Assigned Panels">
                                  <div className="flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm">
                                    {count}
                                  </div>
                                </Field>

                                <Field label="Notes">
                                  <input
                                    value={
                                      string.notes
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateString(
                                        string.id,
                                        {
                                          notes:
                                            event
                                              .target
                                              .value,
                                        }
                                      )
                                    }
                                    className="input"
                                  />
                                </Field>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    selectedPanels.length ===
                                    0
                                  }
                                  onClick={() =>
                                    assignSelectedPanelsToString(
                                      string.id
                                    )
                                  }
                                  className="inline-flex items-center gap-2 rounded-md bg-black px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Link2
                                    size={14}
                                  />
                                  Assign
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteString(
                                      string.id
                                    )
                                  }
                                  className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
                                >
                                  <Trash2
                                    size={15}
                                  />
                                </button>
                              </div>
                            </div>
                          );
                        }
                      )
                    )}
                  </div>
                </div>
              )}

              {/* GEOMETRY */}

              <div className="rounded-lg border border-zinc-200">
                <div className="border-b border-zinc-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Ruler size={17} />

                    <h3 className="font-medium text-zinc-950">
                      Material Geometry
                    </h3>
                  </div>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <GeometryCard
                    label="Occupied Rows"
                    value={
                      calculateGeometry(
                        activeSection
                      ).occupiedRows
                    }
                  />

                  <GeometryCard
                    label="Occupied Columns"
                    value={
                      calculateGeometry(
                        activeSection
                      ).occupiedColumns
                    }
                  />

                  <GeometryCard
                    label="Rails"
                    value={
                      calculateGeometry(
                        activeSection
                      ).railCount
                    }
                  />

                  <GeometryCard
                    label="Rail Run Length"
                    value={`${calculateGeometry(
                      activeSection
                    ).railLength.toFixed(2)} m`}
                  />

                  <GeometryCard
                    label="Total Rail"
                    value={`${calculateGeometry(
                      activeSection
                    ).totalRailLength.toFixed(2)} m`}
                  />

                  <GeometryCard
                    label="Stock Rails"
                    value={
                      calculateGeometry(
                        activeSection
                      ).stockRailCount
                    }
                  />

                  <GeometryCard
                    label="Rail Joiners"
                    value={
                      calculateGeometry(
                        activeSection
                      ).joinerCount
                    }
                  />

                  <GeometryCard
                    label="Mounting Points"
                    value={
                      calculateGeometry(
                        activeSection
                      ).mountingPointCount
                    }
                  />
                </div>
              </div>

              {/* REMOVE SECTION */}

              {roofSections.length > 1 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      removeRoofSection(
                        activeSection.id
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                    Remove Roof Section
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* OVERALL GEOMETRY */}

        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Ruler size={18} />

              <h2 className="font-semibold text-zinc-950">
                Overall Material Geometry
              </h2>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Total Rails"
              value={totalRails}
              icon={<Ruler size={18} />}
            />

            <SummaryCard
              label="Stock Rails"
              value={totalStockRails}
              icon={<Ruler size={18} />}
            />

            <SummaryCard
              label="Rail Joiners"
              value={totalJoiners}
              icon={<Link2 size={18} />}
            />

            <SummaryCard
              label="Total Rail Length"
              value={`${totalRailLength.toFixed(
                2
              )} m`}
              icon={<Ruler size={18} />}
            />

            <SummaryCard
              label="Mounting Points"
              value={totalMountingPoints}
              icon={<Hammer size={18} />}
            />
          </div>
        </section>

        {/* CALCULATED BOM */}

        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Hammer size={18} />

                <h2 className="font-semibold text-zinc-950">
                  Calculated BOM
                </h2>
              </div>

              <p className="mt-1 text-sm text-zinc-500">
                Material quantities are calculated
                automatically from the current panel
                layout, rail geometry, strings and
                mounting templates.
              </p>
            </div>

            {loadingBom && (
              <span className="text-xs text-zinc-500">
                Loading BOM templates...
              </span>
            )}
          </div>

          {calculatedBom.length === 0 ? (
            <div className="p-8 text-center">
              <Hammer
                size={28}
                className="mx-auto mb-3 text-zinc-300"
              />

              <p className="text-sm font-medium text-zinc-700">
                No calculated BOM yet
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Add panels and select a mounting
                template for a roof section.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">
                      Component
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Description
                    </th>

                    <th className="px-5 py-3 text-right font-medium">
                      Quantity
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Unit
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Calculation
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200">
                  {calculatedBom.map(
                    (item, index) => (
                      <tr
                        key={`${item.source_template_item_id}-${index}`}
                        className="hover:bg-zinc-50"
                      >
                        <td className="px-5 py-4 font-medium text-zinc-900">
                          {item.component_name}
                        </td>

                        <td className="px-5 py-4 text-zinc-500">
                          {item.description ||
                            "—"}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-zinc-900">
                          {formatQuantity(
                            item.quantity
                          )}
                        </td>

                        <td className="px-5 py-4 text-zinc-500">
                          {item.unit || "—"}
                        </td>

                        <td className="px-5 py-4 text-xs text-zinc-500">
                          {formatCalculation(
                            item
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SECTION BOM BREAKDOWN */}

          {calculatedSectionBoms.length >
            0 && (
            <div className="border-t border-zinc-200">
              <div className="px-5 py-4">
                <h3 className="text-sm font-semibold text-zinc-900">
                  BOM by Roof Section
                </h3>
              </div>

              <div className="grid gap-3 px-5 pb-5 lg:grid-cols-2">
                {calculatedSectionBoms.map(
                  (sectionBom) => {
                    const template =
                      mountingTemplates.find(
                        (item) =>
                          item.id ===
                          sectionBom.templateId
                      );

                    return (
                      <div
                        key={
                          sectionBom.sectionId
                        }
                        className="rounded-md border border-zinc-200 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-zinc-900">
                              {
                                sectionBom.sectionName
                              }
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {template?.name ||
                                "Mounting template"}
                            </p>
                          </div>

                          <span className="text-xs text-zinc-500">
                            {
                              sectionBom.items
                                .length
                            } items
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {sectionBom.items.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={`${item.source_template_item_id}-${index}`}
                                className="flex items-center justify-between gap-4 text-sm"
                              >
                                <span className="text-zinc-700">
                                  {
                                    item.component_name
                                  }
                                </span>

                                <span className="font-medium text-zinc-900">
                                  {formatQuantity(
                                    item.quantity
                                  )}{" "}
                                  {item.unit ||
                                    ""}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </section>

        {/* SAVE FOOTER */}

        <div className="flex justify-end border-t border-zinc-200 pt-6">
          <button
            type="button"
            onClick={saveDesign}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />

            {saving
              ? "Saving Design..."
              : "Save Design"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          height: 40px;
          border-radius: 6px;
          border: 1px solid rgb(212 212 216);
          background: white;
          padding: 0 12px;
          font-size: 14px;
          color: rgb(24 24 27);
          outline: none;
        }

        .input:focus {
          border-color: rgb(39 39 42);
          box-shadow: 0 0 0 1px rgb(39 39 42);
        }

        textarea.input {
          height: auto;
          padding-top: 10px;
          padding-bottom: 10px;
        }
      `}</style>
    </div>
  );
}

/*
 * ----------------------------------------------------------------------------
 * SMALL UI COMPONENTS
 * ----------------------------------------------------------------------------
 */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-600">
        {label}
      </label>

      {children}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </span>

        <span className="text-zinc-400">
          {icon}
        </span>
      </div>

      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
        {value}
      </div>
    </div>
  );
}

function GeometryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function formatQuantity(
  quantity: number
) {
  if (Number.isInteger(quantity)) {
    return quantity.toString();
  }

  return quantity
    .toFixed(3)
    .replace(/\.?0+$/, "");
}

function formatCalculation(
  item: CalculatedBomItem
) {
  const basis = formatQuantity(
    item.calculation_basis
  );

  const multiplier = formatQuantity(
    item.calculation_multiplier
  );

  switch (
    item.calculation_method
  ) {
    case "manual":
      return `Manual: ${basis}`;

    case "fixed":
      return `Fixed: ${basis} × ${multiplier}`;

    case "per_panel":
      return `${basis} panels × ${multiplier}`;

    case "per_mounting_point":
      return `${basis} mounting points × ${multiplier}`;

    case "per_rail":
      return `${basis} rails × ${multiplier}`;

    case "per_rail_length":
      return `${basis} m rail × ${multiplier}`;

    case "per_string":
      return `${basis} strings × ${multiplier}`;

    case "per_array":
      return `${basis} arrays × ${multiplier}`;

    default:
      return "Calculated";
  }
}