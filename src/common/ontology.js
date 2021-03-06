'use strict'

const { join, basename, extname } = require('path')
const { createReadStream: stream } = require('fs')
const { any, empty, get, titlecase } = require('./util')
const { Resource } = require('./res')
const N3 = require('n3')
const { RDF, RDFS, DC, DCT, SKOS, OWL, VANN } = require('../constants')


class Ontology extends Resource {
  static get base() {
    return join(super.base, 'vocab')
  }

  static get ext() {
    return '.n3'
  }

  static parse(is) {
    return new Promise((resolve, reject) => {
      const store = N3.Store()

      N3.Parser({ format: 'N3' })
        .parse(is, (error, triple, prefixes) => {
          if (error) return reject(error)
          if (triple) return store.addTriple(triple)
          store.addPrefixes(prefixes)
          resolve(store)
        })
    })
  }

  static async open(input, expand = true) {
    const [path, name] = expand ?
      [Ontology.expand(input), input] : [input, basename(input, extname(input))]

    return new Ontology(await Ontology.parse(stream(path)), name)
  }

  static CLASSES = [
    RDFS.Class,
    OWL.Class
  ]

  static PROPERTIES = [
    RDF.Property,
    OWL.ObjectProperty,
    OWL.DatatypeProperty,
    OWL.SymmetricProperty,
    OWL.FunctionalProperty,
    OWL.TransitiveProperty,
    OWL.InverseFunctionalProperty
  ]


  constructor(store, name) {
    super()
    this.store = store
    this.name = name
  }

  toJSON() {
    let json = {}

    let collect = (id) => {
      let data = this.getData(id)
      if (empty(data)) return []

      let ns = isDefinedBy(id, data)
      let vocab = json[ns] || this.getVocabulary(ns)

      if (vocab == null) return []
      json[ns] = vocab

      if (data[RDFS.label]) {
        for (let lbl of data[RDFS.label]) {
          if (lbl['@value'] == null) continue
          vocab.labels.push({
            id, label: lbl['@value'], language: lbl['@language']
          })
        }
      }

      return [vocab, data]
    }

    for (let id of this.getByType(...Ontology.PROPERTIES)) {
      let [vocab, data] = collect(id)
      if (vocab == null) continue

      let domain = get(data, [RDFS.domain, 0, '@id'])
      let range = get(data, [RDFS.range, 0, '@id'])

      vocab.properties.push({
        id, data, vocabulary: vocab.id, domain, range, ...info(data)
      })
    }

    for (let id of this.getByType(...Ontology.CLASSES)) {
      let [vocab, data] = collect(id)
      if (vocab == null) continue
      vocab.classes.push({
        id, data, vocabulary: vocab.id, ...info(data)
      })
    }

    return json
  }

  getVocabulary(id, title = this.name, prefix = this.name) {
    const data = this.getData(id)
    if (empty(data)) return null

    title = get(any(data, DC.title, DCT.title), [0, '@value'], title)
    prefix = get(data, [VANN.preferredNamespacePrefix, 0, '@value'], prefix)

    const seeAlso = get(data, [RDFS.seeAlso, 0, '@id'])

    const description = getValue(
      any(data, DC.description, DCT.description, RDFS.comment)
    )

    return {
      id,
      title,
      prefix,
      description,
      seeAlso,
      classes: [],
      labels: [],
      properties: []
    }
  }

  getByType(...types) {
    const ids = []

    this.store.forEachByIRI(({ subject, object }) => {
      if (!N3.Util.isBlank(subject) && types.includes(object)) ids.push(subject)
    }, null, RDF.type)

    return ids
  }

  getData(subject, into = {}) {
    return this.store.getTriplesByIRI(subject)
      .reduce((o, { predicate, object }) =>
        ((o[predicate] = [...(o[predicate] || []), literal(object)]), o), into)
  }

}


function info(data) {
  return {
    comment: getValue(data, RDFS.comment),
    definition: getValue(
      any(data, SKOS.defintion, DC.description, DCT.description)
    )
  }
}

function getValue(data, ...path) {
  return get(data, [...path, 0, '@value'])
}

function literal(value) {
  return N3.Util.isLiteral(value) ? {
    '@value': N3.Util.getLiteralValue(value),
    '@type': N3.Util.getLiteralType(value),
    '@language': N3.Util.getLiteralLanguage(value)
  } : {
    '@id': value,
    '@type': '@id'
  }
}

function isDefinedBy(id, data) {
  return get(data, [RDFS.isDefinedBy, '@id'], namespace(id))
}

function namespace(id) {
  return split(id)[0]
}

function getLabel(id) {
  return titlecase(split(id)[1])
}

function split(id) {
  let ns = id.split(/(#|\/)/)
  let nm = ns.pop()
  return [ns.join(''), nm]
}


module.exports = {
  getLabel,
  info,
  isDefinedBy,
  literal,
  namespace,
  Ontology
}
