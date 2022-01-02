const { Schema, model, connection, connect, disconnect } = require('mongoose')

const encrypt = require(process.argv[2] === 'with-detection'
    ? 'mongoose-encryption-conflict-detection'
    : 'mongoose-encryption')

const uri = 'mongodb://localhost:27017/tests'
const encryptionKey = 'CwBDwGUwoM5YzBmzwWPSI+KjBKvWHaablbrEiDYh43Q='
const signingKey =
    'dLBm74RU4NW3e2i3QSifZDNXIXBd54yr7mZp0LKugVUa1X1UP9qoxoa3xfA7Ea4kdVL+JsPg9boGfREbPCb+kw=='


/** @type {import('mongoose-encryption-conflict-detection/lib/plugins/mongoose-encryption').DecryptionConflictHandler} */
const handleDecryptionConflict = ({ doc, encryptedFields, unExposedData, unSecretData }) => {
    if (process.argv[3] === 'resolve') {
        doc.secretB = unSecretData.secretB
        console.log('Conflict was resolved: ', {encryptedFields, unExposedData, unSecretData})
    } else {
        const error = new Error()
        error.getDiff = () => ({encryptedFields, unExposedData, unSecretData })
        throw error
    }
}

/**
 * Schema with two secret fields that will be encrypted.
 */
const NonIndexedSecretSchema = new Schema(
    {
        indexed: {
            type: Number,
            index: true,
        },
        secretA: String,
        secretB: String,
    },
    { collection: 'tests' }
)

NonIndexedSecretSchema.plugin(encrypt, {
    encryptionKey,
    signingKey,
    collectionId: 'tests',
})

const NonIndexedSecretModel = model('NonIndexedSecret', NonIndexedSecretSchema)

/**
 * Schema with additional index.
 */
const IndexedSecretSchema = new Schema(
    {
        indexed: {
            type: Number,
            index: true,
        },
        secretA: String,
        secretB: {
            type: String,
            // Because of this index,
            // the `secretB` field will be excluded from encryption.
            index: true,
        },
    },
    { collection: 'tests' }
)


IndexedSecretSchema.plugin(encrypt, {
    encryptionKey,
    signingKey,
    collectionId: 'tests',
    handleDecryptionConflict,
})

const IndexedSecretModel = model('IndexedSecret', IndexedSecretSchema)

const create_test_record = async () => {
    const test_record = new NonIndexedSecretModel({
        indexed: 13,
        secretA: 'Secret A',
        secretB: 'Secret B',
    })

    await test_record.save()
}

const save_using_indexed_secret_schema = async () => {
    console.log('Re-saving with new schema')
    const test_record = await IndexedSecretModel.findOne({})
    console.log(test_record)
    await test_record.save()
}

const query_using_original_schema = async () => {
    console.log('Record content obtained by original schema:')
    const test_record = await NonIndexedSecretModel.findOne({})
    console.log(test_record)
}

const query_using_indexed_schema = async () => {
    console.log('Record content obtained by new schema:')
    const test_record = await IndexedSecretModel.findOne({})
    console.log(test_record)
}

const connect_and_run = async () => {
    await connect(uri)
    await connection.db.collection('tests').deleteMany({})

    await create_test_record()
    console.log('')
    console.log('-------------')
    await query_using_original_schema()
    console.log('')
    console.log('-------------')
    await query_using_indexed_schema()
    console.log('')
    console.log('-------------')
    await save_using_indexed_secret_schema()
    console.log('')
    console.log('-------------')
    await query_using_indexed_schema()
    console.log('')
    console.log('-------------')
    await query_using_original_schema()


    await disconnect()
}

connect_and_run().catch((error) => {
    if (error.getDiff)
        console.log('Conflict detected:', error.getDiff())
    else
        throw error
})
