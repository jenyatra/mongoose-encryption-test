require('dotenv').config()
const { Schema, model, connection, connect, disconnect } = require('mongoose')

const encrypt = require(process.argv[2] === '_cf'
    ? 'mongoose-encryption-_cf'
    : 'mongoose-encryption')

const encryptionKey = 'CwBDwGUwoM5YzBmzwWPSI+KjBKvWHaablbrEiDYh43Q='
const signingKey =
    'dLBm74RU4NW3e2i3QSifZDNXIXBd54yr7mZp0LKugVUa1X1UP9qoxoa3xfA7Ea4kdVL+JsPg9boGfREbPCb+kw=='

const OldNestedSchema = new Schema({
    nestedA: String,
    nestedB: String,
    nestedC: String,
}) 

OldNestedSchema.plugin(encrypt, {
    encryptionKey,
    signingKey,
    collectionId: 'tests',
    fieldsList: 'store',
    encryptedFields: ['nestedA', 'nestedB'],
})

/**
 * Schema with two secret fields that will be encrypted.
 */
const OldSchema = new Schema(
    {
        secretA: String,
        secretB: String,
        nested: OldNestedSchema,
        nestedArr: [OldNestedSchema],
    },
    { collection: 'tests' }
)

OldSchema.plugin(encrypt, {
    encryptionKey,
    signingKey,
    collectionId: 'tests',
    fieldsList: 'store',
    excludeFromEncryption: ['nested', 'nestedArr'],
})

const OldModel = model('OldModel', OldSchema)


const NewNestedSchema = new Schema({
    nestedA: String,
    nestedB: String,
    nestedC: String,
}) 

NewNestedSchema.plugin(encrypt, {
    encryptionKey,
    signingKey,
    collectionId: 'tests',
    fieldsList: 'store',
    encryptedFields: ['nestedB', 'nestedC'],
})

/**
 * Schema with additional index.
 */
const NewSchema = new Schema(
    {
        secretA: String,
        secretB: String,
        nested: NewNestedSchema,
        nestedArr: [NewNestedSchema],
    },
    { collection: 'tests' }
)


NewSchema.plugin(encrypt, {
    encryptionKey,
    signingKey,
    collectionId: 'tests',
    fieldsList: 'require',
    excludeFromEncryption: ['nested', 'nestedArr'],
})

const NewModel = model('NewModel', NewSchema)

const create_test_record = async () => {
    const test_record = new OldModel({
        secretA: 'Secret A',
        secretB: 'See if this disappears',
        nested: {
            nestedA: 'nestedA',
            nestedB: 'nestedB',
            nestedC: 'nestedC',
        },
        nestedArr: [
            {
                nestedA: 'nestedA 1',
                nestedB: 'nestedB 1',
                nestedC: 'nestedC 1',
            },
            {
                nestedA: 'nestedA 2',
                nestedB: 'nestedB 2',
                nestedC: 'nestedC 2',
            }
        ],
    })

    await test_record.save()
}

const save_using_new_schema = async () => {
    console.log('Re-saving with new schema')
    const [test_record] = await NewModel.find({})
    console.log(test_record)
    await test_record.save()
}

const update_ctf_using_new_schema = async () => {
    console.log('Updating CT with new schema')
    const [test_record] = await NewModel.find({})
    console.log(test_record)
    test_record.updateCf()
    await test_record.save()
}

const query_using_old_schema = async () => {
    console.log('Record content obtained by original schema:')
    const test_record = await OldModel.findOne({})
    console.log(test_record)
}

const query_using_new_schema = async () => {
    console.log('Record content obtained by new schema:')
    const [test_record] = await NewModel.find({})
    console.log(test_record)
}

const connect_and_run = async () => {
    await connect(process.env.MONGO_URI)
    await connection.db.collection('tests').deleteMany({})

    await create_test_record()
    console.log('')
    console.log('-------------')
    await query_using_old_schema()
    console.log('')
    console.log('-------------')
    await query_using_new_schema()
    console.log('')
    console.log('-------------')
    await save_using_new_schema()
    console.log('')
    console.log('-------------')
    await query_using_new_schema()
    console.log('')
    console.log('-------------')
    await query_using_old_schema()

    if (process.argv[2] === '_cf') {
        console.log('')
        console.log('-------------')
        await update_ctf_using_new_schema()
        console.log('')
        console.log('-------------')
        await query_using_new_schema()
        console.log('')
        console.log('-------------')
        await query_using_old_schema()
    }


    await disconnect()
}

connect_and_run()
