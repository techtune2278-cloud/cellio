import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { alertFor, defaultExpiry } from "../app/lib/alerts";
import { Equipment, Item } from "../app/lib/types";
const u = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const f = "33333333-3333-4333-8333-333333333333",
  g = "44444444-4444-4444-8444-444444444444",
  h = "55555555-5555-4555-8555-555555555555";
test("V1.1: batch transfer is atomic, idempotent, versioned and undoable; deletion protects stock and routing", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("tests/baseline.sql", "utf8"));
    await db.exec(await readFile("migrations/001_cellio_v1_1.sql", "utf8"));
    await db.exec(await readFile("migrations/004_cellio_v1_2.sql", "utf8"));
    await db.exec(await readFile("migrations/001_cellio_v1_1.sql", "utf8"));
    await db.exec(await readFile("migrations/004_cellio_v1_2.sql", "utf8"));
    await db.exec(await readFile("migrations/001_cellio_v1_1.sql", "utf8"));
    await db.exec(await readFile("migrations/004_cellio_v1_2.sql", "utf8"));
    await db.query(
      "INSERT INTO app_users(id,username,password) VALUES($1,'KH','test'),($2,'Other','test')",
      [u, other],
    );
    await db.query(
      "INSERT INTO cellars(id,user_id,name,is_secondary) VALUES($1,$4,'A',false),($2,$4,'B',true),($3,$5,'Other',true)",
      [f, g, h, u, other],
    );
    async function action(
      action: string,
      item: string | null,
      payload: unknown,
      op = randomUUID(),
    ) {
      return (
        await db.query<{ result: Item }>(
          "SELECT cellio_stock_action($1,$2,$3,$4,$5::jsonb) result",
          [u, op, action, item, JSON.stringify(payload)],
        )
      ).rows[0].result;
    }
    const a = await action("add", null, {
      produit: "A",
      categorie: "Légumes",
      qte: 2,
      unite: "kg",
      cellar_id: f,
      date_entree: "2026-10-01",
      date_peremption: "2026-10-20",
      date_kind: "estimated",
      notes: "conserver",
    });
    const b = await action("add", null, {
      produit: "B",
      categorie: "Légumes",
      qte: 3,
      unite: "kg",
      cellar_id: f,
    });
    assert.equal(a.date_kind, "estimated");
    const lots = [
      { id: a.id, amount: 0.5, version: a.version },
      { id: b.id, amount: 3, version: b.version },
    ];
    async function batch(target: string, list: unknown, op = randomUUID()) {
      return db.query("SELECT cellio_transfer_batch($1,$2,$3,$4,$5::jsonb)", [
        u,
        op,
        f,
        target,
        JSON.stringify(list),
      ]);
    }
    await assert.rejects(batch(h, lots), /Destination/);
    await assert.rejects(batch(g, [lots[0], lots[0]]), /plusieurs fois/);
    await assert.rejects(
      batch(g, [lots[0], { ...lots[1], amount: 999 }]),
      /Quantité/,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int n FROM items WHERE cellar_id=$1",
          [f],
        )
      ).rows[0].n,
      2,
    );
    assert.equal(
      (
        await db.query<{ qte: string }>("SELECT qte FROM items WHERE id=$1", [
          a.id,
        ])
      ).rows[0].qte,
      "2",
    );
    await assert.rejects(
      batch(g, [lots[0], { ...lots[1], version: 999 }]),
      /changé/,
    );
    const op = randomUUID();
    await batch(g, lots, op);
    await batch(g, lots, op);
    await assert.rejects(
      batch(g, [{ ...lots[0], amount: 1 }, lots[1]], op),
      /Identifiant/,
    );
    const rows = (
      await db.query<Item>("SELECT * FROM items ORDER BY produit,cellar_id")
    ).rows;
    assert.equal(rows.length, 3);
    assert.equal(
      rows
        .filter((r) => r.produit === "A")
        .reduce((sum, r) => sum + Number(r.qte), 0),
      2,
    );
    assert.equal(
      rows.find((r) => r.produit === "A" && r.cellar_id === g)?.date_kind,
      "estimated",
    );
    assert.equal(
      rows.find((r) => r.produit === "A" && r.cellar_id === g)?.notes,
      "conserver",
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int n FROM stock_movements WHERE operation_id=$1",
          [op],
        )
      ).rows[0].n,
      3,
    );
    await action("undo", null, { operation_id: op });
    assert.equal(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int n FROM items WHERE cellar_id=$1",
          [f],
        )
      ).rows[0].n,
      2,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int n FROM items WHERE cellar_id=$1",
          [g],
        )
      ).rows[0].n,
      0,
    );
    await assert.rejects(
      db.query("SELECT cellio_equipment_action($1,$2,'delete')", [u, f]),
      /Transférez/,
    );
    await db.query(
      "INSERT INTO storage_defaults(user_id,ingredient_id,cellar_id) VALUES($1,$2,$3)",
      [u, randomUUID(), g],
    );
    await assert.rejects(
      db.query("SELECT cellio_equipment_action($1,$2,'delete')", [u, g]),
      /règles de rangement/,
    );
    await db.query("DELETE FROM storage_defaults WHERE cellar_id=$1", [g]);
    await assert.rejects(
      db.query("SELECT cellio_equipment_action($1,$2,'delete')", [u, h]),
      /introuvable/,
    );
    await db.query("SELECT cellio_equipment_action($1,$2,'delete')", [u, g]);
    assert.equal(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int n FROM cellars WHERE id=$1",
          [g],
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
test("V1.1: category defaults handle leap days and age reminders trigger at the configured day", () => {
  const fridge = { id: f, is_secondary: true } as Equipment;
  const rule = {
    categorie: "Légumes",
    fridge_days: 7,
    freezer_days: 90,
    fridge_default_days: 3,
    freezer_default_days: null,
  };
  assert.equal(
    defaultExpiry("Légumes", fridge, [rule], "2028-02-28"),
    "2028-03-02",
  );
  assert.equal(defaultExpiry("Autre", fridge, [rule], "2028-02-28"), null);
  assert.equal(
    defaultExpiry(
      "Légumes",
      { ...fridge, is_secondary: false },
      [rule],
      "2028-02-28",
    ),
    null,
  );
  const item = {
    qte: 1,
    categorie: "Légumes",
    cellar_id: f,
    date_entree: "2026-10-01",
    date_peremption: null,
  } as Item;
  const settings = { ntfy_topic: null, dlc_warning_days: 3 };
  assert.equal(alertFor(item, [fridge], [rule], settings, "2026-10-07"), null);
  assert.equal(
    alertFor(item, [fridge], [rule], settings, "2026-10-08")?.level,
    "age",
  );
  assert.match(
    alertFor(
      { ...item, date_peremption: "2026-10-08", date_kind: "estimated" },
      [fridge],
      [rule],
      settings,
      "2026-10-08",
    )!.label,
    /indicative/,
  );
});
