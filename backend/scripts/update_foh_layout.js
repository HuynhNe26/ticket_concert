import { pool } from '../src/config/database.js';

async function updateFoh() {
  try {
    const res = await pool.query('SELECT layout_id, event_id, layout_json FROM layout');
    console.log(`Checking ${res.rows.length} layouts...`);
    let updatedCount = 0;

    for (const row of res.rows) {
      const layoutJson = row.layout_json;
      if (!layoutJson || !layoutJson.zones) continue;

      let hasFoh = false;
      layoutJson.zones = layoutJson.zones.map(z => {
        if (z.id === 'FOH') {
          hasFoh = true;
          return {
            ...z,
            name: 'FOH (Kỹ thuật)',
            x: 520,
            y: 515,
            width: 160,
            height: 70
          };
        }
        if (z.id === 'CAT_1A') {
          return {
            ...z,
            x: 150,
            y: 510,
            width: 355,
            height: 80
          };
        }
        if (z.id === 'CAT_1B') {
          return {
            ...z,
            x: 695,
            y: 510,
            width: 355,
            height: 80
          };
        }
        return z;
      });

      if (hasFoh) {
        await pool.query('UPDATE layout SET layout_json = $1 WHERE layout_id = $2', [JSON.stringify(layoutJson), row.layout_id]);
        updatedCount++;
        console.log(`Updated layout_id: ${row.layout_id} (event_id: ${row.event_id})`);
      }
    }

    console.log(`Successfully updated ${updatedCount} layouts with enlarged FOH.`);
  } catch (err) {
    console.error('Error updating layouts:', err);
  } finally {
    process.exit(0);
  }
}

updateFoh();
