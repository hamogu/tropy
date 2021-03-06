'use strict'

const { createSelector: memo } = require('reselect')
const { into, compose, map, filter } = require('transducers.js')
const { entries, values } = Object
const { DC } = require('../constants')

const CORE = 'https://tropy.org/schema/v1/templates/item'
const PHOTO = 'https://tropy.org/schema/v1/templates/photo'

//const CORNELL = 'https://schema.tropy.org/v1/templates/cornell-obama'
//const PINKERTON = 'https://schema.tropy.org/v1/templates/pinkerton'
//const TYPOGRAPHY = 'https://schema.tropy.org/v1/templates/typography'
const SRM = 'https://schema.tropy.org/v1/templates/srm'

const TR = {
  BOX: 'https://tropy.org/schema/v1/core#box',
  FOLDER: 'https://tropy.org/schema/v1/core#folder',
  PIECE: 'https:/tropy.org/schema/v1/core#piece'
}

const T = {
  [CORE]: {
    id: CORE,
    name: 'Core Item',
    type: 'item',
    fields: [
      { property: DC.title },
      { property: DC.type },
      { property: DC.date },
      { property: DC.creator },
      { property: DC.description }
    ],
  },

  // [CORNELL]: {
  //   id: CORNELL,
  //   name: 'Cornell Obama',
  //   type: 'item',
  //   fields: [
  //     { property: DC.title },
  //     { property: DC.date, hint: 'Date of creation of object' },
  //     { property: DC.coverage, hint: 'Use controlled vocabulary from Getty' },
  //     { property: DC.description },
  //     {
  //       property: DC.publisher,
  //       constant: 'Division of Rare and Manuscript Collections, Cornell Library'
  //     },
  //     { property: DC.source },
  //     { property: DC.identifier },
  //     {
  //       property: DC.rights,
  //       constant: "The Cornell University Library has made a reasonable effort to identify all possible rights holders in this image, but in this case, the current rights holders remain unknown.  The Library has elected to place the item online as an exercise of fair use for non-commercial educational use. If would like to learn more about this item and to hear from individuals or institutions that have any additional information as to rights holders: contact rareref@cornell.edu. Responsibility for making an independent legal assessment of an item and securing any necessary permissions ultimately rests with persons desiring to use the item. This image has been selected and made available by a user using Artstor's software tools. Artstor has not screened or selected this image or cleared any rights to it and is acting as an online service provider pursuant to 17 U.S.C. §512. Artstor disclaims any liability associated with the use of this image. Should you have any legal objection to the use of this image, please visit http://www.artstor.org/copyright for contact information and instructions on how to proceed."
  //     }
  //   ],
  // },

  //[PINKERTON]: {
  //  id: PINKERTON,
  //  name: 'Pinkerton File',
  //  type: 'item',
  //  fields: [
  //    { property: DC.title },
  //    { property: DC.type },
  //    {
  //      property: DC.publisher,
  //      constant: 'Manuscript Division, Library of Congress'
  //    },
  //    {
  //      property: DC.source,
  //      constant: "Pinkerton's National Detective Agency records"
  //    },
  //    {
  //      property: DC.rights,
  //      constant: 'http://hdl.loc.gov/loc.mss/eadmss.ms003007'
  //    },
  //    { property: TR.BOX },
  //    { property: TR.FOLDER },
  //    { property: DC.date },
  //    { property: DC.creator },
  //    { property: S.RECIPIENT },
  //    { property: DC.description }
  //  ],
  //},

  [SRM]: {
    id: SRM,
    name: 'Société royale de médecine',
    type: 'item',
    fields: [
      { property: DC.title },
      { property: DC.type },
      { property: DC.creator },
      { property: DC.date },
      { property: DC.description },
      { property: TR.BOX },
      { property: TR.FOLDER },
      { property: TR.PIECE },
      {
        property: DC.source,
        constant: 'Archives de la Société royale de médecine'
      },
      {
        property: DC.publisher,
        constant: 'Académie nationale de médecine. Bibliothèque'
      },
      {
        property: DC.rights,
        constant: 'http://bibliotheque.academie-medecine.fr/static/SRM/'
      }
    ],
  },

  //[TYPOGRAPHY]: {
  //  id: TYPOGRAPHY,
  //  name: 'Typography',
  //  type: 'item',
  //  fields: [
  //    { property: DC.title },
  //    { property: DC.type },
  //    { property: DC.creator },
  //    { property: DC.contributor },
  //    { property: DC.description },
  //    { property: DC.format },
  //    { property: DC.source },
  //    { property: DC.date },
  //    { property: DC.coverage },
  //    { property: DC.rights },
  //    { property: DC.language },
  //    { property: DC.relation }
  //  ],
  //},

  [PHOTO]: {
    id: PHOTO,
    name: 'Tropy Photo',
    type: 'photo',
    fields: [
      { property: DC.title },
      { property: DC.date }
    ]
  }
}

const getAllTemplates = memo(
  () => T,
  ({ ontology }) => ontology.props,

  (templates, props) =>
    entries(templates)
      .reduce((tpl, [k, v]) => {
        tpl[k] = {
          ...v,
          fields: v.fields.map(field => ({
            ...field,
            property: props[field.property] || { id: field.property }
          }))
        }

        return tpl

      }, {}))


const getTemplatesByType = (type) => memo(
  getAllTemplates,
  (templates) => into(
    [],
    compose(
      map(kv => kv[1]),
      filter(t => t.type === type)),
    templates
  )
)

const getTemplates = memo(
  getAllTemplates, (templates) => values(templates)
)


module.exports = {
  getAllTemplates,
  getItemTemplates: getTemplatesByType('item'),
  getPhotoTemplates: getTemplatesByType('photo'),
  getTemplates
}
