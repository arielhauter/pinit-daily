const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
};

type AirtableListResponse = {
  records: AirtableRecord[];
  offset?: string;
};

async function airtableFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const res = await fetch(`${BASE_URL}/${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable API error ${res.status}: ${body}`);
  }
  return res;
}

export async function selectRecords(
  table: string,
  params: {
    filterByFormula?: string;
    fields?: string[];
    sort?: { field: string; direction: "asc" | "desc" }[];
    maxRecords?: number;
  } = {}
): Promise<AirtableRecord[]> {
  const formulaPart = params.filterByFormula
    ? `filterByFormula=${encodeURIComponent(params.filterByFormula)}`
    : "";

  const otherParams = new URLSearchParams();
  if (params.fields) {
    params.fields.forEach((f) => otherParams.append("fields[]", f));
  }
  if (params.sort) {
    params.sort.forEach((s, i) => {
      otherParams.set(`sort[${i}][field]`, s.field);
      otherParams.set(`sort[${i}][direction]`, s.direction);
    });
  }
  if (params.maxRecords) {
    otherParams.set("maxRecords", String(params.maxRecords));
  }

  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    if (offset) otherParams.set("offset", offset);
    const parts: string[] = [];
    if (formulaPart) parts.push(formulaPart);
    const otherStr = otherParams.toString();
    if (otherStr) parts.push(otherStr);
    const queryString = parts.join("&");
    const res = await airtableFetch(`${encodeURIComponent(table)}?${queryString}`);
    const data: AirtableListResponse = await res.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

export async function updateRecord(
  table: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  const res = await airtableFetch(
    `${encodeURIComponent(table)}/${recordId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    }
  );
  return res.json();
}

export async function createRecord(
  table: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  const res = await airtableFetch(encodeURIComponent(table), {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  return res.json();
}

export async function getRecord(
  table: string,
  recordId: string
): Promise<AirtableRecord> {
  const res = await airtableFetch(
    `${encodeURIComponent(table)}/${recordId}`
  );
  return res.json();
}

export async function createRecords(
  table: string,
  records: Record<string, unknown>[]
): Promise<AirtableRecord[]> {
  const batches: AirtableRecord[] = [];
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const res = await airtableFetch(encodeURIComponent(table), {
      method: "POST",
      body: JSON.stringify({
        records: batch.map((fields) => ({ fields })),
      }),
    });
    const data = await res.json();
    batches.push(...data.records);
  }
  return batches;
}
