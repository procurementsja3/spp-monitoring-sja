import fs from 'fs';
import path from 'path';
import { DATA_DIR, getDbPool, isUsingMySQL } from '../config/database.js';

const ITEMS_FILE = path.join(DATA_DIR, 'cloud_spp_items.json');

export function readSPPItemsFromDisk(): any[] {
  try {
    if (fs.existsSync(ITEMS_FILE)) {
      const content = fs.readFileSync(ITEMS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('[SPPController] Gagal membaca cloud_spp_items.json:', err);
  }
  return [];
}

export function saveSPPItemsToDisk(items: any[]): boolean {
  try {
    fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[SPPController] Gagal menulis cloud_spp_items.json:', err);
    return false;
  }
}

/**
 * Controller: Mengambil semua data SPP
 */
export async function getAllSPPItems(_req: any, res: any) {
  try {
    const pool = getDbPool();
    if (isUsingMySQL() && pool) {
      try {
        const [rows] = await pool.query('SELECT * FROM spp_items ORDER BY budget_received_date DESC, created_at DESC');
        // Petakan kolom snake_case MySQL ke camelCase frontend
        const mappedItems = (rows as any[]).map((r) => ({
          id: r.id,
          budgetReceivedDate: r.budget_received_date ? String(r.budget_received_date).slice(0, 10) : '',
          sppNumber: r.spp_number,
          pic: r.pic,
          area: r.area,
          poDate: r.po_date ? String(r.po_date).slice(0, 10) : undefined,
          poNumber: r.po_number || undefined,
          processDays: Number(r.process_days) || 0,
          statusPO: r.status_po,
          statusOntime: r.status_ontime,
          slaLimit: Number(r.sla_limit) || 10,
          isUrgentAdvance: Boolean(r.is_urgent_advance),
          urgentReason: r.urgent_reason || undefined,
          urgentApprovedBy: r.urgent_approved_by || undefined,
          budgetStatus: r.budget_status || 'APPROVED',
          specialCondition: r.special_condition || undefined,
          specialConditionReason: r.special_condition_reason || undefined,
          notes: r.notes || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));

        return res.json({
          success: true,
          items: mappedItems,
          count: mappedItems.length,
          engine: 'mysql',
          timestamp: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('[SPPController] MySQL query gagal, fallback ke disk:', dbErr);
      }
    }

    // Fallback disk JSON
    const items = readSPPItemsFromDisk();
    return res.json({
      success: true,
      items,
      count: items.length,
      engine: 'json_disk',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function getCanonicalItemKey(item: any): string {
  const spp = String(item?.sppNumber || '').trim().toLowerCase();
  const area = String(item?.area || '').trim().toUpperCase();
  if (spp && area) return `${area}::${spp}`;
  return String(item?.id || spp);
}

function hasFilledPO(item: any): boolean {
  return !!(item && item.poNumber && String(item.poNumber).trim() !== '');
}

function toTimestampMs(val: any): number {
  if (!val) return 0;
  const ms = Date.parse(String(val));
  return Number.isFinite(ms) ? ms : 0;
}

async function persistItemsToMySQL(items: any[]) {
  const pool = getDbPool();
  if (!isUsingMySQL() || !pool || items.length === 0) return;
  try {
    const sql = `
      INSERT INTO spp_items (
        id, budget_received_date, spp_number, pic, area,
        po_date, po_number, process_days, status_po, status_ontime,
        sla_limit, is_urgent_advance, urgent_reason, urgent_approved_by,
        budget_status, special_condition, special_condition_reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        budget_received_date = VALUES(budget_received_date),
        spp_number = VALUES(spp_number),
        pic = VALUES(pic),
        area = VALUES(area),
        po_date = VALUES(po_date),
        po_number = VALUES(po_number),
        process_days = VALUES(process_days),
        status_po = VALUES(status_po),
        status_ontime = VALUES(status_ontime),
        sla_limit = VALUES(sla_limit),
        is_urgent_advance = VALUES(is_urgent_advance),
        urgent_reason = VALUES(urgent_reason),
        urgent_approved_by = VALUES(urgent_approved_by),
        budget_status = VALUES(budget_status),
        special_condition = VALUES(special_condition),
        special_condition_reason = VALUES(special_condition_reason),
        notes = VALUES(notes),
        updated_at = NOW()
    `;

    for (const item of items) {
      await pool.execute(sql, [
        item.id || item.sppNumber,
        item.budgetReceivedDate || new Date().toISOString().slice(0, 10),
        item.sppNumber,
        item.pic || '-',
        item.area || 'SEPANJANG',
        item.poDate || null,
        item.poNumber || null,
        item.processDays || 0,
        hasFilledPO(item) ? 'CLOSE' : (item.statusPO || 'OPEN'),
        item.statusOntime || 'ONTIME',
        item.slaLimit || 10,
        item.isUrgentAdvance ? 1 : 0,
        item.urgentReason || null,
        item.urgentApprovedBy || null,
        item.budgetStatus || 'APPROVED',
        item.specialCondition || null,
        item.specialConditionReason || null,
        item.notes || null,
      ]);
    }
  } catch (dbErr) {
    console.warn('[SPPController] Gagal upsert batch ke MySQL:', dbErr);
  }
}

/**
 * Controller: Menyimpan daftar SPP secara batch
 */
export async function saveSPPItemsBatch(req: any, res: any) {
  try {
    const { items, source } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Data items harus berupa Array' });
    }

    let itemsToPersist = items;
    if (source === 'AUTO_PULL') {
      const existingDisk = readSPPItemsFromDisk();
      const existingByKey = new Map<string, any>();
      existingDisk.forEach((cur) => {
        existingByKey.set(getCanonicalItemKey(cur), cur);
        if (cur?.id) existingByKey.set(String(cur.id), cur);
      });

      itemsToPersist = items.map((incoming: any) => {
        const cur = existingByKey.get(getCanonicalItemKey(incoming)) || (incoming?.id ? existingByKey.get(String(incoming.id)) : undefined);
        if (!cur) return incoming;

        // Lindungi perubahan yang belum tersinkron ke Google Sheet atau item CLOSE yg lebih baru dari timpaan AUTO_PULL
        if (cur.pendingSheetSync === true) {
          return cur;
        }
        const curClosed = hasFilledPO(cur) || cur.statusPO === 'CLOSE';
        const incClosed = hasFilledPO(incoming) || incoming.statusPO === 'CLOSE';
        if (curClosed && !incClosed) {
          const curMs = toTimestampMs(cur.updatedAt);
          const incMs = toTimestampMs(incoming.updatedAt);
          if (curMs >= incMs || incMs === 0) {
            return cur;
          }
        }
        return incoming;
      });
    }

    // Simpan ke disk selalu untuk jaminan backup
    saveSPPItemsToDisk(itemsToPersist);

    // Simpan ke MySQL jika aktif
    await persistItemsToMySQL(itemsToPersist);

    return res.json({
      success: true,
      count: itemsToPersist.length,
      items: itemsToPersist,
      message: `${itemsToPersist.length} item SPP berhasil disinkronkan ke server`,
      engine: isUsingMySQL() ? 'mysql + disk' : 'disk',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Controller: Upsert atomik 1 atau beberapa item SPP tanpa menimpa perubahan paralel tab lain
 */
export async function upsertSPPItems(req: any, res: any) {
  try {
    const rawItems = Array.isArray(req.body?.items)
      ? req.body.items
      : req.body?.item
      ? [req.body.item]
      : [];

    if (rawItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Data items/item untuk upsert kosong' });
    }

    const current = readSPPItemsFromDisk();
    const merged = [...current];

    rawItems.forEach((incoming: any) => {
      const incomingCanon = getCanonicalItemKey(incoming);
      const idx = merged.findIndex(
        (cur: any) =>
          (incoming.id && cur.id === incoming.id) ||
          getCanonicalItemKey(cur) === incomingCanon
      );
      if (idx !== -1) {
        merged[idx] = {
          ...merged[idx],
          ...incoming,
        };
      } else {
        merged.unshift(incoming);
      }
    });

    saveSPPItemsToDisk(merged);
    await persistItemsToMySQL(rawItems);

    return res.json({
      success: true,
      count: rawItems.length,
      total: merged.length,
      message: `${rawItems.length} item SPP berhasil diperbarui secara atomik`,
      engine: isUsingMySQL() ? 'mysql + disk' : 'disk',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Controller: Hapus SPP berdasarkan ID
 */
export async function deleteSPPItem(req: any, res: any) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID tidak diberikan' });

    // Hapus dari disk
    const current = readSPPItemsFromDisk();
    const filtered = current.filter((i) => i.id !== id && i.sppNumber !== id);
    saveSPPItemsToDisk(filtered);

    // Hapus dari MySQL
    const pool = getDbPool();
    if (isUsingMySQL() && pool) {
      try {
        await pool.execute('DELETE FROM spp_items WHERE id = ? OR spp_number = ?', [id, id]);
      } catch (dbErr) {
        console.warn('[SPPController] Gagal hapus dari MySQL:', dbErr);
      }
    }

    return res.json({ success: true, message: `Data ${id} berhasil dihapus` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
