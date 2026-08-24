const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};

// Official Jamiatul Ulama Cape Town perpetual CSV export
const JAMIAT_CSV_URL =
  "https://salaahtimes.starlite.za.net/jamiat/perpetual/export-csv.php?id=a8e12c9f28bf220e8243849cd2231fd9fb427566";

const CACHE_KEY = "jamiat_cape_town_timetable";
const CACHE_TIME_KEY = "jamiat_cape_town_timetable_updated";

// Refresh the source periodically rather than every visitor request.
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function clean(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function normalizeHeader(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
    .replace(/['’]/g, "");
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        i++;
      }

      row.push(value);
      value = "";

      if (row.some(cell => clean(cell) !== "")) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  if (value !== "" || row.length) {
    row.push(value);

    if (row.some(cell => clean(cell) !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function findColumn(headers, candidates) {
  const normalizedHeaders = headers.map(normalizeHeader);

  // Exact match first.
  for (const candidate of candidates) {
    const wanted = normalizeHeader(candidate);
    const index = normalizedHeaders.indexOf(wanted);

    if (index !== -1) {
      return index;
    }
  }

  // Then partial match.
  for (const candidate of candidates) {
    const wanted = normalizeHeader(candidate);

    const index = normalizedHeaders.findIndex(header =>
      header.includes(wanted)
    );

    if (index !== -1) {
      return index;
    }
  }

  return -1;
}

function convertRowsToTimetable(rows) {
  if (!rows.length) {
    throw new Error("Jamiat CSV contains no rows.");
  }

  const headers = rows[0];

  const dateIndex = findColumn(headers, [
    "Date",
    "Day"
  ]);

  const fajrIndex = findColumn(headers, [
    "Fajr"
  ]);

  const sunriseIndex = findColumn(headers, [
    "Sunrise",
    "Sunrise Starts"
  ]);

  const ishraaqIndex = findColumn(headers, [
    "Ishraaq"
  ]);

  const zuhrIndex = findColumn(headers, [
    "Zuhr",
    "Zuhr Starts",
    "Dhuhr"
  ]);

  // IMPORTANT:
  // Prefer Shafi'i Asr specifically.
  const asrIndex = findColumn(headers, [
    "Asr (S)",
    "Asr S"
  ]);

  const maghribIndex = findColumn(headers, [
    "Maghrib"
  ]);

  // IMPORTANT:
  // Prefer Shafi'i Isha specifically.
  const ishaIndex = findColumn(headers, [
    "Isha (S)",
    "Isha S"
  ]);

  const requiredColumns = {
    dateIndex,
    fajrIndex,
    sunriseIndex,
    ishraaqIndex,
    zuhrIndex,
    asrIndex,
    maghribIndex,
    ishaIndex
  };

  for (const [name, index] of Object.entries(requiredColumns)) {
    if (index === -1) {
      throw new Error(`Required Jamiat CSV column missing: ${name}`);
    }
  }

  const timetable = {};

  for (const row of rows.slice(1)) {
    const date = clean(row[dateIndex]);

    if (!date) {
      continue;
    }

    const normalizedDate = date
      .replace(/\s+/g, " ")
      .trim();

    timetable[normalizedDate] = {
      date: normalizedDate,
      fajr: clean(row[fajrIndex]),
      sunrise: clean(row[sunriseIndex]),
      ishraaq: clean(row[ishraaqIndex]),
      zuhr: clean(row[zuhrIndex]),
      asr: clean(row[asrIndex]),
      maghrib: clean(row[maghribIndex]),
      isha: clean(row[ishaIndex])
    };
  }

  if (!Object.keys(timetable).length) {
    throw new Error("No usable Jamiat timetable rows were found.");
  }

  return timetable;
}

async function fetchJamiatTimetable() {
  const response = await fetch(JAMIAT_CSV_URL, {
    method: "GET",
    headers: {
      "Accept": "text/csv,text/plain,*/*"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Jamiat CSV request failed with HTTP ${response.status}.`
    );
  }

  const csv = await response.text();

  if (!csv.trim()) {
    throw new Error("Jamiat returned an empty CSV.");
  }

  return convertRowsToTimetable(parseCSV(csv));
}

async function getCachedTimetable(kv) {
  if (!kv) {
    return null;
  }

  try {
    return await kv.get(CACHE_KEY, "json");
  } catch {
    return null;
  }
}

async function getCacheTimestamp(kv) {
  if (!kv) {
    return null;
  }

  try {
    return await kv.get(CACHE_TIME_KEY);
  } catch {
    return null;
  }
}

async function saveCachedTimetable(kv, timetable) {
  if (!kv) {
    return;
  }

  await kv.put(
    CACHE_KEY,
    JSON.stringify(timetable)
  );

  await kv.put(
    CACHE_TIME_KEY,
    new Date().toISOString()
  );
}

function getCapeTownTodayKey() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "short"
  }).formatToParts(now);

  const day = parts.find(part => part.type === "day")?.value;
  const month = parts.find(part => part.type === "month")?.value;

  if (!day || !month) {
    throw new Error("Unable to determine Cape Town date.");
  }

  return `${day} ${month}`;
}

function cacheNeedsRefresh(timestamp) {
  if (!timestamp) {
    return true;
  }

  const savedAt = Date.parse(timestamp);

  if (Number.isNaN(savedAt)) {
    return true;
  }

  return (
    Date.now() - savedAt >= REFRESH_INTERVAL_MS
  );
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function onRequestGet(context) {
  const kv = context.env.MASJID_KV;

  try {
    if (!kv) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "MASJID_KV binding is not configured."
        }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }

    let timetable = await getCachedTimetable(kv);
    const cachedAt = await getCacheTimestamp(kv);

    /*
     * Refresh once every 24 hours.
     *
     * If the Jamiat source is temporarily unavailable,
     * continue using the last successful KV timetable.
     */
    if (!timetable || cacheNeedsRefresh(cachedAt)) {
      try {
        const freshTimetable = await fetchJamiatTimetable();

        await saveCachedTimetable(
          kv,
          freshTimetable
        );

        timetable = freshTimetable;
      } catch (refreshError) {
        // If an old timetable exists, keep using it.
        if (!timetable) {
          throw refreshError;
        }

        console.warn(
          "Jamiat refresh failed; using cached timetable:",
          refreshError.message
        );
      }
    }

    const today = getCapeTownTodayKey();
    const todayTimes = timetable[today];

    if (!todayTimes) {
      throw new Error(
        `No Jamiat timetable entry found for ${today}.`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: "Jamiatul Ulama South Africa",
        location: "Cape Town",
        timezone: "Africa/Johannesburg",
        madhab: "Shafi'i",
        date: today,
        times: todayTimes,
        cachedAt: await getCacheTimestamp(kv)
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
  }
