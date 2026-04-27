const json = (d, s = 200) => new Response(JSON.stringify(d), {
  status: s,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*"
  }
});

// ─── DB INIT ─────────────────────────────────────────────────────────────────
async function initDB(env) {
  const db = env.D1;
  if (!db) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        date TEXT,
        year_level TEXT,
        duration_mins INTEGER,
        focus TEXT,
        equipment TEXT,
        plan TEXT,
        created_by TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS carnivals (
        id TEXT PRIMARY KEY,
        name TEXT,
        date TEXT,
        location TEXT,
        type TEXT,
        year_levels TEXT,
        status TEXT,
        info TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        carnival_id TEXT,
        name TEXT,
        year_level TEXT,
        sport TEXT,
        coach TEXT,
        members TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS registrations (
        id TEXT PRIMARY KEY,
        carnival_id TEXT,
        student_id TEXT,
        student_name TEXT,
        year_level TEXT,
        team_id TEXT,
        status TEXT,
        registered_at TEXT
      );
      CREATE TABLE IF NOT EXISTS results (
        id TEXT PRIMARY KEY,
        carnival_id TEXT,
        team_id TEXT,
        sport TEXT,
        result TEXT,
        placement TEXT,
        created_at TEXT
      );
    `);
  } catch (e) {
    console.log("Tables may already exist:", e.message);
  }
}

// ─── LESSONS ─────────────────────────────────────────────────────────────────
async function createLesson(env, date, yearLevel, duration, focus, equipment, plan, createdBy) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound" };
  try {
    const lessonId = "lesson_" + Date.now();
    await db.prepare(`
      INSERT INTO lessons (id, date, year_level, duration_mins, focus, equipment, plan, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(lessonId, date, yearLevel, duration, focus, equipment, plan, createdBy, new Date().toISOString()).run();
    return { ok: true, id: lessonId };
  } catch (e) {
    return { error: e.message };
  }
}

async function getLessonsThisWeek(env) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound", lessons: [] };
  try {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000);
    const startStr = startOfWeek.toISOString().split("T")[0];
    const endStr = endOfWeek.toISOString().split("T")[0];
    const result = await db.prepare(`
      SELECT * FROM lessons WHERE date >= ? AND date < ? ORDER BY date ASC
    `).bind(startStr, endStr).all();
    return { lessons: result.results || [] };
  } catch (e) {
    return { error: e.message, lessons: [] };
  }
}

async function getAllLessons(env) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound", lessons: [] };
  try {
    const result = await db.prepare("SELECT * FROM lessons ORDER BY date DESC").all();
    return { lessons: result.results || [] };
  } catch (e) {
    return { error: e.message, lessons: [] };
  }
}

// ─── CARNIVALS ────────────────────────────────────────────────────────────────
async function getCarnivals(env, upcoming = true) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound", carnivals: [] };
  try {
    const today = new Date().toISOString().split("T")[0];
    const query = upcoming
      ? "SELECT * FROM carnivals WHERE date >= ? AND status != ? ORDER BY date ASC"
      : "SELECT * FROM carnivals ORDER BY date DESC";
    const result = upcoming
      ? await db.prepare(query).bind(today, "cancelled").all()
      : await db.prepare(query).all();
    return { carnivals: result.results || [] };
  } catch (e) {
    return { error: e.message, carnivals: [] };
  }
}

async function createCarnival(env, name, date, location, type, yearLevels, info) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound" };
  try {
    const carnivalId = "carnival_" + Date.now();
    await db.prepare(`
      INSERT INTO carnivals (id, name, date, location, type, year_levels, status, info, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(carnivalId, name, date, location, type, yearLevels, "upcoming", info, new Date().toISOString()).run();
    return { ok: true, id: carnivalId };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── TEAMS ────────────────────────────────────────────────────────────────────
async function createTeam(env, carnivalId, name, yearLevel, sport, coach) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound" };
  try {
    const teamId = "team_" + Date.now();
    await db.prepare(`
      INSERT INTO teams (id, carnival_id, name, year_level, sport, coach, members, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(teamId, carnivalId, name, yearLevel, sport, coach, "[]", new Date().toISOString()).run();
    return { ok: true, id: teamId };
  } catch (e) {
    return { error: e.message };
  }
}

async function getTeams(env, carnivalId) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound", teams: [] };
  try {
    const result = await db.prepare(
      "SELECT * FROM teams WHERE carnival_id = ? ORDER BY year_level ASC"
    ).bind(carnivalId).all();
    return { teams: result.results || [] };
  } catch (e) {
    return { error: e.message, teams: [] };
  }
}

