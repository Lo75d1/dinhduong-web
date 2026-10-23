import { Prisma } from "@/generated/prisma/client";
import type { ManagerFilters } from "./manager-contracts";

/** One row per stored menu. Dates and meals are metadata, never inflated catalog entries. */
export function managerCatalogQuery(f: ManagerFilters, offset: number) {
  return Prisma.sql`
    WITH classified AS (
      SELECT t.*, COALESCE(document->>'librarySection', CASE WHEN document->'unit'->>'type' = 'hospital'
        OR left(t.id,17) = 'hospital-patient-' THEN 'hospital' ELSE direction END) AS section,
        COALESCE(document->'availability'->>'state','active') AS availability
      FROM menu_library_templates t
    ), menus AS (
      SELECT t.id, t.title, t.revision, t."updatedAt", t.section, t.availability,
        CASE WHEN t.section = 'hospital' THEN COALESCE(t.document->>'hospitalUse',
          CASE WHEN t.direction = 'individual' THEN 'patient_guidance' ELSE 'hospital_kitchen' END) END AS "hospitalUse",
        t.document->>'description' AS description, COALESCE(t.document->'tags','[]'::jsonb) AS tags,
        t.document->'unit'->>'label' AS "unitLabel", t.document->>'eatingContext' AS "eatingContext",
        COALESCE(r.decision,'draft') AS "reviewState",
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id',g->>'id','label',g->>'label',
          'lifeStage',g->>'lifeStage','ageYears',g->'ageYears','ageMonths',g->'ageMonths',
          'designEnergyKcal',g->'designEnergyKcal','dietCode',g->>'dietCode'))
          FROM jsonb_array_elements(t.document->'groups') g),'[]'::jsonb) AS groups,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id',d->>'id','dayIndex',(d->>'dayIndex')::int,
          'date',d->>'date','mealCount',jsonb_array_length(d->'meals'),'mealLabels',
          COALESCE((SELECT jsonb_agg(m->>'label') FROM jsonb_array_elements(d->'meals') m),'[]'::jsonb)) ORDER BY (d->>'dayIndex')::int)
          FROM jsonb_array_elements(t.document->'days') d),'[]'::jsonb) AS days,
        concat_ws(' ',t.title,t.document->>'description',t.document->'tags'::text,t.document->'groups'::text,
          t.document->'unit'->>'label',
          (SELECT string_agg(dish->>'label',' ') FROM jsonb_array_elements(t.document->'days') d
            CROSS JOIN LATERAL jsonb_array_elements(d->'meals') m
            CROSS JOIN LATERAL jsonb_array_elements(m->'groupPortions') p
            CROSS JOIN LATERAL jsonb_array_elements(p->'dishes') dish)) AS searchable
      FROM classified t LEFT JOIN LATERAL (SELECT decision FROM menu_library_reviews WHERE "templateId"=t.id
        AND revision=t.revision ORDER BY "createdAt" DESC,id DESC LIMIT 1) r ON true
    ), filtered AS (
      SELECT * FROM menus WHERE (${f.section}='' OR section=${f.section})
        AND (${f.hospitalUse}='' OR "hospitalUse"=${f.hospitalUse})
        AND availability=${f.availability}
        AND (${f.q}='' OR position(lower(${f.q}) IN lower(searchable))>0)
    ) SELECT (SELECT count(*)::int FROM filtered) AS total,
      COALESCE((SELECT jsonb_agg(page) FROM (SELECT id,title,revision,"updatedAt",section,availability,"hospitalUse",
        description,tags,"unitLabel","eatingContext","reviewState",groups,days FROM filtered
        ORDER BY "updatedAt" DESC,id ASC LIMIT 24 OFFSET ${offset}) page),'[]'::jsonb) AS items
  `;
}
