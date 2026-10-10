import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { alertFor, defaultReminderDays } from "../app/lib/alerts";
import { Item } from "../app/lib/types";

test("Cellio: metadata survive editing, partial transfer, complete consumption and undo; distinct vintages, domains, formats and fabrication dates never merge", async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile("tests/baseline.sql", "utf8"));
    const u = randomUUID(),
      source = randomUUID(),
      target = randomUUID();
    await db.query(
      "INSERT INTO app_users(id,username,password) VALUES($1,'Test','test')",
      [u],
    );
    await db.query(
      "INSERT INTO cellars(id,user_id,name) VALUES($1,$3,'Source'),($2,$3,'Cible')",
      [source, target, u],
    );
    // A legacy wine present before the migration remains byte-for-byte unchanged except additive fields.
    const legacy = randomUUID();
    await db.query(
      "INSERT INTO items(id,user_id,cellar_id,produit,categorie,qte,unite,millesime,domaine,format,date_fabrication,date_peremption) VALUES($1,$2,$3,'Vin','Vins Rouges',2,'Bouteille (75cl)','2019','Domaine test','75cl','2020-01-01','2028-01-01')",
      [legacy, u, source],
    );
    const before = (
      await db.query<Record<string, unknown>>(
        "SELECT * FROM items WHERE id=$1",
        [legacy],
      )
    ).rows[0];
    await db.exec(await readFile("migrations/001_cellio_v1_1.sql", "utf8"));
    await db.exec(await readFile("migrations/004_cellio_v1_2.sql", "utf8"));
    await db.exec(await readFile("migrations/001_cellio_v1_1.sql", "utf8"));
    await db.exec(await readFile("migrations/004_cellio_v1_2.sql", "utf8"));
    const after = (
      await db.query<Record<string, unknown>>(
        "SELECT * FROM items WHERE id=$1",
        [legacy],
      )
    ).rows[0];
    for (const key of Object.keys(before))
      assert.deepEqual(after[key], before[key]);
    const wine = {
      produit: "Jurançon",
      categorie: "Vins Blancs",
      qte: 4,
      unite: "Bouteille (75cl)",
      cellar_id: source,
      date_entree: "2026-10-01",
      date_peremption: "2028-01-01",
      notes: null,
      millesime: "2019",
      domaine: "Capdevielle",
      format: "75cl",
      date_fabrication: null,
    };
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
    const a = await action("add", null, wine);
    for (const variant of [
      { millesime: "2020" },
      { domaine: "Autre domaine" },
      { format: "Magnum" },
      { date_fabrication: "2026-09-01" },
    ]) {
      const b = await action("add", null, {
        ...wine,
        cellar_id: target,
        ...variant,
      });
      const op = randomUUID();
      await action("transfer", a.id, { amount: 1, cellar_id: target }, op);
      assert.equal(
        (await db.query("SELECT id FROM items WHERE id=$1", [b.id])).rows
          .length,
        1,
      );
      assert.equal(
        (
          await db.query<{ qte: string }>("SELECT qte FROM items WHERE id=$1", [
            b.id,
          ])
        ).rows[0].qte,
        "4",
      );
      const moved = (
        await db.query<Item>(
          "SELECT * FROM items WHERE cellar_id=$1 AND id<>$2",
          [target, b.id],
        )
      ).rows[0];
      assert.equal(moved.millesime, wine.millesime);
      assert.equal(moved.domaine, wine.domaine);
      assert.equal(moved.format, wine.format);
      await action("undo", null, { operation_id: op });
      await action("use", b.id, { amount: 4 });
    }
    const editOp = randomUUID();
    const fresh = (
      await db.query<Item>("SELECT * FROM items WHERE id=$1", [a.id])
    ).rows[0];
    await action(
      "edit",
      a.id,
      {
        ...wine,
        version: fresh.version,
        millesime: "2018",
        domaine: "Autre",
        format: "150cl",
        date_fabrication: "2026-01-03",
      },
      editOp,
    );
    await action("undo", null, { operation_id: editOp });
    const restored = (
      await db.query<Item>("SELECT * FROM items WHERE id=$1", [a.id])
    ).rows[0];
    assert.equal(restored.millesime, wine.millesime);
    assert.equal(restored.domaine, wine.domaine);
    assert.equal(restored.date_fabrication, null);
    assert.equal(restored.format, wine.format);
    const useOp = randomUUID();
    await action("use", a.id, { amount: 4 }, useOp);
    await action("undo", null, { operation_id: useOp });
    const recreated = (
      await db.query<Item>("SELECT * FROM items WHERE id=$1", [a.id])
    ).rows[0];
    assert.equal(recreated.millesime, wine.millesime);
    assert.equal(recreated.domaine, wine.domaine);
    assert.equal(recreated.format, wine.format);
    await db.exec("SET ROLE anon");
    await assert.rejects(
      db.query("SELECT cellio_transfer_batch($1,$2,$3,$4,$5::jsonb)", [
        u,
        randomUUID(),
        source,
        target,
        "[]",
      ]),
      /permission denied/,
    );
    await db.exec("RESET ROLE");
  } finally {
    await db.close();
  }
});
test("Cellio: wine apogee labels and legacy category reminders remain distinct from expiry", () => {
  assert.equal(defaultReminderDays("Vins Blancs"), 730);
  assert.equal(defaultReminderDays("Champagnes & Pétillants"), 365);
  assert.equal(defaultReminderDays("Compotes"), 180);
  assert.equal(defaultReminderDays("Épicerie"), 90);
  const wine = {
    qte: 2,
    categorie: "Vins Blancs",
    date_role: "apogee",
    date_peremption: "2026-10-20",
  } as Item;
  assert.equal(
    alertFor(
      wine,
      [],
      [],
      { ntfy_topic: null, dlc_warning_days: 30 },
      "2026-10-10",
    )?.label,
    "Apogée dans 10 j",
  );
  assert.equal(
    alertFor(
      wine,
      [],
      [],
      { ntfy_topic: null, dlc_warning_days: 3 },
      "2026-10-10",
    ),
    null,
  );
});
