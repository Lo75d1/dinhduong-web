import { Prisma } from "@/generated/prisma/client";
import type { DailyFilters } from "./daily-catalog";

/** A day is the selection unit. Source weeks and review revisions stay intact.
 * Filter in PostgreSQL BEFORE paging. Only small day/group/meal labels leave the server.
 * User strings are bound parameters, including the literal substring search.
 */
export function dailyCatalogQuery(f: DailyFilters, offset: number) {
  return Prisma.sql`
    WITH classified AS (
      SELECT t.*, COALESCE(t.document->>'librarySection', CASE WHEN t.document->'unit'->>'type' = 'hospital'
        OR left(t.id, 17) = 'hospital-patient-' THEN 'hospital' ELSE t.direction END) AS section,
        COALESCE(t.document->'availability'->>'state', 'active') AS availability
      FROM menu_library_templates t
    ), days AS (
      SELECT t.id, t.title, t.direction, t.revision, t."updatedAt", t.section, t.availability,
        CASE WHEN t.section = 'hospital' THEN COALESCE(t.document->>'hospitalUse',
          CASE WHEN t.direction = 'individual' THEN 'patient_guidance' ELSE 'hospital_kitchen' END) END AS "hospitalUse",
        d.day->>'id' AS "dayId", (d.day->>'dayIndex')::int AS "dayIndex", d.day->>'date' AS date,
        jsonb_array_length(t.document->'days') AS "dayCount", t.document->>'coverage' AS coverage,
        t.document->'unit'->>'label' AS "unitLabel", t.document->'unit'->>'type' AS "unitType",
        t.document->>'eatingContext' AS "eatingContext", COALESCE(r.decision, 'draft') AS "reviewState",
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', g->>'id', 'label', g->>'label',
          'energy', g->'designEnergyKcal', 'diet', g->>'dietCode', 'code', c.code, 'dietName', c.name, 'lifeStage', g->>'lifeStage'))
          FROM jsonb_array_elements(t.document->'groups') g
          LEFT JOIN diet_codes c ON c.id = g->>'dietCode'
          WHERE (${f.energy} = '' OR (g->>'designEnergyKcal')::numeric = ${Number(f.energy || 0)})
            AND (${f.diet} = '' OR g->>'dietCode' = ${f.diet})
            AND (${f.lifeStage} = '' OR g->>'lifeStage' = ${f.lifeStage}
              OR (${f.lifeStage} = 'unclassified' AND g->>'lifeStage' IS NULL))), '[]'::jsonb) AS groups,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m->>'id', 'code', m->>'code', 'label', m->>'label',
          'dishes', COALESCE((SELECT jsonb_agg(names.label ORDER BY names.label) FROM (
            SELECT DISTINCT dish->>'label' AS label FROM jsonb_array_elements(m->'groupPortions') p
            CROSS JOIN LATERAL jsonb_array_elements(p->'dishes') dish
            WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(t.document->'groups') g
              WHERE g->>'id' = p->>'groupId' AND (${f.energy} = '' OR (g->>'designEnergyKcal')::numeric = ${Number(f.energy || 0)})
                AND (${f.diet} = '' OR g->>'dietCode' = ${f.diet})
            AND (${f.lifeStage} = '' OR g->>'lifeStage' = ${f.lifeStage}
              OR (${f.lifeStage} = 'unclassified' AND g->>'lifeStage' IS NULL)))
          ) names), '[]'::jsonb))) FROM jsonb_array_elements(d.day->'meals') m), '[]'::jsonb) AS meals
      FROM classified t
      CROSS JOIN LATERAL jsonb_array_elements(t.document->'days') WITH ORDINALITY d(day, n)
      LEFT JOIN LATERAL (SELECT decision FROM menu_library_reviews
        WHERE "templateId" = t.id AND revision = t.revision ORDER BY "createdAt" DESC, id DESC LIMIT 1) r ON true
      WHERE (${f.direction} = '' OR t.direction = ${f.direction})
        AND (${f.section} = '' OR t.section = ${f.section})
        AND (${f.availability} = 'all' OR t.availability = ${f.availability})
        AND (${f.hospitalUse} = '' OR t.section = 'hospital' AND COALESCE(t.document->>'hospitalUse',
          CASE WHEN t.direction = 'individual' THEN 'patient_guidance' ELSE 'hospital_kitchen' END) = ${f.hospitalUse})
        AND (${f.eatingContext} = '' OR t.document->>'eatingContext' = ${f.eatingContext})
        AND (${f.unitType} = '' OR t.document->'unit'->>'type' = ${f.unitType})
    ), filtered AS (
      SELECT * FROM days WHERE jsonb_array_length(groups) > 0
        AND (${f.review} = '' OR "reviewState" = ${f.review})
        AND (${f.meal} = '' OR EXISTS (SELECT 1 FROM jsonb_array_elements(meals) m WHERE m->>'code' = ${f.meal}))
        AND (${f.q} = '' OR position(lower(${f.q}) in lower(concat_ws(' ', title, "unitLabel", groups::text, meals::text))) > 0)
    )
    SELECT (SELECT count(*)::int FROM filtered) AS total,
      COALESCE((SELECT jsonb_agg(page) FROM (SELECT * FROM filtered
        ORDER BY "updatedAt" DESC, id ASC, "dayIndex" ASC, "dayId" ASC LIMIT 25 OFFSET ${offset}) page), '[]'::jsonb) AS items,
      COALESCE((SELECT jsonb_agg(v ORDER BY v.code, v.name) FROM (SELECT DISTINCT c.id, c.code, c.name
        FROM menu_library_templates t CROSS JOIN LATERAL jsonb_array_elements(t.document->'groups') g
        JOIN diet_codes c ON c.id = g->>'dietCode') v), '[]'::jsonb) AS diets,
      COALESCE((SELECT jsonb_agg(v.energy ORDER BY v.energy) FROM (SELECT DISTINCT (g->>'designEnergyKcal')::numeric AS energy
        FROM menu_library_templates t CROSS JOIN LATERAL jsonb_array_elements(t.document->'groups') g
        WHERE jsonb_typeof(g->'designEnergyKcal') = 'number') v), '[]'::jsonb) AS energies
  `;
}
