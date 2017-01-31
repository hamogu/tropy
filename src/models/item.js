'use strict'

const metadata = require('./metadata')
const { DC } = require('../constants/properties')
const { all } = require('bluebird')
const { assign } = Object

module.exports = {

  async all(db, { trash, tags, list }) {
    const items = []

    switch (true) {
      case (list != null):
        await db.each(`
          SELECT id, added
            FROM list_items
              ${tags.length ? 'JOIN taggings USING (id)' : ''}
              LEFT OUTER JOIN items USING (id)
              LEFT OUTER JOIN trash USING (id)
              WHERE
                list_id = $list AND list_items.deleted IS NULL AND
                ${tags.length ? `tag_id IN (${tags.join(',')}) AND` : ''}
                trash.deleted ${trash ? 'NOT' : 'IS'} NULL
              ORDER BY added ASC, id ASC`, {

                $list: list

              }, ({ id }) => { items.push(id) })
        break

      default:
        await db.each(`
          WITH
            sort(id, value) AS (
              SELECT id, value
              FROM metadata JOIN metadata_values USING (value_id)
              WHERE property = $sort
            )
            SELECT id, sort.value
              FROM items
                ${tags.length ? 'JOIN taggings USING (id)' : ''}
                LEFT OUTER JOIN sort USING (id)
                LEFT OUTER JOIN trash USING (id)
              WHERE
                ${tags.length ? `tag_id IN (${tags.join(',')}) AND` : ''}
                deleted ${trash ? 'NOT' : 'IS'} NULL
              ORDER BY sort.value ASC, id ASC`, {

                $sort: DC.TITLE

              }, ({ id }) => { items.push(id) })
    }

    return items
  },

  async load(db, ids) {
    const items = ids.reduce((i, id) =>
      ((i[id] = { id, tags: [], photos: [] }), i), {})

    if (ids.length) {
      ids = ids.join(',')

      await all([
        db.each(`
          SELECT id, template, created, modified, deleted
            FROM subjects
              JOIN items USING (id)
              LEFT OUTER JOIN trash USING (id)
            WHERE id IN (${ids})`,

          ({ id, deleted, ...data }) => {
            assign(items[id], data, { deleted: !!deleted })
          }
        ),

        db.each(`
          SELECT id, tag_id AS tag
            FROM taggings WHERE id IN (${ids})
            ORDER BY id, tagged`,
          ({ id, tag }) => {
            items[id].tags.push(tag)
          }
        ),

        db.each(`
          SELECT id AS photo, item_id AS item
            FROM photos WHERE item IN (${ids})
            ORDER BY item, position`,
          ({ item, photo }) => {
            items[item].photos.push(photo)
          }
        )
      ])
    }

    return items
  },

  async create(db, data) {
    const { id } = await db.run(`
      INSERT INTO subjects DEFAULT VALUES`)
    await db.run(`
      INSERT INTO items (id) VALUES (?)`, id)

    if (data) {
      await metadata.update(db, { id, data })
    }

    const { [id]: item } = await module.exports.load(db, [id])
    return item

  },

  async update(db, { id, property, value }) {
    if (property !== 'template') return

    return db.run(`
      UPDATE subjects SET template = ? WHERE id = ?`, value, id)
  },


  async delete(db, ids) {
    return db.run(`
      INSERT INTO trash (id)
        VALUES ${ids.map(id => `(${id})`).join(',')}`
    )
  },

  async restore(db, ids) {
    return db.run(
      `DELETE FROM trash WHERE id IN (${ids.join(',')})`
    )
  },

  async destroy(db, ids) {
    return db.run(
      `DELETE FROM subjects WHERE id IN (${ids.join(',')})`
    )
  },

  async prune(db, since = '-1 month') {
    const condition = since ?
      ` WHERE deleted < datetime("now", "${since}"))` : ''

    return db.run(`
      DELETE FROM subjects
        WHERE id IN (
          SELECT id FROM trash JOIN items USING (id)${condition})`
    )
  },

  tags: {
    async add(db, values) {
      return db.run(`
        INSERT INTO taggings (tag_id, id) VALUES ${
          values.map(({ id, tag }) =>
            `(${Number(tag)}, ${Number(id)})`).join(',')
          }`)
    },

    async clear(db, id) {
      return db.run('DELETE FROM taggings WHERE id = ?', id)
    },

    async remove(db, { id, tags }) {
      return db.run(`
        DELETE FROM taggings
          WHERE id = ? AND tag_id IN (${tags.map(Number).join(',')})`, id)
    }
  }
}