// ─── REGISTRATIONS ────────────────────────────────────────────────────────────
async function registerStudent(env, carnivalId, studentId, studentName, yearLevel, teamId) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound" };
  try {
    const regId = "reg_" + Date.now();
    await db.prepare(`
      INSERT INTO registrations (id, carnival_id, student_id, student_name, year_level, team_id, status, registered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(regId, carnivalId, studentId, studentName, yearLevel, teamId, "registered", new Date().toISOString()).run();
    const team = await db.prepare("SELECT * FROM teams WHERE id = ?").bind(teamId).first();
    if (team) {
      const members = JSON.parse(team.members || "[]");
      members.push({ studentId, studentName, yearLevel });
      await db.prepare("UPDATE teams SET members = ? WHERE id = ?").bind(JSON.stringify(members), teamId).run();
    }
    return { ok: true, id: regId };
  } catch (e) {
    return { error: e.message };
  }
}

async function getRegistrations(env, carnivalId) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound", registrations: [] };
  try {
    const result = await db.prepare(
      "SELECT * FROM registrations WHERE carnival_id = ? ORDER BY student_name ASC"
    ).bind(carnivalId).all();
    return { registrations: result.results || [] };
  } catch (e) {
    return { error: e.message, registrations: [] };
  }
}

// ─── RESULTS ─────────────────────────────────────────────────────────────────
async function submitResult(env, carnivalId, teamId, sport, result, placement) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound" };
  try {
    const resultId = "result_" + Date.now();
    await db.prepare(`
      INSERT INTO results (id, carnival_id, team_id, sport, result, placement, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(resultId, carnivalId, teamId, sport, result, placement, new Date().toISOString()).run();
    return { ok: true, id: resultId };
  } catch (e) {
    return { error: e.message };
  }
}

async function getResults(env, carnivalId) {
  const db = env.D1;
  if (!db) return { error: "D1 not bound", results: [] };
  try {
    const result = await db.prepare(
      "SELECT * FROM results WHERE carnival_id = ? ORDER BY sport ASC"
    ).bind(carnivalId).all();
    return { results: result.results || [] };
  } catch (e) {
    return { error: e.message, results: [] };
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Allow-Headers": "*"
        }
      });
    }

    await initDB(env);

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    let body = {};
    if (method === "POST" || method === "PATCH") {
      try { body = await request.json(); } catch {}
    }

    // ── LESSONS ──
    if (path === "/lessons" && method === "GET") {
      const all = url.searchParams.get("all");
      if (all === "true") return json(await getAllLessons(env));
      return json(await getLessonsThisWeek(env));
    }

    if (path === "/lessons" && method === "POST") {
      const { date, year_level, duration_mins, focus, equipment, plan, created_by } = body;
      return json(await createLesson(env, date, year_level, duration_mins, focus, equipment, plan, created_by));
    }

    // ── CARNIVALS ──
    if (path === "/carnivals" && method === "GET") {
      const all = url.searchParams.get("all");
      return json(await getCarnivals(env, all !== "true"));
    }

    if (path === "/carnivals" && method === "POST") {
      const { name, date, location, type, year_levels, info } = body;
      return json(await createCarnival(env, name, date, location, type, year_levels, info));
    }

    // ── TEAMS ──
    if (path === "/teams" && method === "GET") {
      const carnivalId = url.searchParams.get("carnival_id");
      return json(await getTeams(env, carnivalId));
    }

    if (path === "/teams" && method === "POST") {
      const { carnival_id, name, year_level, sport, coach } = body;
      return json(await createTeam(env, carnival_id, name, year_level, sport, coach));
    }

    // ── REGISTRATIONS ──
    if (path === "/registrations" && method === "GET") {
      const carnivalId = url.searchParams.get("carnival_id");
      return json(await getRegistrations(env, carnivalId));
    }

    if (path === "/registrations" && method === "POST") {
      const { carnival_id, student_id, student_name, year_level, team_id } = body;
      return json(await registerStudent(env, carnival_id, student_id, student_name, year_level, team_id));
    }

    // ── RESULTS ──
    if (path === "/results" && method === "GET") {
      const carnivalId = url.searchParams.get("carnival_id");
      return json(await getResults(env, carnivalId));
    }

    if (path === "/results" && method === "POST") {
      const { carnival_id, team_id, sport, result, placement } = body;
      return json(await submitResult(env, carnival_id, team_id, sport, result, placement));
    }

    // ── HEALTH ──
    if (path === "/health" || path === "/") {
      return json({ ok: true, worker: "school-manager", version: "1.0.0" });
    }

    return json({ error: "Not found" }, 404);
  }
};